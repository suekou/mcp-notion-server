import { expect, test, describe, vi, beforeEach } from "vitest";
import { NotionClientWrapper } from "./client/index.js";
import { PageResponse } from "./types/index.js";
import { filterTools } from "./utils/index.js";
import fetch from "node-fetch";

vi.mock("./markdown/index.js", () => ({
  convertToMarkdown: vi.fn().mockReturnValue("# Test"),
}));

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

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
  let wrapper: any;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create client wrapper with test token
    wrapper = new NotionClientWrapper("test-token");

    // Mock fetch to return JSON
    (fetch as any).mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      })
    );
  });

  test("should initialize with correct headers", () => {
    expect((wrapper as any).headers).toEqual({
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11",
    });
  });

  test("should call appendBlockChildren with correct parameters", async () => {
    const blockId = "block123";
    const children = [{ type: "paragraph" }];
    const position = {
      type: "after_block",
      after_block: { id: "previous-block" },
    };

    await wrapper.appendBlockChildren(blockId, children, position);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ children, position }),
      }
    );
  });

  test("should call retrieveBlock with correct parameters", async () => {
    const blockId = "block123";

    await wrapper.retrieveBlock(blockId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call retrieveBlockChildren with pagination parameters", async () => {
    const blockId = "block123";
    const startCursor = "cursor123";
    const pageSize = 10;

    await wrapper.retrieveBlockChildren(blockId, startCursor, pageSize);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/blocks/${blockId}/children?start_cursor=${startCursor}&page_size=${pageSize}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call retrievePage with correct parameters", async () => {
    const pageId = "page123";

    await wrapper.retrievePage(pageId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call updatePageProperties with correct parameters", async () => {
    const pageId = "page123";
    const properties = {
      title: { title: [{ text: { content: "New Title" } }] },
    };

    await wrapper.updatePageProperties(pageId, properties);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/pages/${pageId}`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ properties }),
      }
    );
  });

  test("should call queryDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const filter = { property: "Status", equals: "Done" };
    const sorts = [{ property: "Due Date", direction: "ascending" }];

    await wrapper.queryDataSource(dataSourceId, filter, sorts);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ filter, sorts }),
      }
    );
  });

  test("should call createDataSource with correct parameters", async () => {
    const parent = { type: "page_id", page_id: "page123" };
    const properties = { Name: { title: {} } };
    const title = [{ type: "text", text: { content: "Tasks" } }];

    await wrapper.createDataSource(parent, properties, title);

    expect(fetch).toHaveBeenCalledWith("https://api.notion.com/v1/data_sources", {
      method: "POST",
      headers: (wrapper as any).headers,
      body: JSON.stringify({ parent, title, properties }),
    });
  });

  test("should call retrieveDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";

    await wrapper.retrieveDataSource(dataSourceId);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      {
        method: "GET",
        headers: (wrapper as any).headers,
      }
    );
  });

  test("should call updateDataSource with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = { Status: { status: {} } };

    await wrapper.updateDataSource(dataSourceId, undefined, undefined, properties);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.notion.com/v1/data_sources/${dataSourceId}`,
      {
        method: "PATCH",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ properties }),
      }
    );
  });

  test("should call createDataSourceItem with correct parameters", async () => {
    const dataSourceId = "ds123";
    const properties = { Name: { title: [{ text: { content: "Task" } }] } };

    await wrapper.createDataSourceItem(dataSourceId, properties);

    expect(fetch).toHaveBeenCalledWith("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: (wrapper as any).headers,
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        properties,
      }),
    });
  });

  test("should call search with correct parameters", async () => {
    const query = "test query";
    const filter = { property: "object", value: "page" };

    await wrapper.search(query, filter);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/search",
      {
        method: "POST",
        headers: (wrapper as any).headers,
        body: JSON.stringify({ query, filter }),
      }
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
