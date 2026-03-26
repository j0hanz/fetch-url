'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import type { TransformFormHandle } from '@/components/features/form';
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

export function useTransform() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);
  const [isPending, startTransition] = useTransition();

  const formRef = useRef<TransformFormHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  function isActiveRequest(requestController: AbortController): boolean {
    return abortControllerRef.current === requestController;
  }

  function completeRequest(
    requestController: AbortController,
    onComplete: () => void
  ) {
    if (!isActiveRequest(requestController)) {
      return;
    }

    abortControllerRef.current = null;
    onComplete();
  }

  function handleRequestResult(
    requestController: AbortController,
    nextResult: TransformResult
  ) {
    completeRequest(requestController, () => {
      setResult(nextResult);
      formRef.current?.clear();
    });
  }

  function handleRequestError(
    requestController: AbortController,
    nextError: TransformError
  ) {
    completeRequest(requestController, () => {
      setError(nextError);
    });
  }

  function submitUrl(url: string) {
    lastUrlRef.current = url;

    startTransition(async () => {
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setError(null);
      setResult(null);
      setProgress(null);

      const handlers = {
        onProgress(event: StreamProgressEvent) {
          if (isActiveRequest(abortController)) setProgress(event);
        },
        onResult(res: TransformResult) {
          handleRequestResult(abortController, res);
        },
        onError(err: TransformError) {
          handleRequestError(abortController, err);
        },
      };

      try {
        await submitTransformRequest(url, handlers, abortController.signal);
      } catch (err) {
        if (isAbortError(err) || !isActiveRequest(abortController)) {
          return;
        }

        handleRequestError(abortController, mapClientTransformError(err));
      }
    });
  }

  function handleAction(formData: FormData) {
    const url = formData.get('url');
    if (typeof url !== 'string' || url === '') {
      return;
    }

    submitUrl(url);
  }

  function retry() {
    if (lastUrlRef.current) {
      submitUrl(lastUrlRef.current);
    }
  }

  function dismissError() {
    setError(null);
  }

  return {
    dismissError,
    error,
    formRef,
    handleAction,
    isPending,
    progress,
    result,
    retry,
  };
}
