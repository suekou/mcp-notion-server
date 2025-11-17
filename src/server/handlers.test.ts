import { expect, test, describe, vi, beforeEach } from "vitest";
import { NotionClientWrapper } from "../client/index.js";
import type * as args from "../types/args.js";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

describe("Server Handlers for New Endpoints", () => {
  let notionClient: NotionClientWrapper;
  let mockFetch: any;

  beforeEach(async () => {
    vi.resetAllMocks();
    const fetch = await import("node-fetch");
    mockFetch = fetch.default as any;
    notionClient = new NotionClientWrapper("test-token");
  });

  describe("notion_create_page", () => {
    test("should create page in database with properties", async () => {
      const mockResponse = {
        object: "page",
        id: "new-page-id",
        created_time: "2025-01-14T00:00:00.000Z",
        last_edited_time: "2025-01-14T00:00:00.000Z",
        parent: { database_id: "db123" },
        properties: {
          Name: {
            id: "title",
            type: "title",
            title: [{ text: { content: "New Page" } }],
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.CreatePageArgs = {
        parent: { database_id: "db123" },
        properties: {
          Name: { title: [{ text: { content: "New Page" } }] },
        },
      };

      const result = await notionClient.createPage(
        testArgs.parent,
        testArgs.properties
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            parent: testArgs.parent,
            properties: testArgs.properties,
          }),
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.id).toBe("new-page-id");
      expect(result.parent).toHaveProperty("database_id", "db123");
    });

    test("should create page as child of another page", async () => {
      const mockResponse = {
        object: "page",
        id: "child-page-id",
        created_time: "2025-01-14T00:00:00.000Z",
        last_edited_time: "2025-01-14T00:00:00.000Z",
        parent: { page_id: "parent-page-id" },
        properties: {
          title: {
            id: "title",
            type: "title",
            title: [{ text: { content: "Child Page" } }],
          },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.CreatePageArgs = {
        parent: { page_id: "parent-page-id" },
        properties: {
          title: { title: [{ text: { content: "Child Page" } }] },
        },
      };

      const result = await notionClient.createPage(
        testArgs.parent,
        testArgs.properties
      );

      expect(result.parent).toHaveProperty("page_id", "parent-page-id");
      expect(result.id).toBe("child-page-id");
    });

    test("should create page with initial children blocks", async () => {
      const mockResponse = {
        object: "page",
        id: "page-with-children",
        created_time: "2025-01-14T00:00:00.000Z",
        last_edited_time: "2025-01-14T00:00:00.000Z",
        parent: { database_id: "db123" },
        properties: {
          Name: { title: [{ text: { content: "Page with Content" } }] },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.CreatePageArgs = {
        parent: { database_id: "db123" },
        properties: {
          Name: { title: [{ text: { content: "Page with Content" } }] },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ text: { content: "Initial paragraph" } }],
            },
          },
          {
            object: "block",
            type: "heading_1",
            heading_1: {
              rich_text: [{ text: { content: "Heading" } }],
            },
          },
        ],
      };

      const result = await notionClient.createPage(
        testArgs.parent,
        testArgs.properties,
        testArgs.children
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            parent: testArgs.parent,
            properties: testArgs.properties,
            children: testArgs.children,
          }),
        })
      );

      expect(result.id).toBe("page-with-children");
    });

    test("should create workspace page", async () => {
      const mockResponse = {
        object: "page",
        id: "workspace-page-id",
        created_time: "2025-01-14T00:00:00.000Z",
        last_edited_time: "2025-01-14T00:00:00.000Z",
        parent: { type: "workspace", workspace: true },
        properties: {
          title: { title: [{ text: { content: "Workspace Page" } }] },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.CreatePageArgs = {
        parent: { workspace: true },
        properties: {
          title: { title: [{ text: { content: "Workspace Page" } }] },
        },
      };

      const result = await notionClient.createPage(
        testArgs.parent,
        testArgs.properties
      );

      expect(result.parent).toHaveProperty("workspace", true);
    });
  });

  describe("notion_retrieve_page_property_item", () => {
    test("should retrieve property item without pagination", async () => {
      const mockResponse = {
        object: "property_item",
        id: "prop123",
        type: "relation",
        relation: [
          { id: "related-page-1" },
          { id: "related-page-2" },
          { id: "related-page-3" },
        ],
        has_more: false,
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.RetrievePagePropertyItemArgs = {
        page_id: "page123",
        property_id: "prop123",
      };

      const result = await notionClient.retrievePagePropertyItem(
        testArgs.page_id,
        testArgs.property_id
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.notion.com/v1/pages/page123/properties/prop123`,
        expect.objectContaining({
          method: "GET",
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.relation).toHaveLength(3);
      expect(result.has_more).toBe(false);
    });

    test("should retrieve property item with pagination", async () => {
      const mockResponse = {
        object: "property_item",
        id: "prop123",
        type: "relation",
        relation: [
          { id: "related-page-26" },
          { id: "related-page-27" },
          { id: "related-page-28" },
        ],
        has_more: true,
        next_cursor: "next-cursor-abc",
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.RetrievePagePropertyItemArgs = {
        page_id: "page123",
        property_id: "prop123",
        start_cursor: "cursor-xyz",
        page_size: 25,
      };

      const result = await notionClient.retrievePagePropertyItem(
        testArgs.page_id,
        testArgs.property_id,
        testArgs.start_cursor,
        testArgs.page_size
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.notion.com/v1/pages/page123/properties/prop123?start_cursor=cursor-xyz&page_size=25`,
        expect.objectContaining({
          method: "GET",
        })
      );

      expect(result.has_more).toBe(true);
      expect(result.next_cursor).toBe("next-cursor-abc");
    });

    test("should handle rollup properties with many values", async () => {
      const mockResponse = {
        object: "property_item",
        id: "rollup-prop",
        type: "rollup",
        rollup: {
          type: "array",
          array: [
            { type: "number", number: 100 },
            { type: "number", number: 200 },
            { type: "number", number: 300 },
          ],
        },
        has_more: false,
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await notionClient.retrievePagePropertyItem(
        "page123",
        "rollup-prop"
      );

      expect(result.rollup.array).toHaveLength(3);
      expect(result.rollup.array[0].number).toBe(100);
    });
  });

  describe("notion_update_page_properties with archived", () => {
    test("should update page properties without archiving", async () => {
      const mockResponse = {
        object: "page",
        id: "page123",
        archived: false,
        properties: {
          Name: { title: [{ text: { content: "Updated Title" } }] },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.UpdatePagePropertiesArgs = {
        page_id: "page123",
        properties: {
          Name: { title: [{ text: { content: "Updated Title" } }] },
        },
      };

      const result = await notionClient.updatePageProperties(
        testArgs.page_id,
        testArgs.properties
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages/page123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            properties: testArgs.properties,
          }),
        })
      );

      expect(result.archived).toBe(false);
    });

    test("should archive page (move to trash)", async () => {
      const mockResponse = {
        object: "page",
        id: "page123",
        archived: true,
        properties: {
          Name: { title: [{ text: { content: "Archived Page" } }] },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.UpdatePagePropertiesArgs = {
        page_id: "page123",
        properties: {
          Name: { title: [{ text: { content: "Archived Page" } }] },
        },
        archived: true,
      };

      const result = await notionClient.updatePageProperties(
        testArgs.page_id,
        testArgs.properties,
        testArgs.archived
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages/page123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            properties: testArgs.properties,
            archived: true,
          }),
        })
      );

      expect(result.archived).toBe(true);
    });

    test("should restore archived page", async () => {
      const mockResponse = {
        object: "page",
        id: "page123",
        archived: false,
        properties: {
          Name: { title: [{ text: { content: "Restored Page" } }] },
        },
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const testArgs: args.UpdatePagePropertiesArgs = {
        page_id: "page123",
        properties: {
          Name: { title: [{ text: { content: "Restored Page" } }] },
        },
        archived: false,
      };

      const result = await notionClient.updatePageProperties(
        testArgs.page_id,
        testArgs.properties,
        testArgs.archived
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages/page123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            properties: testArgs.properties,
            archived: false,
          }),
        })
      );

      expect(result.archived).toBe(false);
    });

    test("should archive without updating properties", async () => {
      const mockResponse = {
        object: "page",
        id: "page123",
        archived: true,
        properties: {},
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await notionClient.updatePageProperties(
        "page123",
        {},
        true
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.notion.com/v1/pages/page123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            properties: {},
            archived: true,
          }),
        })
      );

      expect(result.archived).toBe(true);
    });
  });

  describe("Data flow verification", () => {
    test("should properly serialize and deserialize complex page creation", async () => {
      const complexPageData = {
        parent: { database_id: "db-complex" },
        properties: {
          Name: {
            title: [
              { text: { content: "Complex" } },
              { text: { content: " Page" } },
            ],
          },
          Status: {
            select: { name: "In Progress" },
          },
          Tags: {
            multi_select: [{ name: "Important" }, { name: "Urgent" }],
          },
          DueDate: {
            date: { start: "2025-12-31" },
          },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                { text: { content: "This is " } },
                {
                  text: { content: "bold text" },
                  annotations: { bold: true },
                },
              ],
            },
          },
          {
            object: "block",
            type: "to_do",
            to_do: {
              rich_text: [{ text: { content: "Task 1" } }],
              checked: false,
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ...complexPageData, id: "new-page" }),
      });

      const result = await notionClient.createPage(
        complexPageData.parent,
        complexPageData.properties,
        complexPageData.children as any
      );

      const fetchCall = mockFetch.mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1].body);

      expect(sentBody.properties.Name.title).toHaveLength(2);
      expect(sentBody.properties.Tags.multi_select).toHaveLength(2);
      expect(sentBody.children).toHaveLength(2);
      expect(sentBody.children[0].paragraph.rich_text[1].annotations.bold).toBe(
        true
      );

      expect(result.id).toBe("new-page");
    });
  });
});
