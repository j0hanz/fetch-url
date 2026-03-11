# Page Converter App (Next.js + MCP Client)

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Build a separate **Next.js full-stack app** for **Page Converter** — a single-page internal tool where a user pastes a URL and gets back cleaned Markdown plus metadata. The app acts as a direct MCP client over `stdio`, calling the `fetch-url` tool from `@j0hanz/fetch-url-mcp`. No LLM is involved; the server-side route handler manages MCP session lifecycle and returns a stable JSON contract to the browser. This plan covers project scaffolding, backend MCP integration, API route, frontend UI, validation, error handling, and testing.

## 1. Requirements & Constraints

- **REQ-001**: The app must provide a `POST /api/transform` Route Handler that accepts a URL and optional flags, calls the MCP `fetch-url` tool, and returns a normalized JSON response.
- **REQ-002**: The frontend must be a single page with URL input, option checkboxes (`skipNoiseRemoval`, `forceRefresh`), an optional `maxInlineChars` field, a submit button, and result/error panels.
- **REQ-003**: The result panel must render three sections: Summary (title, URLs, cache status, timestamp, size), Metadata (description, author, dates, image, favicon), and Markdown (scrollable preformatted panel with copy button).
- **REQ-004**: When `truncated` is `true`, the UI must display a visible note and offer a "Retry with fresh fetch" action. UX copy must clarify that `forceRefresh` bypasses cache only.
- **REQ-005**: MCP integration must use `@modelcontextprotocol/client` with `StdioClientTransport`, spawning `npx -y @j0hanz/fetch-url-mcp@latest`.
- **REQ-006**: The app must read `structuredContent` as the primary result source; fall back to parsing the first text content block as JSON when `structuredContent` is absent on non-error results.
- **REQ-007**: When `result.isError === true`, parse the first text content block as JSON error payload before reading success fields.
- **SEC-001**: Never expose raw stack traces to the browser. All errors must be mapped to the stable `TransformError` contract.
- **SEC-002**: The app must not replicate MCP server SSRF rules. Let the MCP server remain the final authority for blocked URLs. The app only validates URL scheme (`http:`/`https:`) and rejects empty input.
- **SEC-003**: Reject unknown fields in the request body to prevent parameter pollution.
- **CON-001**: Runtime requires **Node.js 24+** because the spawned MCP server declares `node >=24`.
- **CON-002**: Use Next.js **App Router**. Do not use Server Actions for the MCP call boundary in v1.
- **CON-003**: V1 uses `stdio` transport. Keep a transport boundary so the same code can move to Streamable HTTP later.
- **CON-004**: V1 creates and closes a fresh MCP client per request. No long-lived shared sessions.
- **CON-005**: No auth, history, saved jobs, cache browser, or task UI in v1.
- **CON-006**: Do not use `mcp-inspector --cli` in the runtime request path. Use it only for smoke tests and CI.
- **GUD-001**: Keep the app split into three layers: route layer (parse, validate, map HTTP response), transform service layer (business flow, retry, error normalization), MCP runtime layer (connection lifecycle, raw MCP call).
- **GUD-002**: Do not implement task mode, resource reads, prompt reads, or tool discovery in the request path for v1.
- **PAT-001**: Follow Next.js Route Handler pattern: `await request.json()` for input, `Response.json(...)` for output. POST handlers are never cached by default — no `dynamic` segment config needed.
- **PAT-002**: Follow MCP client pattern: `Client` → `StdioClientTransport` → `client.callTool()` → close.
- **PAT-003**: Use the Next.js **Metadata API** (`export const metadata: Metadata` from `next`) in layouts and pages. Do **not** manually add `<head>`, `<title>`, or `<meta>` tags to root layouts. Next.js automatically handles streaming and de-duplicating `<head>` elements.
- **PAT-004**: Use Next.js **file conventions** for error and loading states: `error.tsx` (client component, error boundary with `error` + `reset` props), `loading.tsx` (loading UI auto-wrapped in `<Suspense>`), `global-error.tsx` (root-level error boundary replacing the root layout, must include `<html>` and `<body>`).
- **PAT-005**: Mark interactive components with the `'use client'` directive at the top of the file, before any imports. Components using `useState`, `useEffect`, event handlers, or browser APIs must be Client Components. Server Components cannot use hooks or manage client state.

