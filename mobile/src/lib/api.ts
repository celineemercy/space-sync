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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${apiUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });

    const body = (await response.json().catch(() => ({}))) as ApiErrorBody | T;
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

    return body as T;
  } catch (error: unknown) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiClientError(
        "The request timed out. Please try again.",
        0,
        "NETWORK_TIMEOUT",
      );
    }
    throw new ApiClientError(
      "Unable to reach CampusSpace. Check your connection.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}
