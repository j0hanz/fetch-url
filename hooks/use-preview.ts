'use client';

import { startTransition, useEffect, useState } from 'react';

import { useTheme } from '@mui/material/styles';

export function usePreview(markdown: string) {
  const theme = useTheme();
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const isPending = previewMarkdown !== markdown;
  const previewTransitionDuration = theme.transitions.duration.shortest;
  const previewRevealDelay = theme.transitions.duration.shorter;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setPreviewMarkdown(markdown);
      });
    }, previewRevealDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [markdown, previewRevealDelay]);

  return { isPending, previewMarkdown, previewTransitionDuration };
}