## 2. Implementation Steps

### Phase 1: Project Scaffolding

- GOAL-001: Initialize the Next.js App Router project with TypeScript, define the directory structure, and install dependencies.

| Task      | Description                                                                                                                                                                                                                                                                                                                                                                                                      | Completed | Date |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001  | Run `npx create-next-app@latest page-converter` and select the **recommended defaults**: TypeScript, ESLint, Tailwind CSS v4, App Router, Turbopack. Verify `package.json` name is `page-converter`. Add `"engines": { "node": ">=24" }` to `package.json`.                                                                                                                                                      |           |      |
| TASK-002  | Create directory structure: `app/`, `app/api/transform/`, `components/`, `lib/validation/`, `lib/mcp/`, `lib/transform/`, `lib/errors/`, `tests/unit/`, `tests/integration/`, `tests/ui/`.                                                                                                                                                                                                                       |           |      |
| TASK-003  | Install runtime dependency: `@modelcontextprotocol/sdk` (provides `@modelcontextprotocol/client`). Verify `node >=24` in `engines` field of `package.json`.                                                                                                                                                                                                                                                      |           |      |
| TASK-004  | Create `app/layout.tsx` as the root layout. Export a static `metadata` object using the Next.js Metadata API (`import type { Metadata } from 'next'`): `title: 'Page Converter'`, `description: 'Turn web pages into clean Markdown'`. The layout must define `<html lang="en">` and `<body>` tags. Do **not** add manual `<head>`, `<title>`, or `<meta>` tags — the Metadata API generates them automatically. |           |      |
| TASK-004a | Create `app/error.tsx` — a `'use client'` component implementing an error boundary. Receives `{ error: Error & { digest?: string }; reset: () => void }` props. Renders a fallback UI with the error message (sanitized, no raw stack traces) and a "Try again" button calling `reset()`. Use `useEffect` to log the error to console or a reporting service.                                                    |           |      |
| TASK-004b | Create `app/loading.tsx` — exports a default loading component (e.g., a spinner or skeleton) displayed automatically while route content is loading. Next.js wraps the page in a `<Suspense>` boundary using this as the fallback.                                                                                                                                                                               |           |      |
| TASK-004c | Create `app/global-error.tsx` — a `'use client'` component acting as the root-level error boundary. Must include `<html>` and `<body>` tags since it replaces the root layout on error. Receives `{ error, reset }` props.                                                                                                                                                                                       |           |      |

### Phase 2: Type Definitions & Validation

- GOAL-002: Define app-local TypeScript interfaces and request validation logic.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | Create `lib/validation/transform-request.ts`. Define and export `TransformRequest` interface: `url: string`, `skipNoiseRemoval?: boolean`, `forceRefresh?: boolean`, `maxInlineChars?: number`. Implement `validateTransformRequest(body: unknown): TransformRequest` that validates `url` is a non-empty `http:`/`https:` URL, `maxInlineChars` is an integer `>= 0` when present, booleans are booleans when present, and rejects unknown fields. Throw a typed validation error on failure. |           |      |
| TASK-006 | Create `lib/errors/transform-errors.ts`. Define and export `TransformError` interface with fields: `code` (`VALIDATION_ERROR` \| `FETCH_ERROR` \| `HTTP_ERROR` \| `ABORTED` \| `QUEUE_FULL` \| `INTERNAL_ERROR`), `message: string`, `retryable: boolean`, `statusCode?: number`, `details?: { retryAfter?: number \| string \| null; timeout?: number; reason?: string }`. Export `TransformMetadata` and `TransformResult` interfaces per the API contract.                                  |           |      |

### Phase 3: MCP Client Runtime

- GOAL-003: Implement the server-only MCP client that manages `stdio` transport lifecycle and calls `fetch-url`.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-007 | Create `lib/mcp/mcp-client.ts`. Export `callFetchUrl(args: { url: string; skipNoiseRemoval?: boolean; forceRefresh?: boolean; maxInlineChars?: number }): Promise<RawMcpResult>`. Internally: create `Client`, create `StdioClientTransport` with command `npx` and args `["-y", "@j0hanz/fetch-url-mcp@latest"]`, attach `client.onerror` and `client.onclose` handlers, connect, call `client.callTool({ name: "fetch-url", arguments: args })`, close client, return raw result. |           |      |
| TASK-008 | Create `lib/mcp/runtime.ts`. Export `parseMcpResult(raw: CallToolResult): TransformResult \| TransformError`. If `raw.isError === true`, parse `raw.content[0].text` as JSON and map to `TransformError`. If `raw.structuredContent` exists, map it to `TransformResult`. Otherwise parse `raw.content[0].text` as JSON and map to `TransformResult`.                                                                                                                               |           |      |

