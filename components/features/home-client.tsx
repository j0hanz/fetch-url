'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

import TransformForm from '@/components/features/form';
import TransformResultPanel from '@/components/features/result';
import { MarkdownSkeleton } from '@/components/ui/loading';
import PreviewPlaceholder from '@/components/ui/preview-placeholder';
import { deriveViewState, useTransform } from '@/hooks/use-transform';
import { sx } from '@/lib/theme';

export default function HomeClient() {
  const { dismissError, error, formRef, handleAction, loading, result } =
    useTransform();

  const viewState = deriveViewState(loading, error, result);

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm ref={formRef} loading={loading} action={handleAction} />

      <Box aria-live="polite" sx={sx.transitionGrid}>
        <Fade in={viewState === 'idle'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            <PreviewPlaceholder />
          </Box>
        </Fade>

        <Fade in={viewState === 'loading'} mountOnEnter unmountOnExit>
          <Paper sx={{ ...sx.markdownPanel, ...sx.transitionCell }}>
            <MarkdownSkeleton />
          </Paper>
        </Fade>

        <Fade in={viewState === 'error'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            {error && (
              <Alert severity="error" onClose={dismissError}>
                <AlertTitle>{error.message}</AlertTitle>
                Code: {error.code}
                {error.retryable && ' · Retryable'}
              </Alert>
            )}
          </Box>
        </Fade>

        <Fade in={viewState === 'result'} mountOnEnter unmountOnExit>
          <Box sx={sx.transitionCell}>
            {result && <TransformResultPanel result={result} />}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
