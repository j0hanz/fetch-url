'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

import type {
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from '@/lib/api';
import { isAbortError } from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

export type ViewState = 'idle' | 'loading' | 'error' | 'result';

interface TransformRequestHandlers {
  onError: (error: TransformError) => void;
  onProgress: (event: StreamProgressEvent) => void;
  onResult: (result: TransformResult) => void;
}

interface TransformState {
  error: TransformError | null;
  isPending: boolean;
  result: TransformResult | null;
}

const noop = () => {};
const IDLE_STATE: TransformState = {
  error: null,
  isPending: false,
  result: null,
};
const PENDING_STATE: TransformState = {
  ...IDLE_STATE,
  isPending: true,
};

function createErrorState(error: TransformError): TransformState {
  return { ...IDLE_STATE, error };
}

function createResultState(result: TransformResult): TransformState {
  return { ...IDLE_STATE, result };
}

export function deriveViewState(
  isPending: boolean,
  error: TransformError | null,
  result: TransformResult | null
): ViewState {
  if (!isPending && result !== null) return 'result';
  if (!isPending && error !== null) return 'error';
  if (isPending) return 'loading';
  return 'idle';
}

function useTransformRequestState() {
  const [state, setState] = useState(IDLE_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  function updateTerminalState(nextState: TransformState): void {
    startTransition(() => {
      setState(nextState);
    });
  }

  function isActiveRequest(requestController: AbortController): boolean {
    return abortControllerRef.current === requestController;
  }

  function settleActiveRequest(
    requestController: AbortController,
    nextState: TransformState,
    onSettled: () => void = noop
  ): void {
    if (!isActiveRequest(requestController)) {
      return;
    }

    abortControllerRef.current = null;
    onSettled();
    updateTerminalState(nextState);
  }

  function beginRequest(): AbortController {
    abortControllerRef.current?.abort();
    const requestController = new AbortController();
    abortControllerRef.current = requestController;
    setState(PENDING_STATE);
    return requestController;
  }

  return {
    abortControllerRef,
    beginRequest,
    dismissError: () => {
      setState((currentState) =>
        currentState.error === null ? currentState : IDLE_STATE
      );
    },
    isActiveRequest,
    settleError: (
      requestController: AbortController,
      nextError: TransformError
    ) => {
      if (nextError.code === 'ABORTED') {
        settleActiveRequest(requestController, IDLE_STATE);
        return;
      }

      settleActiveRequest(requestController, createErrorState(nextError));
    },
    settleResult: (
      requestController: AbortController,
      nextResult: TransformResult,
      onSettled: () => void
    ) => {
      settleActiveRequest(
        requestController,
        createResultState(nextResult),
        onSettled
      );
    },
    state,
  };
}

export function useTransform() {
  const {
    abortControllerRef,
    beginRequest,
    dismissError,
    isActiveRequest,
    settleError,
    settleResult,
    state,
  } = useTransformRequestState();
  const formRef = useRef<HTMLFormElement>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [abortControllerRef]);

  function createRequestHandlers(
    requestController: AbortController
  ): TransformRequestHandlers {
    return {
      onProgress: noop,
      onResult(result) {
        settleResult(requestController, result, () => {
          formRef.current?.reset();
        });
      },
      onError(nextError) {
        settleError(requestController, nextError);
      },
    };
  }

  function submitUrl(url: string): void {
    lastUrlRef.current = url;

    const requestController = beginRequest();
    const handlers = createRequestHandlers(requestController);

    void submitTransformRequest(url, handlers, requestController.signal).catch(
      (err: unknown) => {
        if (isAbortError(err) || !isActiveRequest(requestController)) {
          return;
        }

        settleError(requestController, mapClientTransformError(err));
      }
    );
  }

  function handleAction(formData: FormData): void {
    const url = formData.get('url');
    if (typeof url !== 'string' || url === '') {
      return;
    }

    submitUrl(url);
  }

  function retry(): void {
    if (lastUrlRef.current) {
      submitUrl(lastUrlRef.current);
    }
  }

  return {
    dismissError,
    error: state.error,
    formRef,
    handleAction,
    isPending: state.isPending,
    result: state.result,
    retry,
  };
}