### Phase 4: Transform Service

- GOAL-004: Implement the transform service layer that orchestrates MCP calls, retry logic, and error normalization.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Create `lib/transform/transform-service.ts`. Export `transformUrl(request: TransformRequest): Promise<{ ok: true; result: TransformResult } \| { ok: false; error: TransformError }>`. Flow: call `callFetchUrl`, parse result via `parseMcpResult`, apply retry policy (retry once for `FETCH_ERROR`, `HTTP_ERROR` with 5xx `statusCode`, or `QUEUE_FULL`; never retry `VALIDATION_ERROR`, `ABORTED`, `INTERNAL_ERROR`), return normalized response.                            |           |      |
| TASK-010 | Implement error mapping in the service: MCP `VALIDATION_ERROR` / blocked URL → `{ code: "VALIDATION_ERROR", retryable: false }`. MCP `FETCH_ERROR` → `{ code: "FETCH_ERROR", retryable: true }`. MCP `HTTP_<status>` → `{ code: "HTTP_ERROR", statusCode, retryable: status >= 500 }`. MCP `ABORTED` → `{ code: "ABORTED", retryable: true }`. MCP `queue_full` → `{ code: "QUEUE_FULL", retryable: true }`. Unexpected errors → `{ code: "INTERNAL_ERROR", retryable: false }`. |           |      |

### Phase 5: API Route Handler

- GOAL-005: Implement the `POST /api/transform` Route Handler that wires validation, service, and HTTP response mapping.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-011 | Create `app/api/transform/route.ts`. Export `POST(request: Request)`. Parse body with `await request.json()`. Call `validateTransformRequest(body)` — on validation failure, return `Response.json({ ok: false, error: { code: "VALIDATION_ERROR", message, retryable: false } }, { status: 400 })`. On success, call `transformUrl(validated)`. If `ok: true`, return `Response.json({ ok: true, result }, { status: 200 })`. If `ok: false`, return `Response.json({ ok: false, error }, { status: mapErrorToHttpStatus(error.code) })`. |           |      |
| TASK-012 | Implement `mapErrorToHttpStatus(code: string): number` in the route file: `VALIDATION_ERROR` → 400, `FETCH_ERROR` → 502, `HTTP_ERROR` → 502, `ABORTED` → 504, `QUEUE_FULL` → 503, `INTERNAL_ERROR` → 500.                                                                                                                                                                                                                                                                                                                                  |           |      |

### Phase 6: Frontend UI

- GOAL-006: Build the single-page frontend with URL input form, option controls, result rendering, and error display.

| Task     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-013 | Create `components/transform-form.tsx`. Add `'use client'` directive at the top of the file. Uses `useState` for form state and `fetch` for submission. Props: `onResult`, `onError`, `onLoading` callbacks. Contains: URL text input (required), `skipNoiseRemoval` checkbox (default unchecked), `forceRefresh` checkbox (default unchecked), `maxInlineChars` numeric input (optional), "Convert" submit button. On submit, `POST /api/transform` with JSON body via `fetch()`. Disable form during submission.                                                                                                                                                                                                                                                             |           |      |
| TASK-014 | Create `components/transform-result.tsx`. Add `'use client'` directive. Renders three sections: **Summary** (title, input URL, resolved URL, final URL, cache status, fetched timestamp, content size), **Metadata** (description, author, published date, modified date, image, favicon), **Markdown** (scrollable `<pre>` panel). Include a "Copy Markdown" button using `navigator.clipboard.writeText()`. When `truncated === true`, show a warning note and a "Retry with fresh fetch" button that calls an `onRetry` prop with `forceRefresh: true`.                                                                                                                                                                                                                     |           |      |
| TASK-015 | Create `app/page.tsx` as a **Client Component** (add `'use client'` directive). Server Components cannot use `useState` or manage interactive state. This component manages state for `result`, `error`, and `loading` via `useState`. Renders page heading `Page Converter`, subtitle `Turn web pages into clean Markdown`, helper text `Paste a public URL to extract clean Markdown.`. Composes `<TransformForm>` (passing `onResult`, `onError`, `onLoading` callbacks) and conditionally renders `<TransformResult>` when result is available, or an error panel when error is set. Export page-level metadata via a separate `app/page.metadata.ts` or inline `metadata` export is **not** possible in Client Components — use the parent `layout.tsx` metadata instead. |           |      |

