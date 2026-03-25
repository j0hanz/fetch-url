'use client';

import { useState } from 'react';

export type CopyStatus = 'idle' | 'copied' | 'failed';

export function useFeedback() {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  function clearCopyFeedback() {
    setCopyStatus('idle');
  }

  return {
    clearCopyFeedback,
    copyFeedbackOpen: copyStatus !== 'idle',
    copyStatus,
    handleCopy,
  };
}
