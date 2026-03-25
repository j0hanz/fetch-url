'use client';

import { ErrorState, type ResettableErrorProps } from '@/components/ui/error';

export default function Error({ error, reset }: ResettableErrorProps) {
  return (
    <ErrorState
      error={error}
      fallbackMessage="An unexpected error occurred."
      minHeight="50vh"
      reset={reset}
    />
  );
}