### Phase 7: Testing

- GOAL-007: Implement unit, integration, UI, and smoke tests covering the full request path.

| Task     | Description                                                                                                                                                                                                                                                                                                                   | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-016 | Unit tests in `tests/unit/`: `validateTransformRequest` accepts valid input, rejects invalid URLs (empty, non-http), rejects unknown fields, validates `maxInlineChars >= 0`, validates boolean types.                                                                                                                        |           |      |
| TASK-017 | Unit tests in `tests/unit/`: `parseMcpResult` correctly maps `structuredContent` to `TransformResult` preserving all fields (`resolvedUrl`, `finalUrl`, `title`, `metadata`, `markdown`, `fromCache`, `fetchedAt`, `contentSize`, `truncated`). Maps `isError: true` to `TransformError`. Falls back to text content parsing. |           |      |
| TASK-018 | Unit tests in `tests/unit/`: error mapper turns MCP `VALIDATION_ERROR`, `FETCH_ERROR`, `HTTP_<status>`, `ABORTED`, `queue_full`, and unexpected failures into correct `TransformError` codes with correct `retryable` flags.                                                                                                  |           |      |
| TASK-019 | Integration tests in `tests/integration/`: successful transform for a public URL, blocked/private URL returns `VALIDATION_ERROR`, `truncated: true` preserved, HTTP 429/503 maps to `HTTP_ERROR`, `queue_full` maps to `QUEUE_FULL`, MCP client shuts down cleanly.                                                           |           |      |
| TASK-020 | UI tests in `tests/ui/`: user can submit a valid URL, loading state shown, successful result renders all three sections, validation error displayed, rerun with `forceRefresh` preserves URL and options, truncated state shows rerun guidance, copy button works.                                                            |           |      |
| TASK-021 | CI smoke tests: use `mcp-inspector --cli` or helper scripts to verify server starts, `tools/list` shows `fetch-url`, one `tools/call` to `fetch-url` succeeds.                                                                                                                                                                |           |      |

## 3. Alternatives

- **ALT-001**: **Use Server Actions instead of Route Handler** — Rejected. Server Actions are designed for component-local mutations. The MCP call boundary is better modeled as an explicit backend endpoint with a stable JSON contract that can be versioned and tested independently.
- **ALT-002**: **Use `mcp-inspector --cli` as the runtime** — Rejected. It is a testing/inspection tool, not an application runtime. It adds process overhead, is artifact-oriented, and is not the correct abstraction for a stable app service.
- **ALT-003**: **Expose MCP transport directly to the browser** — Rejected. This would leak session behavior, transport details, and protocol internals to the client. Keeping MCP server-side only provides a clean separation of concerns.
- **ALT-004**: **Use an LLM in the request path** — Rejected. The tool performs deterministic fetch + transform. Adding an LLM would introduce token cost, latency, and non-determinism with no benefit for v1.
- **ALT-005**: **Long-lived shared MCP sessions** — Deferred to v2. V1 creates and closes a client per request for simplicity. Connection pooling can be added later if latency becomes a concern.
- **ALT-006**: **Build the frontend inside the MCP server package repository** — Rejected. The MCP server repo should remain a reusable server package. The app lives in its own repository.

## 4. Dependencies

