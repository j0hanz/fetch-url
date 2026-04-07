'use client';

import type { ReactNode } from 'react';

import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';

import TransformForm from '@/components/features/form';
import { CenterMessage } from '@/components/ui/error';
import { MarkdownSkeleton } from '@/components/ui/loading';
import PreviewPlaceholder from '@/components/ui/preview-placeholder';

import { useTransform } from '@/hooks/use-transform';

import { sx } from '@/lib/theme';

const TransformResultPanel = dynamic(
  () => import('@/components/features/result'),
  { loading: () => <MarkdownSkeleton /> }
);

const LOADING_PANEL_SX = {
  ...sx.markdownPanel,
  ...sx.transitionCell,
  overflow: 'hidden',
} as const;

function ViewStateSection({
  children,
  visible,
}: {
  children: ReactNode;
  visible: boolean;
}) {
  return (
    <Fade in={visible} mountOnEnter unmountOnExit>
      <Box sx={sx.transitionCell}>{children}</Box>
    </Fade>
  );
}

export default function HomeClient() {
  const { error, formRef, handleAction, isPending, result, viewState } =
    useTransform();

  return (
    <Box sx={sx.flexColumn}>
      <TransformForm
        ref={formRef}
        action={handleAction}
        isPending={isPending}
      />

      <Box
        aria-live="polite"
        aria-busy={viewState === 'loading'}
        sx={sx.transitionGrid}
      >
        <ViewStateSection visible={viewState === 'idle'}>
          <PreviewPlaceholder />
        </ViewStateSection>

        <ViewStateSection visible={viewState === 'loading'}>
          <Paper sx={LOADING_PANEL_SX}>
            <MarkdownSkeleton />
          </Paper>
        </ViewStateSection>

        <ViewStateSection visible={viewState === 'error'}>
          {error && (
            <CenterMessage
              code={error.code}
              message={error.message}
              statusCode={error.statusCode}
            />
          )}
        </ViewStateSection>

        <ViewStateSection visible={viewState === 'result'}>
          {result && <TransformResultPanel result={result} />}
        </ViewStateSection>
      </Box>
    </Box>
  );
}
