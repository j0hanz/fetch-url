"use client";

import { useEffect, useId, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import type {
  TransformResult,
  TransformError,
  StreamEvent,
  StreamProgressEvent,
} from "@/lib/api";
import {
  NDJSON_CONTENT_TYPE,
  createNetworkError,
  createTimeoutError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
  isTransformError,
  isTransformErrorResponse,
} from "@/lib/api";
import type { TransformRequest } from "@/lib/validate";

interface TransformFormProps {
  loading: boolean;
  onResult: (result: TransformResult) => void;
  onError: (error: TransformError) => void;
  onLoading: (loading: boolean) => void;
  onProgress: (event: StreamProgressEvent) => void;
}

const TRANSFORM_ENDPOINT = "/api/transform";
const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const FETCH_TIMEOUT_MS = 60_000;
const URL_INPUT_SX = { flexGrow: 1, flex: { md: "2 1 0" } } as const;
const ACTION_BUTTON_SX = {
  maxWidth: { sm: 150 },
  flex: { md: "1 1 0" },
} as const;

type StreamHandlers = Pick<
  TransformFormProps,
  "onError" | "onProgress" | "onResult"
>;

function createRequestBody(url: string): TransformRequest {
  return { url: url.trim() };
}

function isNdjsonResponse(response: Response): boolean {
  return (response.headers.get("Content-Type") ?? "").includes(
    NDJSON_CONTENT_TYPE,
  );
}

function parseStreamEvent(line: string): StreamEvent {
  return JSON.parse(line) as StreamEvent;
}

function flushBufferedLines(
  chunk: string,
  onEvent: (event: StreamEvent) => void,
): string {
  const lines = chunk.split("\n");
  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      onEvent(parseStreamEvent(trimmed));
    }
  }

  return remainder;
}

async function readNdjsonStream(
  response: Response,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<TransformError | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    return createUnexpectedResponseError();
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let sawTerminalEvent = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer = flushBufferedLines(
        buffer + decoder.decode(value, { stream: true }),
        (event) => {
          if (event.type !== "progress") {
            sawTerminalEvent = true;
          }

          onEvent(event);
        },
      );
    }

    const trailingContent = buffer.trim();
    if (trailingContent.length > 0) {
      const event = parseStreamEvent(trailingContent);
      if (event.type !== "progress") {
        sawTerminalEvent = true;
      }

      onEvent(event);
    }
  } catch (error) {
    if (isTimeoutError(error)) {
      return createTimeoutError();
    }

    if (isAbortError(error)) {
      return null;
    }

    return createUnexpectedResponseError();
  } finally {
    reader.releaseLock();
  }

  if (sawTerminalEvent || !signal.aborted) {
    return sawTerminalEvent ? null : createUnexpectedResponseError();
  }

  return signal.reason instanceof DOMException &&
    signal.reason.name === "TimeoutError"
    ? createTimeoutError()
    : null;
}

function createRequestSignal(abortController: AbortController): AbortSignal {
  return AbortSignal.any([
    abortController.signal,
    AbortSignal.timeout(FETCH_TIMEOUT_MS),
  ]);
}

function handleStreamEvent(event: StreamEvent, handlers: StreamHandlers): void {
  if (event.type === "progress") {
    handlers.onProgress(event);
    return;
  }

  if (hasTransformResult(event)) {
    handlers.onResult(event.result);
    return;
  }

  if (hasTransformError(event)) {
    handlers.onError(event.error);
    return;
  }

  handlers.onError(createUnexpectedResponseError());
}

function handleJsonFallback(
  data: unknown,
  onError: TransformFormProps["onError"],
): void {
  if (isTransformErrorResponse(data)) {
    onError(data.error);
    return;
  }

  onError(createUnexpectedResponseError());
}

function handleRequestError(
  error: unknown,
  onError: TransformFormProps["onError"],
): void {
  if (isTimeoutError(error)) {
    onError(createTimeoutError());
    return;
  }

  if (isTransformError(error)) {
    onError(error);
    return;
  }

  onError(createNetworkError());
}

async function handleTransformResponse(
  response: Response,
  signal: AbortSignal,
  handlers: StreamHandlers,
): Promise<void> {
  if (isNdjsonResponse(response)) {
    const streamError = await readNdjsonStream(
      response,
      signal,
      (streamEvent) => handleStreamEvent(streamEvent, handlers),
    );

    if (streamError) {
      handlers.onError(streamError);
    }

    return;
  }

  handleJsonFallback(await response.json(), handlers.onError);
}

async function submitTransformRequest(
  url: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(TRANSFORM_ENDPOINT, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(createRequestBody(url)),
    signal,
  });

  await handleTransformResponse(response, signal, handlers);
}

export default function TransformForm({
  loading,
  onResult,
  onError,
  onLoading,
  onProgress,
}: TransformFormProps) {
  const urlInputId = useId();
  const [url, setUrl] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamHandlers: StreamHandlers = { onError, onProgress, onResult };

  function abortActiveRequest() {
    abortControllerRef.current?.abort();
  }

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  function handleCancel(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    abortActiveRequest();
  }

  function handleUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    abortActiveRequest();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      onLoading(true);
      await submitTransformRequest(
        url,
        streamHandlers,
        createRequestSignal(abortController),
      );
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      handleRequestError(error, onError);
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
        onLoading(false);
      }
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          id={urlInputId}
          label="Paste a public URL to convert"
          type="url"
          required
          fullWidth
          placeholder="https://example.com"
          value={url}
          onChange={handleUrlChange}
          disabled={loading}
          variant="outlined"
          size="small"
          sx={URL_INPUT_SX}
        />
        {loading ? (
          <Button
            type="button"
            variant="contained"
            fullWidth
            color="error"
            onClick={handleCancel}
            sx={ACTION_BUTTON_SX}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={ACTION_BUTTON_SX}
          >
            Convert
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}
