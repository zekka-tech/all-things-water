const API_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let details: unknown;
      try {
        details = await res.json();
      } catch {
        /* ignore parse errors */
      }
      const message =
        typeof details === "object" && details !== null && "error" in details
          ? String((details as Record<string, unknown>).error)
          : `Request failed (${res.status})`;
      throw new ApiError(res.status, message, details);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please try again.");
    }
    throw new ApiError(
      0,
      "Network error. Please check your connection and try again.",
    );
  }
}

export function userFriendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "Some items are no longer in stock. Please review your cart.";
    if (err.status === 0) return "Connection issue. Please check your internet and try again.";
    return err.message || "Something went wrong. Please try again.";
  }
  return "An unexpected error occurred. Please try again or contact us.";
}
