"use client";

import { useState } from "react";
import type {
  TransformResult,
  TransformError,
  TransformResponse,
} from "@/lib/errors/transform";
import {
  createNetworkError,
  createUnexpectedResponseError,
  hasTransformError,
  hasTransformResult,
} from "@/lib/errors/transform";

interface TransformFormProps {
  onResult: (result: TransformResult) => void;
  onError: (error: TransformError) => void;
  onLoading: (loading: boolean) => void;
}

interface TransformRequestBody {
  url: string;
}

export default function TransformForm({
  onResult,
  onError,
  onLoading,
}: TransformFormProps) {
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function buildRequestBody(): TransformRequestBody {
    return { url: url.trim() };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    onLoading(true);

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody()),
      });

      const data = (await res.json()) as TransformResponse;

      if (hasTransformResult(data)) {
        onResult(data.result);
      } else if (hasTransformError(data)) {
        onError(data.error);
      } else {
        onError(createUnexpectedResponseError());
      }
    } catch {
      onError(createNetworkError());
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
