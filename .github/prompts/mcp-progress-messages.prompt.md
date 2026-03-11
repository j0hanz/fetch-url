# MCP Tool Progress Messages — Implementation Guide

## Purpose

Add rich, real-time progress feedback to MCP tool handlers using three complementary patterns:

1. **`wrapToolHandler`** — declarative `progressMessage` + `completionMessage` for simple / fast tools
2. **`notifyProgress` + `createProgressReporter`** — imperative, streaming feedback for long-running tools
3. **`progressWithMessage` wrapper** — mid-scan live file/item counts with rate-limiting
4. **Milestone reporter helper** — skip-every-N pattern for internal loops that do not accept `onProgress`

Apply to any TypeScript MCP server that uses `@modelcontextprotocol/sdk` with a `wrapToolHandler` / `executeToolWithDiagnostics` pattern.

---

## How Progress Notifications Work (MCP Spec Summary)

The client signals it wants progress by including a `progressToken` in `_meta` when calling a tool:

```json
{
  "method": "tools/call",
  "params": {
    "_meta": { "progressToken": "abc123" },
    "name": "grep",
    "arguments": {}
  }
}
```

The server reads the token from the `extra` parameter passed to every tool handler (`extra._meta?.progressToken`) and sends `notifications/progress` back as the work proceeds:

```json
{
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 42,
    "total": 100,
    "message": "grep: *.ts — 42 files scanned"
  }
}
```

Rules from the spec:

- `progress` **must increase** with every notification (monotonic).
- `total` is optional; omit it when the upper bound is unknown.
- Setting `current === total` on the final notification signals completion to the client.
- Progress notifications **must stop** after the tool returns.
- Both sides should rate-limit to avoid flooding.

**Key implication**: `notifyProgress` and `createProgressReporter` already guard against the "no token" case — if `extra._meta?.progressToken` is missing, all calls are silent no-ops. You never need to check the token before calling them.

---

## Message Format Conventions

```
<toolName>: <context> [<metadata>]    <- start / mid-scan messages
<toolName>: <context> • <outcome>     <- completion messages
```

| Rule                                                           | Example                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| Use `•` (bullet) as separator before outcome                   | `read: foo.ts • 42 lines`                           |
| Use `[ ]` for inline metadata (counts, flags, type)            | `write: foo.ts [1024 chars]`                        |
| Use `basename()` for file names, never full path               | `path.basename(args.path)`                          |
| Use `•` as outcome separator, `,` for tabular lists            | `2/3 OK, 1 failed` vs `• 2 files [dry run]`         |
| Extract repeated strings into a variable at the top of `run()` | `const scope = args.filePattern;`                   |
| Extract flag labels into variables, not inline ternaries       | `const dryLabel = args.dryRun ? ' [dry run]' : '';` |

---

## Utility Functions You Will Need

These utilities live in `shared.ts` (or equivalent) in this server. Copy signatures as needed to other servers.

### `notifyProgress(extra, { current, total?, message? })`

Fires one immediate progress notification. No rate-limiting. Safe to call unconditionally — silently no-ops if `extra` has no `progressToken`.

```ts
export function notifyProgress(
  extra: ToolExtra,
  progress: { current: number; total?: number; message?: string },
): void;
```

Use for: start-of-operation and end-of-operation signals where you want the notification to fire right away.

### `createProgressReporter(extra)`

Returns a rate-limited, monotonic reporter. Drops calls that arrive within 50 ms of the previous one and ignores `current` values that are not strictly greater than the last accepted value.

```ts
export function createProgressReporter(
  extra: ToolExtra,
): (progress: { total?: number; current: number; message?: string }) => void;
```

Use for: mid-scan loops where the caller fires on every iteration. The reporter handles throttling so you do not have to.

Internals (for reference — do not reproduce in hot paths):

```ts
// Rate-limit state (closure variables):
let lastProgress = -1;
let lastSentMs = 0;
const RATE_LIMIT_MS = 50;

return (progress) => {
  if (progress.current <= lastProgress) return;          // monotonic guard
  const now = Date.now();
  if (now - lastSentMs < RATE_LIMIT_MS) return;         // rate-limit guard
  lastProgress = progress.current;
  lastSentMs = now;
  void sendNotification(...);
};
```

