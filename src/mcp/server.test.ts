import { describe, expect, test } from "vitest";
import {
  formatJsonToolResult,
  formatToolError,
  getAllPrompts,
  getAllResources,
  getAllTools,
  getServerInstructions,
} from "./server.js";

describe("MCP server helpers", () => {
  test("should expose tool annotations for client planning hints", () => {
    const tools = getAllTools();
    const retrievePage = tools.find(
      (tool) => tool.name === "notion_retrieve_page",
    );
    const readPage = tools.find((tool) => tool.name === "notion_read_page");
    const deleteBlock = tools.find(
      (tool) => tool.name === "notion_delete_block",
    );
    const find = tools.find((tool) => tool.name === "notion_find");
    const queryByValues = tools.find(
      (tool) => tool.name === "notion_query_data_source_by_values",
    );
    const appendContent = tools.find(
      (tool) => tool.name === "notion_append_content",
    );
    const appendMarkdown = tools.find(
      (tool) => tool.name === "notion_append_markdown",
    );
    const updateContent = tools.find(
      (tool) => tool.name === "notion_update_content",
    );
    const updateContentBatch = tools.find(
      (tool) => tool.name === "notion_update_content_batch",
    );
    const createFromValues = tools.find(
      (tool) => tool.name === "notion_create_data_source_item_from_values",
    );
    const openFinderApp = tools.find(
      (tool) => tool.name === "notion_open_finder_app",
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
    expect(appendMarkdown?.annotations).toMatchObject({
      title: "Append Markdown Content",
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(updateContent?.annotations).toMatchObject({
      title: "Update Simple Content",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(updateContentBatch?.annotations).toMatchObject({
      title: "Update Simple Content Batch",
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    });
    expect(createFromValues?.annotations).toMatchObject({
      title: "Create Item From Values",
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(openFinderApp?.annotations).toMatchObject({
      title: "Open Notion Finder",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(openFinderApp?._meta).toMatchObject({
      ui: {
        resourceUri: "ui://notion/finder",
        visibility: ["model", "app"],
      },
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

  test("should provide server instructions for AI workflow guidance", () => {
    expect(getServerInstructions()).toContain(
      "Use high-level Notion tools first",
    );
    expect(getServerInstructions()).toContain("Prefer data_source_id");
  });

  test("should not require dummy arguments for no-argument tools", () => {
    const botUserTool = getAllTools().find(
      (tool) => tool.name === "notion_retrieve_bot_user",
    );

    expect(botUserTool?.inputSchema.required).toBeUndefined();
    expect(botUserTool?.inputSchema.properties).not.toHaveProperty(
      "random_string",
    );
  });

  test("should expose reusable Notion workflow prompts", () => {
    expect(getAllPrompts().map((prompt) => prompt.name)).toEqual([
      "notion_find_target",
      "notion_create_data_source_item_workflow",
      "notion_query_data_source_items_workflow",
      "notion_append_page_content",
    ]);
  });

  test("should expose Notion guidance resources", () => {
    expect(getAllResources().map((resource) => resource.uri)).toEqual([
      "notion://server/guide",
      "notion://server/tools",
      "ui://notion/finder",
      "ui://notion/data-source-explorer",
      "ui://notion/page-workbench",
    ]);
  });

  test("should mark tool errors with isError and structured content", () => {
    const result = formatToolError(
      new Error("Missing required argument: page_id"),
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: { message: "Missing required argument: page_id" },
    });
    expect(result.content[0].type).toBe("text");
  });
});
