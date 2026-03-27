'use client';

import { useDeferredValue } from 'react';

import { useTheme } from '@mui/material/styles';

export function usePreview(markdown: string) {
  const theme = useTheme();
  const previewMarkdown = useDeferredValue(markdown);
  const isPending = previewMarkdown !== markdown;
  const previewTransitionDuration = theme.transitions.duration.shortest;

  return { isPending, previewMarkdown, previewTransitionDuration };
}