### `wrapToolHandler(handler, { guard?, progressMessage?, completionMessage? })`

Wraps a tool handler with automatic start/end progress wrapping. Calls `notifyProgress` at `current: 0` (start) and `current: 1, total: 1` (end).

```ts
export function wrapToolHandler<Args, Result>(
  handler: (args: Args, extra: ToolExtra) => Promise<ToolResult<Result>>,
  options: {
    guard?: () => boolean;
    progressMessage?: (args: Args) => string;
    completionMessage?: (
      args: Args,
      result: ToolResult<Result>,
    ) => string | undefined;
  },
): (args: Args, extra?: ToolExtra) => Promise<ToolResult<Result>>;
```

When `completionMessage` is omitted, the end notification reuses the start message. When provided, it fires with the actual result available so you can read `result.structuredContent`.

---

## Pattern A — `wrapToolHandler` (Simple / Fast Tools)

Use when the tool completes in one shot and there is no streaming loop.

### Template

```ts
const wrappedHandler = wrapToolHandler(handler, {
  guard: options.isInitialized,

  // Shown immediately when the tool is invoked (current: 0)
  progressMessage: (args) => {
    const name = path.basename(args.path);
    return `<tool>: ${name}`;
    // With metadata:  `<tool>: ${name} [${args.mode}]`
  },

  // Shown when the tool resolves (current: 1, total: 1)
  completionMessage: (args, result) => {
    const name = path.basename(args.path);
    // Always check isError first — it can be true even if sc.ok is true in edge cases
    if (result.isError) return `<tool>: ${name} • failed`;
    const sc = result.structuredContent;
    if (!sc.ok) return `<tool>: ${name} • failed`;
    // Happy-path outcome:
    return `<tool>: ${name} • ${sc.someField}`;
  },
});
```

### Returning `undefined` from `completionMessage`

Return `undefined` to reuse the start message text unchanged (saves duplicating the string):

```ts
completionMessage: (args, result) => {
  if (!result.isError) return undefined; // reuse start message on success
  return `<tool>: ${path.basename(args.path)} • failed`;
},
```

### Real Examples

**read** — shows line count or range:

```ts
progressMessage: (args) => {
  const name = path.basename(args.path);
  if (args.startLine !== undefined) {
    const end = args.endLine ?? '...';
    return `read: ${name} [${args.startLine}-${end}]`;
  }
  return `read: ${name}`;
},
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `read: ${name} • failed`;
  const sc = result.structuredContent;
  if (!sc.ok) return `read: ${name} • failed`;
  if (sc.hasMoreLines)
    return `read: ${name} • truncated [${sc.totalLines ?? '?'} lines]`;
  if (sc.startLine !== undefined)
    return `read: ${name} • lines ${sc.startLine}-${sc.endLine ?? '?'}`;
  return `read: ${name} • ${sc.totalLines ?? '?'} lines`;
},
```

**write** — shows input size then bytes written:

```ts
progressMessage: (args) =>
  `write: ${path.basename(args.path)} [${args.content.length} chars]`,
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `write: ${name} • failed`;
  const sc = result.structuredContent;
  if (!sc.ok) return `write: ${name} • failed`;
  return `write: ${name} • ${sc.bytesWritten ?? 0} bytes`;
},
```

**apply_patch** — distinguishes dry-run vs real apply using a label variable:

```ts
progressMessage: (args) => {
  const name = path.basename(args.path);
  const dryLabel = args.dryRun ? ' [dry run]' : '';
  return `apply_patch: ${name}${dryLabel}`;
},
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `apply_patch: ${name} • failed`;
  const sc = result.structuredContent;
  if (!sc.ok) return `apply_patch: ${name} • failed`;
  if (args.dryRun) return `apply_patch: ${name} • dry run OK`;
  return `apply_patch: ${name} • applied`;
},
```

**stat** — shows file type and size:

