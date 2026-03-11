export interface TransformRequest {
  url: string;
  skipNoiseRemoval?: boolean;
  forceRefresh?: boolean;
  maxInlineChars?: number;
}

const ALLOWED_FIELDS = new Set([
  "url",
  "skipNoiseRemoval",
  "forceRefresh",
  "maxInlineChars",
]);

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateTransformRequest(body: unknown): TransformRequest {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const record = body as Record<string, unknown>;

  // Reject unknown fields
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key)) {
      throw new ValidationError(`Unknown field: "${key}".`);
    }
  }

  // Validate url
  if (typeof record.url !== "string" || record.url.trim() === "") {
    throw new ValidationError(
      'Field "url" is required and must be a non-empty string.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(record.url);
  } catch {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  // Validate optional booleans
  if (
    record.skipNoiseRemoval !== undefined &&
    typeof record.skipNoiseRemoval !== "boolean"
  ) {
    throw new ValidationError('Field "skipNoiseRemoval" must be a boolean.');
  }

  if (
    record.forceRefresh !== undefined &&
    typeof record.forceRefresh !== "boolean"
  ) {
    throw new ValidationError('Field "forceRefresh" must be a boolean.');
  }

  // Validate optional maxInlineChars
  if (record.maxInlineChars !== undefined) {
    if (
      typeof record.maxInlineChars !== "number" ||
      !Number.isInteger(record.maxInlineChars) ||
      record.maxInlineChars < 0
    ) {
      throw new ValidationError(
        'Field "maxInlineChars" must be a non-negative integer.',
      );
    }
  }

  return {
    url: record.url,
    ...(record.skipNoiseRemoval !== undefined && {
      skipNoiseRemoval: record.skipNoiseRemoval,
    }),
    ...(record.forceRefresh !== undefined && {
      forceRefresh: record.forceRefresh,
    }),
    ...(record.maxInlineChars !== undefined && {
      maxInlineChars: record.maxInlineChars,
    }),
  };
}