- **DEP-001**: **Next.js** (App Router, latest stable) — Framework for the full-stack app. Provides Route Handlers, Metadata API, React Server Components, Client Components, file conventions (`error.tsx`, `loading.tsx`, `global-error.tsx`), and Turbopack dev server.
- **DEP-002**: **@modelcontextprotocol/sdk** — MCP TypeScript SDK providing `Client` and `StdioClientTransport` for `stdio` communication with the MCP server.
- **DEP-003**: **@j0hanz/fetch-url-mcp** — MCP server package that performs URL fetching and HTML-to-Markdown transformation. Spawned via `npx -y @j0hanz/fetch-url-mcp@latest`.
- **DEP-004**: **Node.js 24+** — Required runtime. The MCP server declares `node >=24` in its `engines` field.
- **DEP-005**: **TypeScript** — Language for all app code. Included via `create-next-app` recommended defaults.
- **DEP-006**: **Tailwind CSS v4** — Utility-first CSS framework. Included via `create-next-app` recommended defaults. Content paths auto-configured for `app/`, `components/`, `lib/`.
- **DEP-007**: **ESLint** — Linter. Included via `create-next-app` recommended defaults with Next.js ESLint config.
- **DEP-008**: **Testing framework** (e.g., Vitest or Jest) — For unit and integration tests.
- **DEP-009**: **UI testing library** (e.g., Playwright or Testing Library) — For UI tests.
- **DEP-010**: **@anthropic-ai/mcp-inspector** (dev only) — For CI smoke tests verifying MCP server availability.

## 5. Files

- **FILE-001**: `app/layout.tsx` — Root layout with `<html>` and `<body>` tags. Exports static `metadata` object via Metadata API (`title`, `description`). No manual `<head>` tags.
- **FILE-001a**: `app/error.tsx` — Route-level error boundary (`'use client'`). Catches uncaught exceptions, renders fallback UI with `reset()` action.
- **FILE-001b**: `app/loading.tsx` — Loading UI component. Auto-wrapped in `<Suspense>` by Next.js.
- **FILE-001c**: `app/global-error.tsx` — Root-level error boundary (`'use client'`). Replaces root layout on error. Must include `<html>` and `<body>`.
- **FILE-002**: `app/page.tsx` — Client Component (`'use client'`). Manages result/error/loading state, composes form and result components.
- **FILE-003**: `app/api/transform/route.ts` — `POST /api/transform` Route Handler. Parses, validates, calls service, returns JSON. Not cached (POST default).
- **FILE-004**: `components/transform-form.tsx` — Client Component (`'use client'`): URL input, option checkboxes, submit button. Uses `useState` and `fetch()`.
- **FILE-005**: `components/transform-result.tsx` — Client Component (`'use client'`): summary, metadata, markdown panels, copy button (`navigator.clipboard`), truncation warning with retry.
- **FILE-006**: `lib/validation/transform-request.ts` — `TransformRequest` interface and `validateTransformRequest()` function.
- **FILE-007**: `lib/errors/transform-errors.ts` — `TransformError`, `TransformResult`, `TransformMetadata` interfaces.
- **FILE-008**: `lib/mcp/mcp-client.ts` — `callFetchUrl()`: MCP client lifecycle over `stdio`.
- **FILE-009**: `lib/mcp/runtime.ts` — `parseMcpResult()`: maps raw MCP result to app types.
- **FILE-010**: `lib/transform/transform-service.ts` — `transformUrl()`: orchestrates MCP call, retry policy, error normalization.
- **FILE-011**: `tests/unit/` — Unit tests for validation, result mapping, and error mapping.
- **FILE-012**: `tests/integration/` — Integration tests using real MCP server over `stdio`.
- **FILE-013**: `tests/ui/` — UI tests for form interaction, result rendering, error display.
- **FILE-014**: `package.json` — Project manifest with `engines.node >= 24`, dependencies, scripts.

## 6. Testing