```ts
progressMessage: (args) => `stat: ${path.basename(args.path)}`,
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `stat: ${name} • failed`;
  const sc = result.structuredContent;
  if (!sc.ok || !sc.info) return `stat: ${name} • failed`;
  return `stat: ${sc.info.name} [${sc.info.type}, ${formatBytes(sc.info.size)}]`;
},
```

**stat_many / read_many** — previews first two filenames and counts:

```ts
progressMessage: (args) => {
  const first = path.basename(args.paths[0] ?? '');
  const extra = args.paths.length > 1
    ? `, ${path.basename(args.paths[1] ?? '')}...`
    : '';
  return `read_many: ${args.paths.length} files [${first}${extra}]`;
},
completionMessage: (_args, result) => {
  if (result.isError) return `read_many • failed`;
  const sc = result.structuredContent;
  if (!sc.ok) return `read_many • failed`;
  const total = sc.summary?.total ?? 0;
  const failed = sc.summary?.failed ?? 0;
  if (failed)
    return `read_many: ${sc.summary?.succeeded}/${total} read, ${failed} failed`;
  return `read_many: ${total} files read`;
},
```

**edit** — shows edit count in both start and end:

```ts
progressMessage: (args) => {
  const name = path.basename(args.path);
  const n = args.edits.length;
  return `edit: ${name} [${n} ${n === 1 ? 'edit' : 'edits'}]`;
},
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `edit: ${name} • failed`;
  const sc = result.structuredContent;
  if (!sc.ok) return `edit: ${name} • failed`;
  const applied = sc.appliedCount ?? args.edits.length;
  return `edit: ${name} • [${applied} ${applied === 1 ? 'edit' : 'edits'} applied]`;
},
```

---

## Pattern B — Manual `notifyProgress` (Streaming / Long-Running Tools)

Use when a tool drives a scan/search loop internally and you want:

- An immediate **start** message (before the loop begins)
- A rich **end** message (after the loop finishes, with result data)
- The `wrapToolHandler` left without `progressMessage` / `completionMessage` (the manual calls take over)

### Template

```ts
run: async (signal) => {
  // ── Extract scope variable once, reuse in all three messages ──
  const scope = args.filePattern;   // or args.path, args.pattern, etc.

  // ── START (fires immediately at current: 0 — no total yet) ──
  notifyProgress(extra, {
    current: 0,
    message: `<tool>: ${args.pattern} in ${scope}`,
  });

  // ── MID-SCAN: see Pattern C ──
  const result = await handle(args, signal, progressWithMessage);

  // ── END: set total === current to signal completion ──
  const sc = result.structuredContent;
  const finalCurrent = (sc.filesScanned ?? 0) + 1;
  notifyProgress(extra, {
    current: finalCurrent,
    total: finalCurrent,          // <-- key: tells clients work is done
    message: `<tool>: ${args.pattern} • ${buildEndSuffix(sc)}`,
  });

  return result;
},
```

**Why `total === current` on the end notification?**
The MCP spec says the client knows an operation is done when `progress` reaches `total`. Setting them equal on the final notification is the signal. Always do this on the last `notifyProgress` call.

### Completion signaling pattern (full real example from `search-content.ts`)

```ts
const sc = result.structuredContent;
const count = sc.ok && sc.totalMatches ? sc.totalMatches : 0;
const filesMatched = sc.ok ? (sc.filesMatched ?? 0) : 0;
const stoppedReason = sc.ok ? sc.stoppedReason : undefined;

let suffix: string;
if (count === 0) {
  suffix = `No matches in ${scope}`;
} else {
  const matchWord = count === 1 ? "match" : "matches";
  const fileInfo =
    filesMatched > 0
      ? ` in ${filesMatched} ${filesMatched === 1 ? "file" : "files"}`
      : "";
  suffix = `${count} ${matchWord}${fileInfo}`;
  if (stoppedReason === "timeout") suffix += " [stopped — timeout]";
  if (stoppedReason === "maxResults") suffix += " [truncated — max results]";
  if (stoppedReason === "maxFiles") suffix += " [truncated — max files]";
}

const finalCurrent = (sc.filesScanned ?? 0) + 1;
notifyProgress(extra, {
  current: finalCurrent,
  total: finalCurrent,
  message: `grep: ${pattern} • ${suffix}`,
});
```

