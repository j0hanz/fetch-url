"use client";

import { useState } from "react";
import type { TransformResult } from "@/lib/errors/transform-errors";

interface TransformResultProps {
  result: TransformResult;
  onRetry: (options: { forceRefresh: boolean }) => void;
}

export default function TransformResultPanel({
  result,
  onRetry,
}: TransformResultProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Truncation Warning */}
      {result.truncated && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Content was truncated. The full page may be too large to return in
            one response.
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Try again with <strong>Force refresh</strong> enabled — this
            bypasses the server cache and may return the complete content.
          </p>
          <button
            onClick={() => onRetry({ forceRefresh: true })}
            className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            Retry with fresh fetch
          </button>
        </div>
      )}

      {/* Summary Section */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Summary
        </h3>
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {result.title && (
              <>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Title
                </dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {result.title}
                </dd>
              </>
            )}
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Input URL
            </dt>
            <dd className="truncate text-zinc-900 dark:text-zinc-100">
              {result.url}
            </dd>
            {result.resolvedUrl && (
              <>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Resolved URL
                </dt>
                <dd className="truncate text-zinc-900 dark:text-zinc-100">
                  {result.resolvedUrl}
                </dd>
              </>
            )}
            {result.finalUrl && (
              <>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Final URL
                </dt>
                <dd className="truncate text-zinc-900 dark:text-zinc-100">
                  {result.finalUrl}
                </dd>
              </>
            )}
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Cache
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {result.fromCache ? "Cached" : "Fresh"}
            </dd>
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Fetched
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {new Date(result.fetchedAt).toLocaleString()}
            </dd>
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Size
            </dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {result.contentSize.toLocaleString()} chars
            </dd>
          </dl>
        </div>
      </section>

      {/* Metadata Section */}
      {hasMetadata(result.metadata) && (
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Metadata
          </h3>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {result.metadata.description && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Description
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {result.metadata.description}
                  </dd>
                </>
              )}
              {result.metadata.author && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Author
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {result.metadata.author}
                  </dd>
                </>
              )}
              {result.metadata.publishedDate && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Published
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {result.metadata.publishedDate}
                  </dd>
                </>
              )}
              {result.metadata.modifiedDate && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Modified
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {result.metadata.modifiedDate}
                  </dd>
                </>
              )}
              {result.metadata.image && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Image
                  </dt>
                  <dd className="truncate text-zinc-900 dark:text-zinc-100">
                    {result.metadata.image}
                  </dd>
                </>
              )}
              {result.metadata.favicon && (
                <>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    Favicon
                  </dt>
                  <dd className="truncate text-zinc-900 dark:text-zinc-100">
                    {result.metadata.favicon}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* Markdown Section */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Markdown
          </h3>
          <button
            onClick={handleCopy}
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
        </div>
        <pre className="max-h-[600px] overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {result.markdown}
        </pre>
      </section>
    </div>
  );
}

function hasMetadata(meta: TransformResult["metadata"]): boolean {
  return !!(
    meta.description ||
    meta.author ||
    meta.publishedDate ||
    meta.modifiedDate ||
    meta.image ||
    meta.favicon
  );
}