- **TEST-001**: Unit — `validateTransformRequest` accepts `{ url: "https://example.com" }` and returns valid `TransformRequest`.
- **TEST-002**: Unit — `validateTransformRequest` rejects empty URL, non-http schemes, missing `url` field.
- **TEST-003**: Unit — `validateTransformRequest` rejects unknown fields in body (e.g., `{ url: "...", extra: true }`).
- **TEST-004**: Unit — `validateTransformRequest` rejects `maxInlineChars` < 0 or non-integer.
- **TEST-005**: Unit — `parseMcpResult` maps `structuredContent` preserving `resolvedUrl`, `finalUrl`, `title`, `metadata`, `markdown`, `fromCache`, `fetchedAt`, `contentSize`, `truncated`.
- **TEST-006**: Unit — `parseMcpResult` maps `isError: true` result to correct `TransformError` with `code` and `retryable`.
- **TEST-007**: Unit — `parseMcpResult` falls back to text content parsing when `structuredContent` is absent.
- **TEST-008**: Unit — Error mapper: MCP `VALIDATION_ERROR` → `{ code: "VALIDATION_ERROR", retryable: false }`.
- **TEST-009**: Unit — Error mapper: MCP `HTTP_503` → `{ code: "HTTP_ERROR", statusCode: 503, retryable: true }`.
- **TEST-010**: Unit — Error mapper: MCP `queue_full` → `{ code: "QUEUE_FULL", retryable: true }`.
- **TEST-011**: Unit — Error mapper: unexpected error → `{ code: "INTERNAL_ERROR", retryable: false }`.
- **TEST-012**: Integration — Successful transform for `https://example.com` returns `{ ok: true, result }` with valid markdown.
- **TEST-013**: Integration — Blocked/private/local URL returns `{ ok: false, error: { code: "VALIDATION_ERROR", retryable: false } }`.
- **TEST-014**: Integration — Response with `truncated: true` is preserved in result.
- **TEST-015**: Integration — MCP client shuts down without leaving child process hanging.
- **TEST-016**: UI — User submits valid URL → loading state shown → result renders summary, metadata, markdown.
- **TEST-017**: UI — Validation error displayed cleanly without stack traces.
- **TEST-018**: UI — Rerun with `forceRefresh` preserves URL and options.
- **TEST-019**: UI — Truncated state shows warning note and "Retry with fresh fetch" button.
- **TEST-020**: UI — "Copy Markdown" button copies output to clipboard.
- **TEST-021**: Smoke — `mcp-inspector --cli`: server starts, `tools/list` includes `fetch-url`, one `tools/call` succeeds.
- **TEST-022**: Unit — `app/error.tsx` renders fallback UI with error message and "Try again" button. Clicking "Try again" calls `reset()`.
- **TEST-023**: UI — `app/loading.tsx` is displayed while the page is loading (verify Suspense boundary).
- **TEST-024**: Unit — `app/global-error.tsx` renders with `<html>` and `<body>` tags and provides recovery action.

## 7. Risks & Assumptions

- **RISK-001**: `npx -y @j0hanz/fetch-url-mcp@latest` has cold-start latency from package download on first call. Mitigation: pre-install in Docker image or CI; consider pinning version instead of `@latest`.
- **RISK-002**: Per-request MCP client creation adds overhead (process spawn per request). Acceptable for v1 internal use. Mitigation path: connection pooling or long-lived sessions in v2.
- **RISK-003**: The MCP server's `structuredContent` schema may change across versions. Mitigation: pin server version in production; validate response shape defensively.
- **RISK-004**: `mcp-inspector --cli` availability or API may change, breaking CI smoke tests. Mitigation: keep smoke tests isolated and non-blocking.
- **ASSUMPTION-001**: The deployment environment provides Node.js 24+ at runtime.
- **ASSUMPTION-002**: `@j0hanz/fetch-url-mcp` remains published and stable on npm.
- **ASSUMPTION-003**: The MCP server correctly enforces SSRF protections (blocking localhost, private IPs, metadata endpoints). The app does not duplicate these checks.
- **ASSUMPTION-004**: V1 is internal-only. No authentication, rate limiting, or multi-user concerns.
- **ASSUMPTION-005**: The `@modelcontextprotocol/sdk` package exposes `Client` and `StdioClientTransport` with the expected API surface.

## 8. Related Specifications / Further Reading

- [Next.js App Router — Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers) — Route Handler pattern, caching behavior, CORS.
- [Next.js — Metadata API](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — Static and dynamic metadata, `export const metadata`, `generateMetadata`.
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — `'use client'` directive, composition patterns.
- [Next.js — Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) — `error.tsx`, `global-error.tsx`, expected vs uncaught errors.
- [Next.js — Installation](https://nextjs.org/docs/app/getting-started/installation) — `create-next-app` setup prompts and recommended defaults.
- [Next.js — Project Structure](https://nextjs.org/docs/app/getting-started/project-structure) — File conventions: `layout`, `page`, `loading`, `error`, `not-found`, `route`.
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Client SDK for `stdio` transport.
- [@j0hanz/fetch-url-mcp](https://www.npmjs.com/package/@j0hanz/fetch-url-mcp) — MCP server package for URL fetching and Markdown conversion.
- [MCP Specification (2025-11-25)](https://spec.modelcontextprotocol.io/) — Protocol specification.