### Completion signaling pattern (from `replace-in-files.ts`)

```ts
const sc = result.structuredContent;
const finalCurrent = (sc.processedFiles ?? 0) + 1;

const matchWord = (sc.matches ?? 0) === 1 ? "match" : "matches";
const fileWord = (sc.filesChanged ?? 0) === 1 ? "file" : "files";
let endSuffix = `${sc.matches ?? 0} ${matchWord} in ${sc.filesChanged ?? 0} ${fileWord}`;
if (sc.failedFiles) endSuffix += `, ${sc.failedFiles} failed`;
if (sc.dryRun) endSuffix += " [dry run]";

notifyProgress(extra, {
  current: finalCurrent,
  total: finalCurrent,
  message: `search_and_replace: "${args.searchPattern}" • ${endSuffix}`,
});
```

### Completion signaling pattern (from `calculate-hash.ts`)

```ts
const sc = result.structuredContent;
const totalFiles = sc.ok ? (sc.fileCount ?? 1) : 1;
const finalCurrent = totalFiles + 1;

let suffix: string;
if (!sc.ok) {
  suffix = "failed";
} else if (sc.fileCount !== undefined && sc.fileCount > 1) {
  suffix = `${sc.fileCount} files • ${(sc.hash ?? "").slice(0, 8)}...`;
} else {
  suffix = `${(sc.hash ?? "").slice(0, 8)}...`;
}

notifyProgress(extra, {
  current: finalCurrent,
  total: finalCurrent,
  message: `calculate_hash: ${baseName} • ${suffix}`,
});
```

---

## Pattern C — `progressWithMessage` (Mid-Scan Live Counts)

Use to inject a `message` into every `current` tick from an underlying `onProgress` callback without duplicating the 50ms throttle logic. The pattern wraps `createProgressReporter` so all existing rate-limiting is inherited.

### Template

```ts
const baseReporter = createProgressReporter(extra);

// The `: void` annotation is required — prevents `void | undefined` inference issues.
const progressWithMessage = ({
  current,
  total,
}: {
  total?: number;
  current: number;
}): void => {
  const itemWord = current === 1 ? "file" : "files"; // pluralize counts
  baseReporter({
    current,
    ...(total !== undefined ? { total } : {}), // conditional spread — see TypeScript Gotchas
    message: `<tool>: ${scope} — ${current} ${itemWord} scanned`,
  });
};

// Pass progressWithMessage into the lib function that accepts `onProgress`
const result = await handle(args, signal, progressWithMessage);
```

### Real example from `search-content.ts`

```ts
const baseReporter = createProgressReporter(extra);
const progressWithMessage = ({
  current,
  total,
}: {
  total?: number;
  current: number;
}): void => {
  const fileWord = current === 1 ? "file" : "files";
  baseReporter({
    current,
    ...(total !== undefined ? { total } : {}),
    message: `grep: ${normalizedArgs.pattern} • ${current} ${fileWord} scanned`,
  });
};

const result = await handleSearchContent(
  normalizedArgs,
  signal,
  options.resourceStore,
  progressWithMessage,
);
```

### Real example from `replace-in-files.ts`

```ts
const baseReporter = createProgressReporter(extra);
const progressWithMessage = ({
  current,
  total,
}: {
  total?: number;
  current: number;
}): void => {
  baseReporter({
    current,
    ...(total !== undefined ? { total } : {}),
    message: `search_and_replace: "${args.searchPattern}" — ${current} files processed`,
  });
};

const result = await handleSearchAndReplace(args, signal, progressWithMessage);
```

---

## Pattern D — Milestone Reporter Helper (Internal Loops)

Use when the tool has an internal loop that does **not** accept an `onProgress` callback, or when you want to skip reporting every iteration and only report at milestones (every 25th item). This avoids passing the reporter through many layers.

### Template

```ts
function reportMyToolProgress(
  onProgress:
    | ((progress: { total?: number; current: number }) => void)
    | undefined,
  current: number,
  force = false,
): void {
  if (!onProgress || current === 0) return;
  if (!force && current % 25 !== 0) return; // only every 25th item
  onProgress({ current });
}
```

