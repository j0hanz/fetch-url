"use client";

import { ErrorState } from "@/components/error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={error}
      fallbackMessage="An unexpected error occurred."
      minHeight="50vh"
      reset={reset}
    />
  );
}
