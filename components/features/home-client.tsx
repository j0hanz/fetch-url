'use client';

import type { ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import TransformForm from '@/components/features/form';
import TransformResultPanel from '@/components/features/result';
import { MarkdownSkeleton } from '@/components/ui/loading';
import PreviewPlaceholder from '@/components/ui/preview-placeholder';

import { deriveViewState, useTransform } from '@/hooks/use-transform';
import type { ViewState } from '@/hooks/use-transform';

import { sx } from '@/lib/theme';

const LOADING_PANEL_SX = { ...sx.markdownPanel, ...sx.transitionCell } as const;

function ViewStateSection({
  children,
  state,
  visibleState,
}: {
  children: ReactNode;
  state: ViewState;
  visibleState: ViewState;
}) {
  return (
    <Fade in={state === visibleState} mountOnEnter unmountOnExit>
      <Box sx={sx.transitionCell}>{children}</Box>
    </Fade>
  );
}

export default function HomeClient() {
  const {
    dismissError,
    error,
    formRef,
    handleAction,
    isPending,
    progress,
    result,
    retry,
  } = useTransform();

  const viewState = deriveViewState(isPending, error, result);
  const progressMessage = progress?.message;

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm
        ref={formRef}
        action={handleAction}
        isPending={isPending}
      />

      <Box aria-live="polite" sx={sx.transitionGrid}>
        <ViewStateSection state={viewState} visibleState="idle">
          <PreviewPlaceholder />
        </ViewStateSection>

        <Fade in={viewState === 'loading'} mountOnEnter unmountOnExit>
          <Paper sx={LOADING_PANEL_SX}>
            {progressMessage && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block' }}
              >
                {progressMessage}...
              </Typography>
            )}
            <MarkdownSkeleton />
          </Paper>
        </Fade>

        <ViewStateSection state={viewState} visibleState="error">
          {error && (
            <Alert severity="error" onClose={dismissError}>
              <AlertTitle>{error.message}</AlertTitle>
              Code: {error.code}
              {error.retryable && (
                <>
                  {' · Retryable '}
                  <Button
                    color="inherit"
                    size="small"
                    onClick={retry}
                    sx={{ ml: 1, textDecoration: 'underline' }}
                  >
                    Retry
                  </Button>
                </>
              )}
            </Alert>
          )}
        </ViewStateSection>

        <ViewStateSection state={viewState} visibleState="result">
          {result && <TransformResultPanel result={result} />}
        </ViewStateSection>
      </Box>
    </Box>
  );
}
