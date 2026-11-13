import { logRuntime } from "./runtime-log";

type ApiErrorBody = {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let unauthorizedHandler: (() => void | Promise<void>) | undefined;

export function setUnauthorizedHandler(
  handler: (() => void | Promise<void>) | undefined,
) {
  unauthorizedHandler = handler;
}

function apiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) {
    throw new ApiClientError(
      "The API URL is not configured.",
      0,
      "API_URL_MISSING",
    );
  }
  return value;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const startedAt = Date.now();
  const method = options.method ?? "GET";
  const route = path.split("?")[0].replace(/\/[0-9a-f-]{20,}(?=\/|$)/gi, "/:id");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.body instanceof FormData ? 30_000 : 12_000);

  try {
    const response = await fetch(`${apiUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (response.ok) {
        throw new ApiClientError(
          "The server returned invalid JSON. Please try again.",
          response.status,
          "INVALID_JSON",
        );
      }
      body = {};
    }
    if (!response.ok) {
      const error = body as ApiErrorBody;
      if (response.status === 401 && unauthorizedHandler) {
        await unauthorizedHandler();
      }
      throw new ApiClientError(
        error.message ?? "The request could not be completed.",
        response.status,
        error.code ?? "REQUEST_ERROR",
        error.details,
      );
    }

    logRuntime("info", "api_request", { method, route, status: response.status, durationMs: Date.now() - startedAt });
    return body as T;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      logRuntime("warn", "api_request_failed", { method, route, status: error.statusCode, code: error.code, durationMs: Date.now() - startedAt });
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      logRuntime("warn", "api_request_failed", { method, route, code: "NETWORK_TIMEOUT", durationMs: Date.now() - startedAt });
      throw new ApiClientError(
        "The request timed out. Please try again.",
        0,
        "NETWORK_TIMEOUT",
      );
    }
    logRuntime("warn", "api_request_failed", { method, route, code: "NETWORK_ERROR", durationMs: Date.now() - startedAt });
    throw new ApiClientError(
      "Unable to reach space-sync. Check your connection.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}
