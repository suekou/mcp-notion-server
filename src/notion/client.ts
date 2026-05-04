/**
 * Notion API client wrapper
 */

import { convertToMarkdown } from "../markdown/index.js";
import type { AppendBlockChildrenPosition } from "../tools/blocks/types.js";
import type { CreateDataSourceArgs } from "../tools/data-sources/types.js";
import { NotionApiError } from "./errors.js";
import type {
  BlockResponse,
  CommentResponse,
  DatabaseResponse,
  DataSourceResponse,
  ListResponse,
  NotionResponse,
  PageResponse,
  RichTextItemResponse,
  UserResponse,
} from "./types.js";

type NotionJsonObject = Record<string, unknown>;

export type NotionClientOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

export class NotionClientWrapper {
  private notionToken: string;
  private baseUrl: string = "https://api.notion.com/v1";
  private headers: { [key: string]: string };
  private timeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(token: string, options: NotionClientOptions = {}) {
    this.notionToken = token;
    this.headers = {
      Authorization: `Bearer ${this.notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11",
    };
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  private async request<T>(
    path: string,
    init: Omit<RequestInit, "headers" | "signal"> = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          headers: this.headers,
          signal: controller.signal,
        });
        const responseBody = await parseResponseBody(response);

        if (!response.ok) {
          const retryAfterMs = parseRetryAfter(
            response.headers.get("retry-after"),
          );
          const error = new NotionApiError(
            response.status,
            response.statusText,
            responseBody,
            retryAfterMs,
          );

          if (attempt < this.maxRetries && isRetryableStatus(response.status)) {
            await sleep(retryAfterMs ?? this.retryDelayMs);
            continue;
          }

          throw error;
        }

        return responseBody as T;
      } catch (error) {
        if (isAbortError(error)) {
          throw new Error(
            `Notion API request timed out after ${this.timeoutMs}ms`,
          );
        }

        if (!(error instanceof NotionApiError) && attempt < this.maxRetries) {
          await sleep(this.retryDelayMs);
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("Notion API request failed after retries");
  }

  async appendBlockChildren(
    block_id: string,
    children: Partial<BlockResponse>[],
    position?: AppendBlockChildrenPosition,
  ): Promise<BlockResponse> {
    const body: NotionJsonObject = { children };
    if (position) body.position = position;

    return this.request<BlockResponse>(`/blocks/${block_id}/children`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async retrieveBlock(block_id: string): Promise<BlockResponse> {
    return this.request<BlockResponse>(`/blocks/${block_id}`, {
      method: "GET",
    });
  }

  async retrieveBlockChildren(
    block_id: string,
    start_cursor?: string,
    page_size?: number,
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    return this.request<ListResponse>(
      `/blocks/${block_id}/children?${params.toString()}`,
      {
        method: "GET",
      },
    );
  }

  async deleteBlock(block_id: string): Promise<BlockResponse> {
    return this.request<BlockResponse>(`/blocks/${block_id}`, {
      method: "DELETE",
    });
  }

  async updateBlock(
    block_id: string,
    block: Partial<BlockResponse>,
  ): Promise<BlockResponse> {
    return this.request<BlockResponse>(`/blocks/${block_id}`, {
      method: "PATCH",
      body: JSON.stringify(block),
    });
  }

  async retrievePage(page_id: string): Promise<PageResponse> {
    return this.request<PageResponse>(`/pages/${page_id}`, {
      method: "GET",
    });
  }

  async updatePageProperties(
    page_id: string,
    properties: NotionJsonObject,
  ): Promise<PageResponse> {
    const body = { properties };

    return this.request<PageResponse>(`/pages/${page_id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async listAllUsers(
    start_cursor?: string,
    page_size?: number,
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    return this.request<ListResponse>(`/users?${params.toString()}`, {
      method: "GET",
    });
  }

  async retrieveUser(user_id: string): Promise<UserResponse> {
    return this.request<UserResponse>(`/users/${user_id}`, {
      method: "GET",
    });
  }

  async retrieveBotUser(): Promise<UserResponse> {
    return this.request<UserResponse>("/users/me", {
      method: "GET",
    });
  }

  async createDataSource(
    parent: CreateDataSourceArgs["parent"],
    properties: NotionJsonObject,
    title?: RichTextItemResponse[],
  ): Promise<DataSourceResponse> {
    const body = { parent, title, properties };

    return this.request<DataSourceResponse>("/data_sources", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async queryDataSource(
    data_source_id: string,
    filter?: NotionJsonObject,
    sorts?: Array<{
      property?: string;
      timestamp?: string;
      direction: "ascending" | "descending";
    }>,
    start_cursor?: string,
    page_size?: number,
  ): Promise<ListResponse> {
    const body: NotionJsonObject = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    return this.request<ListResponse>(`/data_sources/${data_source_id}/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async retrieveDatabase(database_id: string): Promise<DatabaseResponse> {
    return this.request<DatabaseResponse>(`/databases/${database_id}`, {
      method: "GET",
    });
  }

  async retrieveDataSource(
    data_source_id: string,
  ): Promise<DataSourceResponse> {
    return this.request<DataSourceResponse>(`/data_sources/${data_source_id}`, {
      method: "GET",
    });
  }

  async updateDataSource(
    data_source_id: string,
    title?: RichTextItemResponse[],
    description?: RichTextItemResponse[],
    properties?: NotionJsonObject,
  ): Promise<DataSourceResponse> {
    const body: NotionJsonObject = {};
    if (title) body.title = title;
    if (description) body.description = description;
    if (properties) body.properties = properties;

    return this.request<DataSourceResponse>(`/data_sources/${data_source_id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async createDataSourceItem(
    data_source_id: string,
    properties: NotionJsonObject,
  ): Promise<PageResponse> {
    const body = {
      parent: { type: "data_source_id", data_source_id },
      properties,
    };

    return this.request<PageResponse>("/pages", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async createComment(
    parent?: { page_id: string },
    discussion_id?: string,
    rich_text?: RichTextItemResponse[],
  ): Promise<CommentResponse> {
    const body: NotionJsonObject = { rich_text };
    if (parent) {
      body.parent = parent;
    }
    if (discussion_id) {
      body.discussion_id = discussion_id;
    }

    return this.request<CommentResponse>("/comments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async retrieveComments(
    block_id: string,
    start_cursor?: string,
    page_size?: number,
  ): Promise<ListResponse> {
    const params = new URLSearchParams();
    params.append("block_id", block_id);
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    return this.request<ListResponse>(`/comments?${params.toString()}`, {
      method: "GET",
    });
  }

  async search(
    query?: string,
    filter?: { property: string; value: string },
    sort?: {
      direction: "ascending" | "descending";
      timestamp: "last_edited_time";
    },
    start_cursor?: string,
    page_size?: number,
  ): Promise<ListResponse> {
    const body: NotionJsonObject = {};
    if (query) body.query = query;
    if (filter) body.filter = filter;
    if (sort) body.sort = sort;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    return this.request<ListResponse>("/search", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async toMarkdown(response: NotionResponse): Promise<string> {
    return convertToMarkdown(response);
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) return undefined;

  return Math.max(0, retryDate - Date.now());
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
