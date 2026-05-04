import { beforeEach, describe, expect, test, vi } from "vitest";
import { type NotionApiError, NotionClientWrapper } from "./client/index.js";
import type { PageResponse, RichTextItemResponse } from "./types/index.js";
import { filterTools } from "./utils/index.js";

vi.mock("./markdown/index.js", () => ({
  convertToMarkdown: vi.fn().mockReturnValue("# Test"),
}));

const fetchMock = vi.fn();
const expectedHeaders = {
  Authorization: "Bearer test-token",
  "Content-Type": "application/json",
  "Notion-Version": "2026-03-11",
};

function mockResponse(
  body: unknown = { success: true },
  init: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? "OK",
    headers: new Headers(init.headers),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

// Mock tool list
const mockInputSchema = { type: "object" as const };
const mockTools = [
  {
    name: "notion_retrieve_block",
    inputSchema: mockInputSchema,
  },
  {
    name: "notion_retrieve_page",
    inputSchema: mockInputSchema,
  },
  {
    name: "notion_query_data_source",
    inputSchema: mockInputSchema,
  },
];

describe("NotionClientWrapper", () => {
  let wrapper: NotionClientWrapper;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create client wrapper with test token
    wrapper = new NotionClientWrapper("test-token");

    fetchMock.mockResolvedValue(mockResponse());
    vi.stubGlobal("fetch", fetchMock);
  });

  test("should send correct headers", async () => {
    await wrapper.retrieveBotUser();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/users/me",
      expect.objectContaining({
        method: "GET",
        headers: expectedHeaders,
      }),
    );
  });

  test("should call appendBlockChildren with correct parameters", async () => {
    const blockId = "block123";
    const children = [{ type: "paragraph" }];
    const position = {
      type: "after_block",
      after_block: { id: "previous-block" },
    } as const;

    await wrapper.appendBlockChildren(blockId, children, position);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children`,
      expect.objectContaining({
        method: "PATCH",
        headers: expectedHeaders,
        body: JSON.stringify({ children, position }),
      }),
    );
  });

  test("should call retrieveBlock with correct parameters", async () => {
    const blockId = "block123";

    await wrapper.retrieveBlock(blockId);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}`,
      expect.objectContaining({
        method: "GET",
        headers: expectedHeaders,
      }),
    );
  });

  test("should call retrieveBlockChildren with pagination parameters", async () => {
    const blockId = "block123";
    const startCursor = "cursor123";
    const pageSize = 10;

    await wrapper.retrieveBlockChildren(blockId, startCursor, pageSize);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children?start_cursor=${startCursor}&page_size=${pageSize}`,
      expect.objectContaining({
        method: "GET",
        headers: expectedHeaders,
      }),
    );
  });

  test("should call retrievePage with correct parameters", async () => {
    const pageId = "page123";

    await wrapper.retrievePage(pageId);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      expect.objectContaining({
        method: "GET",
        headers: expectedHeaders,
      }),
    );
  });

  test("should call updatePageProperties with correct parameters", async () => {
    const pageId = "page123";
    const properties = {
      title: { title: [{ text: { content: "New Title" } }] },
    };

    await wrapper.updatePageProperties(pageId, properties);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expectedHeaders,
        body: JSON.stringify({ properties }),
      }),
    );
  });

  test("should call queryDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const filter = { property: "Status", equals: "Done" };
    const sorts: Array<{
      property: string;
      direction: "ascending" | "descending";
    }> = [{ property: "Due Date", direction: "ascending" }];

    await wrapper.queryDataSource(dataSourceId, filter, sorts);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      expect.objectContaining({
        method: "POST",
        headers: expectedHeaders,
        body: JSON.stringify({ filter, sorts }),
      }),
    );
  });

  test("should call createDataSource with correct parameters", async () => {
    const parent = { type: "page_id", page_id: "page123" };
    const properties = { Name: { title: {} } };
    const title: RichTextItemResponse[] = [
      { type: "text", text: { content: "Tasks" } },
    ];

    await wrapper.createDataSource(parent, properties, title);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/data_sources",
      expect.objectContaining({
        method: "POST",
        headers: expectedHeaders,
        body: JSON.stringify({ parent, title, properties }),
      }),
    );
  });

  test("should call retrieveDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";

    await wrapper.retrieveDataSource(dataSourceId);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      expect.objectContaining({
        method: "GET",
        headers: expectedHeaders,
      }),
    );
  });

  test("should call updateDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = { Status: { status: {} } };

    await wrapper.updateDataSource(
      dataSourceId,
      undefined,
      undefined,
      properties,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      expect.objectContaining({
        method: "PATCH",
        headers: expectedHeaders,
        body: JSON.stringify({ properties }),
      }),
    );
  });

  test("should call createDataSourceItem with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = { Name: { title: [{ text: { content: "Task" } }] } };

    await wrapper.createDataSourceItem(dataSourceId, properties);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/pages",
      expect.objectContaining({
        method: "POST",
        headers: expectedHeaders,
        body: JSON.stringify({
          parent: { type: "data_source_id", data_source_id: dataSourceId },
          properties,
        }),
      }),
    );
  });

  test("should call search with correct parameters", async () => {
    const query = "test query";
    const filter = { property: "object", value: "page" };

    await wrapper.search(query, filter);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.notion.com/v1/search",
      expect.objectContaining({
        method: "POST",
        headers: expectedHeaders,
        body: JSON.stringify({ query, filter }),
      }),
    );
  });

  test("should throw NotionApiError with Notion error details", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        {
          object: "error",
          status: 400,
          code: "validation_error",
          message: "Invalid filter",
        },
        { status: 400, statusText: "Bad Request" },
      ),
    );

    await expect(wrapper.retrievePage("page123")).rejects.toMatchObject({
      name: "NotionApiError",
      status: 400,
      code: "validation_error",
    } satisfies Partial<NotionApiError>);
  });

  test("should retry rate-limited requests", async () => {
    wrapper = new NotionClientWrapper("test-token", { retryDelayMs: 0 });
    fetchMock
      .mockResolvedValueOnce(
        mockResponse(
          {
            object: "error",
            status: 429,
            code: "rate_limited",
            message: "Rate limited",
          },
          {
            status: 429,
            statusText: "Too Many Requests",
            headers: { "retry-after": "0" },
          },
        ),
      )
      .mockResolvedValueOnce(mockResponse({ object: "page", id: "page123" }));

    const response = await wrapper.retrievePage("page123");

    expect(response).toMatchObject({ object: "page", id: "page123" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("should time out stalled requests", async () => {
    wrapper = new NotionClientWrapper("test-token", {
      timeoutMs: 1,
      maxRetries: 0,
    });
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });

    await expect(wrapper.retrievePage("page123")).rejects.toThrow(
      "Notion API request timed out after 1ms",
    );
  });

  test("should call toMarkdown method correctly", async () => {
    const { convertToMarkdown } = await import("./markdown/index.js");

    const response: PageResponse = {
      object: "page",
      id: "test",
      created_time: "2021-01-01T00:00:00.000Z",
      last_edited_time: "2021-01-01T00:00:00.000Z",
      parent: {
        type: "workspace",
      },
      properties: {},
    };
    await wrapper.toMarkdown(response);

    expect(convertToMarkdown).toHaveBeenCalledWith(response);
  });

  describe("filterTools", () => {
    test("should return all tools when no filter specified", () => {
      const result = filterTools(mockTools);
      expect(result).toEqual(mockTools);
    });

    test("should filter tools based on enabledTools", () => {
      const enabledToolsSet = new Set([
        "notion_retrieve_block",
        "notion_query_data_source",
      ]);
      const result = filterTools(mockTools, enabledToolsSet);
      expect(result).toEqual([
        { name: "notion_retrieve_block", inputSchema: mockInputSchema },
        { name: "notion_query_data_source", inputSchema: mockInputSchema },
      ]);
    });

    test("should return empty array when no tools match", () => {
      const enabledToolsSet = new Set(["non_existent_tool"]);
      const result = filterTools(mockTools, enabledToolsSet);
      expect(result).toEqual([]);
    });
  });
});
