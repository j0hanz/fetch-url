'use client';

import { useEffect, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';

import TransformForm, { type TransformFormHandle } from '@/components/form';
import { TransformProgress } from '@/components/loading';
import TransformResultPanel from '@/components/result';
import type {
  StreamProgressEvent,
  TransformError,
  TransformResult,
} from '@/lib/api';
import {
  isAbortError,
  isTerminalStreamProgressEvent,
  normalizeStreamProgressEvent,
} from '@/lib/api';
import {
  mapClientTransformError,
  submitTransformRequest,
} from '@/lib/client-transform';

function useHomeClientModel() {
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<TransformError | null>(null);
  const [progress, setProgress] = useState<StreamProgressEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<TransformFormHandle>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleAction(formData: FormData) {
    const url = formData.get('url') as string;
    if (!url) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(null);

    const handlers = {
      onProgress(event: StreamProgressEvent) {
        if (abortControllerRef.current !== abortController) {
          return;
        }

        setProgress((prev) => {
          if (prev && isTerminalStreamProgressEvent(prev)) {
            return prev;
          }
          return normalizeStreamProgressEvent(event, prev);
        });
      },
      onResult(res: TransformResult) {
        if (abortControllerRef.current !== abortController) {
          return;
        }

        setResult(res);
        setProgress(null);
        setLoading(false);
        formRef.current?.clear();
      },
      onError(err: TransformError) {
        if (abortControllerRef.current !== abortController) {
          return;
        }

        setError(err);
        setProgress(null);
        setLoading(false);
      },
    };

    void submitTransformRequest(url, handlers, abortController.signal).catch(
      (err) => {
        if (
          abortControllerRef.current !== abortController ||
          isAbortError(err)
        ) {
          return;
        }

        setError(mapClientTransformError(err));
        setLoading(false);
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
    progress,
    result,
  };
}

export default function HomeClient() {
  const {
    dismissError,
    error,
    formRef,
    handleAction,
    loading,
    progress,
    result,
  } = useHomeClientModel();

  const showProgress = loading && progress !== null;
  const showError = !loading && error !== null;
  const showResult = !loading && result !== null;

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TransformForm ref={formRef} loading={loading} action={handleAction} />

      <Box
        aria-live="polite"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Collapse in={showProgress} unmountOnExit>
          {progress && (
            <TransformProgress
              progress={progress.progress}
              total={progress.total}
              message={progress.message}
            />
          )}
        </Collapse>

        <Collapse in={showError} unmountOnExit>
          {error && (
            <Alert severity="error" onClose={dismissError}>
              <AlertTitle>{error.message}</AlertTitle>
              Code: {error.code}
              {error.retryable && ' · Retryable'}
            </Alert>
          )}
        </Collapse>

        <Collapse in={showResult} unmountOnExit>
          {result && <TransformResultPanel result={result} />}
        </Collapse>
      </Box>
    </Box>
  );
}
