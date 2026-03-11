export interface TransformRequest {
  url: string;
}

const ALLOWED_FIELDS = new Set<keyof TransformRequest>(["url"]);

type TransformRequestRecord = Record<string, unknown>;

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

  const record = body as TransformRequestRecord;

  // Reject unknown fields
  for (const key of Object.keys(record)) {
    if (!ALLOWED_FIELDS.has(key as keyof TransformRequest)) {
      throw new ValidationError(`Unknown field: "${key}".`);
    }
  }

  // Validate url
  const url = validateUrl(record.url);

  return { url };
}

function validateUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(
      'Field "url" is required and must be a non-empty string.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ValidationError('Field "url" must be a valid URL.');
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError('Field "url" must use http: or https: scheme.');
  }

  return value;
}
