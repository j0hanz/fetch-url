import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransformResultPanel from "@/components/transform-result";
import type { TransformResult } from "@/lib/errors/transform-errors";

const baseResult: TransformResult = {
  url: "https://example.com",
  resolvedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  title: "Example Domain",
  metadata: {
    description: "An example page",
    author: "IANA",
  },
  markdown: "# Example\n\nThis is an example.",
  fromCache: false,
  fetchedAt: "2026-03-10T12:00:00.000Z",
  contentSize: 42,
  truncated: false,
};

describe("TransformResultPanel", () => {
  it("renders summary section with title, URLs, cache status, and size", () => {
    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);

    expect(screen.getByText("Example Domain")).toBeInTheDocument();
    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Fresh")).toBeInTheDocument();
    expect(screen.getByText("42 chars")).toBeInTheDocument();
  });

  it("renders metadata section", () => {
    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);

    expect(screen.getByText("An example page")).toBeInTheDocument();
    expect(screen.getByText("IANA")).toBeInTheDocument();
  });

  it("renders markdown content in a pre element", () => {
    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);

    const pre = document.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toContain("# Example");
    expect(pre?.textContent).toContain("This is an example.");
  });

  it("shows cached status when fromCache is true", () => {
    render(
      <TransformResultPanel
        result={{ ...baseResult, fromCache: true }}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText("Cached")).toBeInTheDocument();
  });

  it("shows truncation warning and retry button when truncated", () => {
    const onRetry = vi.fn();
    render(
      <TransformResultPanel
        result={{ ...baseResult, truncated: true }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText(/content was truncated/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", {
      name: /retry with fresh fetch/i,
    });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it("does not show truncation warning when not truncated", () => {
    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);
    expect(
      screen.queryByText(/content was truncated/i),
    ).not.toBeInTheDocument();
  });

  it("shows copy markdown button", () => {
    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);
    expect(screen.getByText("Copy Markdown")).toBeInTheDocument();
  });

  it("copies markdown to clipboard on button click", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TransformResultPanel result={baseResult} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByText("Copy Markdown"));

    expect(writeText).toHaveBeenCalledWith("# Example\n\nThis is an example.");
  });

  it("hides metadata section when empty", () => {
    const noMeta = { ...baseResult, metadata: {} };
    render(<TransformResultPanel result={noMeta} onRetry={vi.fn()} />);
    expect(screen.queryByText("Metadata")).not.toBeInTheDocument();
  });
});
