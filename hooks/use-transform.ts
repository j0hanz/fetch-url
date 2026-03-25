'use client';

import { useEffect, useRef, useState } from 'react';

import type { TransformFormHandle } from '@/components/features/form';
import type { TransformError, TransformResult } from '@/lib/api';
import { isAbortError } from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

export type ViewState = 'idle' | 'loading' | 'error' | 'result';

export function deriveViewState(
  loading: boolean,
  error: TransformError | null,
  result: TransformResult | null
): ViewState {
  if (!loading && result !== null) return 'result';
  if (!loading && error !== null) return 'error';
  if (loading) return 'loading';
  return 'idle';
}

export function useTransform() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<TransformFormHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      setLoading(false);
      formRef.current?.clear();
    });
  }

  function handleRequestError(
    requestController: AbortController,
    nextError: TransformError
  ) {
    completeRequest(requestController, () => {
      setError(nextError);
      setLoading(false);
    });
  }

  function handleAction(formData: FormData) {
    const url = formData.get('url');
    if (typeof url !== 'string' || url === '') {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setResult(null);

    const handlers = {
      onProgress() {},
      onResult(res: TransformResult) {
        handleRequestResult(abortController, res);
      },
      onError(err: TransformError) {
        handleRequestError(abortController, err);
      },
    };

    void submitTransformRequest(url, handlers, abortController.signal).catch(
      (err) => {
        if (isAbortError(err) || !isActiveRequest(abortController)) {
          return;
        }

        handleRequestError(abortController, mapClientTransformError(err));
      }
    );
  }

  function dismissError() {
    setError(null);
  }

  return {
    dismissError,
    error,
    formRef,
    handleAction,
    loading,
    result,
  };
}
