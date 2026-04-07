'use client';

import { startTransition, useEffect, useReducer, useRef } from 'react';

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
  result: TransformResult | null;
  viewState: ViewState;
}

type TransformStateAction =
  | { type: 'start' }
  | { type: 'result'; result: TransformResult }
  | { type: 'error'; error: TransformError }
  | { type: 'dismissError' };

const NOOP = () => {};
const IDLE_STATE: TransformState = {
  error: null,
  result: null,
  viewState: 'idle',
};
const PENDING_STATE: TransformState = {
  ...IDLE_STATE,
  viewState: 'loading',
};

function createErrorState(error: TransformError): TransformState {
  return { ...IDLE_STATE, error, viewState: 'error' };
}

function createResultState(result: TransformResult): TransformState {
  return { ...IDLE_STATE, result, viewState: 'result' };
}

function transformStateReducer(
  state: TransformState,
  action: TransformStateAction
): TransformState {
  switch (action.type) {
    case 'start':
      return PENDING_STATE;
    case 'result':
      return createResultState(action.result);
    case 'error':
      return action.error.code === 'ABORTED'
        ? IDLE_STATE
        : createErrorState(action.error);
    case 'dismissError':
      return state.viewState === 'error' ? IDLE_STATE : state;
    default:
      return state;
  }
}

function useTransformRequestState() {
  const [state, dispatch] = useReducer(transformStateReducer, IDLE_STATE);
  const activeRequestControllerRef = useRef<AbortController | null>(null);

  function dispatchTerminalState(action: TransformStateAction): void {
    startTransition(() => {
      dispatch(action);
    });
  }

  function isActiveRequest(requestController: AbortController): boolean {
    return activeRequestControllerRef.current === requestController;
  }

  function settleActiveRequest(
    requestController: AbortController,
    action: TransformStateAction,
    onSettled: () => void = NOOP
  ): void {
    if (!isActiveRequest(requestController)) {
      return;
    }

    activeRequestControllerRef.current = null;
    onSettled();
    dispatchTerminalState(action);
  }

  function beginRequest(): AbortController {
    activeRequestControllerRef.current?.abort();
    const requestController = new AbortController();
    activeRequestControllerRef.current = requestController;
    dispatch({ type: 'start' });
    return requestController;
  }

  return {
    activeRequestControllerRef,
    beginRequest,
    dismissError: () => dispatch({ type: 'dismissError' }),
    isActiveRequest,
    settleError: (
      requestController: AbortController,
      nextError: TransformError
    ) => {
      settleActiveRequest(requestController, {
        type: 'error',
        error: nextError,
      });
    },
    settleResult: (
      requestController: AbortController,
      nextResult: TransformResult,
      onSettled: () => void
    ) => {
      settleActiveRequest(
        requestController,
        {
          type: 'result',
          result: nextResult,
        },
        onSettled
      );
    },
    state,
  };
}

export function useTransform() {
  const {
    activeRequestControllerRef,
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
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = null;
    };
  }, [activeRequestControllerRef]);

  function createRequestHandlers(
    requestController: AbortController
  ): TransformRequestHandlers {
    return {
      onProgress: NOOP,
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
    isPending: state.viewState === 'loading',
    result: state.result,
    retry,
    viewState: state.viewState,
  };
}