Call inside the loop:

```ts
let filesProcessed = 0;
for (const entry of entries) {
  await processEntry(entry);
  filesProcessed++;
  reportMyToolProgress(onProgress, filesProcessed); // skips non-milestones
}
reportMyToolProgress(onProgress, filesProcessed, true); // force-fire the final count
```

The `onProgress` callback at the call site is your `progressWithMessage` from Pattern C, so the rate-limiter is still enforced on top of the 25-item skip logic.

### Real example from `calculate-hash.ts`

```ts
function reportHashProgress(
  onProgress:
    | ((progress: { total?: number; current: number }) => void)
    | undefined,
  current: number,
  force = false,
): void {
  if (!onProgress || current === 0) return;
  if (!force && current % 25 !== 0) return;
  onProgress({ current });
}

// Inside hashDirectory():
let filesHashed = 0;
for (let i = 0; i < filteredPaths.length; i += concurrency) {
  const batchResults = await Promise.all(batch.map(hashOneFile));
  entries.push(...batchResults);
  filesHashed += batchResults.length;
  reportHashProgress(onProgress, filesHashed); // fires every 25 files
}
reportHashProgress(onProgress, filesHashed, true); // final forced report
```

---

## TypeScript Gotchas

### `exactOptionalPropertyTypes: true` — conditional spread for `total`

When `tsconfig.json` has `"exactOptionalPropertyTypes": true`, you **cannot** pass `{ total: undefined }` where `total?: number` is expected. The type system treats an explicitly-present `undefined` value differently from an absent key.

**Wrong** (type error under strict optional types):

```ts
baseReporter({ current, total }); // fails if total is undefined
baseReporter({ current, ...{ total } }); // same problem
```

**Correct** — conditional spread:

```ts
baseReporter({
  current,
  ...(total !== undefined ? { total } : {}),
});
```

This pattern appears in every `progressWithMessage` wrapper and every `notifyProgress` call where `total` might be absent.

### Return type annotation on `progressWithMessage`

Always annotate `: void` explicitly to prevent TypeScript from inferring `void | undefined`:

```ts
// Wrong — TypeScript infers the return type as `void | undefined`
const progressWithMessage = ({ current, total }) => {
  baseReporter(...);
};

// Correct
const progressWithMessage = ({
  current,
  total,
}: {
  total?: number;
  current: number;
}): void => {
  baseReporter(...);
};
```

### `??` lint warning with schema defaults

If a Zod schema field has `.default('**/*')`, the value is always defined after parsing — the `??` operator will be flagged as unnecessary. Remove it:

```ts
// Schema: z.string().default('**/*')
const normalizedArgs = MyInputSchema.parse(args);
const scope = normalizedArgs.filePattern; // always defined — no ?? needed
```

### `result.isError` vs `sc.ok`

Check `result.isError` **before** `sc.ok`. They usually agree, but checking `isError` first ensures you catch all error paths:

```ts
completionMessage: (args, result) => {
  const name = path.basename(args.path);
  if (result.isError) return `<tool>: ${name} • failed`;     // protocol error path
  const sc = result.structuredContent;
  if (!sc.ok) return `<tool>: ${name} • failed`;              // tool execution error path
  return `<tool>: ${name} • ${sc.someField}`;                 // happy path
},
```

---

## Common Tricks

### Scope variable — define once, reuse in all three messages

Extract the contextual scope (path, pattern, file type) at the top of `run()` and use it in the start, mid-scan, and end messages to keep them consistent:

```ts
run: async (signal) => {
  const scope = normalizedArgs.filePattern;   // e.g. "**/*.ts"
  const pattern = normalizedArgs.pattern;

  notifyProgress(extra, { current: 0, message: `grep: ${pattern} in ${scope}` });
  // ... mid-scan uses scope ...
  notifyProgress(extra, { current: fc, total: fc, message: `grep: ${pattern} • N matches in ${scope}` });
},
```

### `dryLabel` variable — clean flag annotation

Avoid inline ternaries inside template literals for flags:

