import {
  validateTransformRequest,
  ValidationError,
} from "@/lib/validation/transform-request";
import { transformUrl } from "@/lib/transform/transform-service";
import type { TransformErrorCode } from "@/lib/errors/transform-errors";

function mapErrorToHttpStatus(code: TransformErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "FETCH_ERROR":
      return 502;
    case "HTTP_ERROR":
      return 502;
    case "ABORTED":
      return 504;
    case "QUEUE_FULL":
      return 503;
    case "INTERNAL_ERROR":
      return 500;
    default:
      return 500;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON body.",
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  let validated;
  try {
    validated = validateTransformRequest(body);
  } catch (error) {
    const message =
      error instanceof ValidationError ? error.message : "Invalid request.";
    return Response.json(
      {
        ok: false,
        error: { code: "VALIDATION_ERROR", message, retryable: false },
      },
      { status: 400 },
    );
  }

  const response = await transformUrl(validated);

  if (response.ok) {
    return Response.json(
      { ok: true, result: response.result },
      { status: 200 },
    );
  }

  return Response.json(
    { ok: false, error: response.error },
    { status: mapErrorToHttpStatus(response.error.code) },
  );
}
