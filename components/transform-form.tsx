"use client";

import { useState } from "react";
import type {
  TransformResult,
  TransformError,
  TransformResponse,
} from "@/lib/errors/transform-errors";

interface TransformFormProps {
  onResult: (result: TransformResult) => void;
  onError: (error: TransformError) => void;
  onLoading: (loading: boolean) => void;
}

export default function TransformForm({
  onResult,
  onError,
  onLoading,
}: TransformFormProps) {
  const [url, setUrl] = useState("");
  const [skipNoiseRemoval, setSkipNoiseRemoval] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [maxInlineChars, setMaxInlineChars] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    onLoading(true);

    try {
      const body: Record<string, unknown> = { url: url.trim() };
      if (skipNoiseRemoval) body.skipNoiseRemoval = true;
      if (forceRefresh) body.forceRefresh = true;
      if (maxInlineChars !== "") {
        const parsed = parseInt(maxInlineChars, 10);
        if (!isNaN(parsed)) body.maxInlineChars = parsed;
      }

      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as TransformResponse;

      if (data.ok && data.result) {
        onResult(data.result);
      } else if (!data.ok) {
        onError(data.error);
      } else {
        onError({
          code: "INTERNAL_ERROR",
          message: "Unexpected response format.",
          retryable: false,
        });
      }
    } catch {
      onError({
        code: "INTERNAL_ERROR",
        message: "Network error. Please try again.",
        retryable: true,
      });
    } finally {
      setSubmitting(false);
      onLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div>
        <label
          htmlFor="url"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          URL
        </label>
        <input
          id="url"
          type="url"
          required
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={submitting}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={skipNoiseRemoval}
            onChange={(e) => setSkipNoiseRemoval(e.target.checked)}
            disabled={submitting}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          Skip noise removal
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={forceRefresh}
            onChange={(e) => setForceRefresh(e.target.checked)}
            disabled={submitting}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          Force refresh
        </label>
      </div>

      <div>
        <label
          htmlFor="maxInlineChars"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Max inline chars{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          id="maxInlineChars"
          type="number"
          min="0"
          step="1"
          placeholder="e.g., 50000"
          value={maxInlineChars}
          onChange={(e) => setMaxInlineChars(e.target.value)}
          disabled={submitting}
          className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:w-auto"
      >
        {submitting ? "Converting…" : "Convert"}
      </button>
    </form>
  );
}
