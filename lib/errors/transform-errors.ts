export type TransformErrorCode =
  | "VALIDATION_ERROR"
  | "FETCH_ERROR"
  | "HTTP_ERROR"
  | "ABORTED"
  | "QUEUE_FULL"
  | "INTERNAL_ERROR";

export interface TransformError {
  code: TransformErrorCode;
  message: string;
  retryable: boolean;
  statusCode?: number;
  details?: {
    retryAfter?: number | string | null;
    timeout?: number;
    reason?: string;
  };
}

export interface TransformMetadata {
  description?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
  image?: string;
  favicon?: string;
}

export interface TransformResult {
  url: string;
  resolvedUrl?: string;
  finalUrl?: string;
  title?: string;
  metadata: TransformMetadata;
  markdown: string;
  fromCache: boolean;
  fetchedAt: string;
  contentSize: number;
  truncated: boolean;
}

export type TransformSuccessResponse = {
  ok: true;
  result: TransformResult;
};

export type TransformErrorResponse = {
  ok: false;
  error: TransformError;
};

export type TransformResponse =
  | TransformSuccessResponse
  | TransformErrorResponse;