```ts
// Messy
message: `tool: ${name}${args.dryRun ? ' [dry run]' : ''}`,

// Clean
const dryLabel = args.dryRun ? ' [dry run]' : '';
message: `tool: ${name}${dryLabel}`,
```

### Pluralization — always pluralize counts

```ts
const matchWord = n === 1 ? "match" : "matches";
const fileWord = n === 1 ? "file" : "files";
`${n} ${matchWord} in ${f} ${fileWord}`;
```

### Hash prefix in completion messages

For hash-returning tools, show a short prefix of the hash rather than the full 64-char hex digest:

```ts
suffix = `${sc.hash.slice(0, 8)}...`;
// e.g. "calculate_hash: mydir • 8 files • a3f2b1c0..."
```

### `notifyProgress` is safe without a token

`notifyProgress` and `createProgressReporter` both check `canSendProgress(extra)` internally. If the client did not provide a `progressToken`, all calls are silent no-ops. Never guard them with a manual check:

```ts
// Unnecessary guard — remove it
if (extra._meta?.progressToken) {
  notifyProgress(extra, ...);
}

// Just call directly — safe unconditionally
notifyProgress(extra, ...);
```

### `baseName` for all file references in messages

Never embed an absolute path in a progress message. Always use `path.basename()`:

```ts
const baseName = path.basename(args.path); // "myfile.ts"
// not: args.path  which could be "/long/absolute/path/myfile.ts"
```

---

## Checklist — Implementing on a New Tool

- [ ] Identify tool type: **simple** (one-shot) → Pattern A; **streaming** (scan loop) → Patterns B + C
- [ ] Extract `scope`, `baseName` and any flag labels (`dryLabel`, etc.) as variables at top of `run()`
- [ ] `progressMessage` — start message with context (name / pattern / scope / flags like `[dry run]`)
- [ ] `completionMessage` — check `result.isError` first, then `sc.ok`, then happy-path outcome
- [ ] For streaming tools: manual `notifyProgress` at start (`current: 0`) and at end (`current === total`)
- [ ] For streaming tools: `progressWithMessage` wrapper for mid-scan using `createProgressReporter`
- [ ] If the inner loop does not accept `onProgress`, add a `reportXxxProgress` milestone helper (Pattern D)
- [ ] Annotate `: void` on every `progressWithMessage` arrow function
- [ ] Apply conditional spread `...(x !== undefined ? { x } : {})` for every optional `total` field
- [ ] Use `path.basename()` for filenames; never embed full absolute paths in messages
- [ ] Use `[ ]` for inline metadata/counts/flags, `•` as the outcome separator, `,` for tabular lists
- [ ] Pluralize all user-visible counts: `n === 1 ? 'file' : 'files'`
- [ ] On the final end `notifyProgress`, set `total === current` to signal completion
- [ ] Run `npm run type-check` and `npm run lint` after implementing — zero errors expected

---

## Quick Implementation Order (New MCP Server)

1. Identify which tools have no `progressMessage` yet (search all `wrapToolHandler` calls)
2. Group them: **simple** (one `run()` returning immediately) vs **streaming** (has an `onProgress` param or internal loop)
3. Implement Pattern A for all simple tools in one pass
4. Implement Patterns B + C for each streaming tool; add Pattern D if the loop is internal
5. Run `npm run type-check && npm run lint && npm run test` — fix any issues
6. Spot-check a few tool invocations via MCP client to confirm message appearance

---

## Pattern Quick-Reference

| Situation                                  | Pattern                     | Key calls                                                                                                         |
| ------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One-shot tool (no internal loop)           | A — `wrapToolHandler`       | `progressMessage`, `completionMessage`                                                                            |
| Streaming tool: start + end messages       | B — manual `notifyProgress` | `notifyProgress(extra, { current: 0, message })` and `notifyProgress(extra, { current: fc, total: fc, message })` |
| Streaming tool: mid-scan per-item messages | C — `progressWithMessage`   | `createProgressReporter(extra)` + wrapper function                                                                |
| Internal loop without `onProgress` param   | D — milestone helper        | `reportXxxProgress(onProgress, current, force?)`                                                                  |
