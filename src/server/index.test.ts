import { describe, expect, test } from "vitest";
import {
  formatJsonToolResult,
  formatToolError,
  getAllPrompts,
  getAllResources,
  getAllTools,
} from "./index.js";

describe("MCP server helpers", () => {
  test("should expose tool annotations for client planning hints", () => {
    const tools = getAllTools();
    const retrievePage = tools.find((tool) => tool.name === "notion_retrieve_page");
    const readPage = tools.find((tool) => tool.name === "notion_read_page");
    const deleteBlock = tools.find((tool) => tool.name === "notion_delete_block");
    const find = tools.find((tool) => tool.name === "notion_find");
    const queryByValues = tools.find(
      (tool) => tool.name === "notion_query_data_source_by_values"
    );
    const appendContent = tools.find(
      (tool) => tool.name === "notion_append_content"
    );
    const updateContent = tools.find(
      (tool) => tool.name === "notion_update_content"
    );
    const createFromValues = tools.find(
      (tool) => tool.name === "notion_create_data_source_item_from_values"
    );

    expect(retrievePage?.annotations).toMatchObject({
      title: "Retrieve Page",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(readPage?.annotations).toMatchObject({
      title: "Read Page Content",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(deleteBlock?.annotations).toMatchObject({
      title: "Delete Block",
      readOnlyHint: false,
      destructiveHint: true,
    });
    expect(find?.annotations).toMatchObject({
      title: "Find Notion Targets",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(queryByValues?.annotations).toMatchObject({
      title: "Query Data Source By Values",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(appendContent?.annotations).toMatchObject({
      title: "Append Simple Content",
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(updateContent?.annotations).toMatchObject({
      title: "Update Simple Content",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(createFromValues?.annotations).toMatchObject({
      title: "Create Item From Values",
      readOnlyHint: false,
      destructiveHint: false,
    });
  });

  test("should include structured content for JSON tool results", () => {
    const response = { object: "page", id: "page123" };
    const result = formatJsonToolResult(response);

    expect(result.structuredContent).toEqual(response);
    expect(result.content[0]).toEqual({
      type: "text",
      text: JSON.stringify(response, null, 2),
    });
  });

  test("should expose reusable Notion workflow prompts", () => {
    expect(getAllPrompts().map((prompt) => prompt.name)).toEqual([
      "notion_find_target",
      "notion_create_database_item",
      "notion_query_database_items",
      "notion_append_page_content",
    ]);
  });

  test("should expose Notion guidance resources", () => {
    expect(getAllResources().map((resource) => resource.uri)).toEqual([
      "notion://server/guide",
      "notion://server/tools",
    ]);
  });

  test("should mark tool errors with isError and structured content", () => {
    const result = formatToolError(new Error("Missing required argument: page_id"));

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: { message: "Missing required argument: page_id" },
    });
    expect(result.content[0].type).toBe("text");
  });
});
