import { describe, expect, test } from "vitest";
import {
  formatJsonToolResult,
  formatToolError,
  getAllTools,
} from "./index.js";

describe("MCP server helpers", () => {
  test("should expose tool annotations for client planning hints", () => {
    const tools = getAllTools();
    const retrievePage = tools.find((tool) => tool.name === "notion_retrieve_page");
    const deleteBlock = tools.find((tool) => tool.name === "notion_delete_block");

    expect(retrievePage?.annotations).toMatchObject({
      title: "Retrieve Page",
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(deleteBlock?.annotations).toMatchObject({
      title: "Delete Block",
      readOnlyHint: false,
      destructiveHint: true,
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

  test("should mark tool errors with isError and structured content", () => {
    const result = formatToolError(new Error("Missing required argument: page_id"));

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: { message: "Missing required argument: page_id" },
    });
    expect(result.content[0].type).toBe("text");
  });
});
