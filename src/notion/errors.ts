export class NotionApiError extends Error {
  status: number;
  code?: string;
  responseBody: unknown;
  retryAfterMs?: number;

  constructor(
    status: number,
    statusText: string,
    responseBody: unknown,
    retryAfterMs?: number,
  ) {
    const body =
      responseBody && typeof responseBody === "object"
        ? (responseBody as Record<string, unknown>)
        : undefined;
    const code = typeof body?.code === "string" ? body.code : undefined;
    const message =
      typeof body?.message === "string" ? body.message : statusText;

    super(
      `Notion API request failed (${status}${code ? ` ${code}` : ""}): ${message}`,
    );
    this.name = "NotionApiError";
    this.status = status;
    this.code = code;
    this.responseBody = responseBody;
    this.retryAfterMs = retryAfterMs;
  }
}
