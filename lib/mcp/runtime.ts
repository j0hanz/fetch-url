import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  TransformError,
  TransformResult,
  TransformMetadata,
} from "@/lib/errors/transform-errors";

/**
 * Maps an MCP error code string to a TransformError.
 */
function mapMcpError(errorPayload: Record<string, unknown>): TransformError {
  const code = typeof errorPayload.code === "string" ? errorPayload.code : "";
  const message =
    typeof errorPayload.message === "string"
      ? errorPayload.message
      : "Unknown MCP error";

  if (code === "VALIDATION_ERROR") {
    return { code: "VALIDATION_ERROR", message, retryable: false };
  }

  if (code === "FETCH_ERROR") {
    return { code: "FETCH_ERROR", message, retryable: true };
  }

  if (code.startsWith("HTTP_")) {
    const statusCode = parseInt(code.slice(5), 10);
    return {
      code: "HTTP_ERROR",
      message,
      retryable: !isNaN(statusCode) && statusCode >= 500,
      statusCode: isNaN(statusCode) ? undefined : statusCode,
    };
  }

  if (code === "ABORTED") {
    return { code: "ABORTED", message, retryable: true };
  }

  if (code === "queue_full") {
    return { code: "QUEUE_FULL", message, retryable: true };
  }

  return { code: "INTERNAL_ERROR", message, retryable: false };
}

function extractMetadata(data: Record<string, unknown>): TransformMetadata {
  const meta = (
    typeof data.metadata === "object" && data.metadata !== null
      ? data.metadata
      : {}
  ) as Record<string, unknown>;
  return {
    description:
      typeof meta.description === "string" ? meta.description : undefined,
    author: typeof meta.author === "string" ? meta.author : undefined,
    publishedDate:
      typeof meta.publishedDate === "string" ? meta.publishedDate : undefined,
    modifiedDate:
      typeof meta.modifiedDate === "string" ? meta.modifiedDate : undefined,
    image: typeof meta.image === "string" ? meta.image : undefined,
    favicon: typeof meta.favicon === "string" ? meta.favicon : undefined,
  };
}

function mapToTransformResult(data: Record<string, unknown>): TransformResult {
  return {
    url: typeof data.url === "string" ? data.url : "",
    resolvedUrl:
      typeof data.resolvedUrl === "string" ? data.resolvedUrl : undefined,
    finalUrl: typeof data.finalUrl === "string" ? data.finalUrl : undefined,
    title: typeof data.title === "string" ? data.title : undefined,
    metadata: extractMetadata(data),
    markdown: typeof data.markdown === "string" ? data.markdown : "",
    fromCache: typeof data.fromCache === "boolean" ? data.fromCache : false,
    fetchedAt:
      typeof data.fetchedAt === "string"
        ? data.fetchedAt
        : new Date().toISOString(),
    contentSize: typeof data.contentSize === "number" ? data.contentSize : 0,
    truncated: typeof data.truncated === "boolean" ? data.truncated : false,
  };
}

export type ParsedMcpResult =
  | { ok: true; result: TransformResult }
  | { ok: false; error: TransformError };

export function parseMcpResult(raw: CallToolResult): ParsedMcpResult {
  // Handle error responses
  if (raw.isError) {
    try {
      const content = raw.content;
      if (
        Array.isArray(content) &&
        content.length > 0 &&
        content[0].type === "text"
      ) {
        const errorPayload = JSON.parse(content[0].text) as Record<
          string,
          unknown
        >;
        // The error payload may be nested under an "error" key
        const inner = (
          typeof errorPayload.error === "object" && errorPayload.error !== null
            ? errorPayload.error
            : errorPayload
        ) as Record<string, unknown>;
        return { ok: false, error: mapMcpError(inner) };
      }
    } catch {
      // Fall through to generic error
    }
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to parse MCP error response",
        retryable: false,
      },
    };
  }

  // Try structuredContent first (REQ-006)
  if (raw.structuredContent && typeof raw.structuredContent === "object") {
    const sc = raw.structuredContent as Record<string, unknown>;
    const data = (
      typeof sc.result === "object" && sc.result !== null ? sc.result : sc
    ) as Record<string, unknown>;
    return { ok: true, result: mapToTransformResult(data) };
  }

  // Fallback: parse first text content block as JSON
  const content = raw.content;
  if (
    Array.isArray(content) &&
    content.length > 0 &&
    content[0].type === "text"
  ) {
    try {
      const parsed = JSON.parse(content[0].text) as Record<string, unknown>;
      const data = (
        typeof parsed.result === "object" && parsed.result !== null
          ? parsed.result
          : parsed
      ) as Record<string, unknown>;
      return { ok: true, result: mapToTransformResult(data) };
    } catch {
      return {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to parse MCP response as JSON",
          retryable: false,
        },
      };
    }
  }

  return {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Empty MCP response",
      retryable: false,
    },
  };
}
