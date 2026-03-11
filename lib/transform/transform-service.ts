import type { TransformRequest } from "@/lib/validation/transform-request";
import type {
  TransformResponse,
  TransformError,
} from "@/lib/errors/transform-errors";
import { callFetchUrl } from "@/lib/mcp/mcp-client";
import { parseMcpResult } from "@/lib/mcp/runtime";

const RETRYABLE_CODES = new Set(["FETCH_ERROR", "QUEUE_FULL"]);

function isRetryableError(error: TransformError): boolean {
  if (RETRYABLE_CODES.has(error.code)) return true;
  if (
    error.code === "HTTP_ERROR" &&
    error.statusCode !== undefined &&
    error.statusCode >= 500
  )
    return true;
  return false;
}

export async function transformUrl(
  request: TransformRequest,
): Promise<TransformResponse> {
  const attempt = async (): Promise<TransformResponse> => {
    try {
      const raw = await callFetchUrl({
        url: request.url,
        skipNoiseRemoval: request.skipNoiseRemoval,
        forceRefresh: request.forceRefresh,
        maxInlineChars: request.maxInlineChars,
      });
      return parseMcpResult(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        ok: false,
        error: { code: "INTERNAL_ERROR", message, retryable: false },
      };
    }
  };

  const first = await attempt();

  // Retry once for retryable errors
  if (!first.ok && isRetryableError(first.error)) {
    return attempt();
  }

  return first;
}
