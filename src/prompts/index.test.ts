import { describe, expect, test } from "vitest";
import { getNotionPrompt, notionPrompts } from "./index.js";

describe("Notion prompts", () => {
  test("should list reusable workflow prompts", () => {
    expect(notionPrompts.map((prompt) => prompt.name)).toEqual([
      "notion_find_target",
      "notion_create_database_item",
      "notion_query_database_items",
      "notion_append_page_content",
    ]);
  });

  test("should build the create item workflow prompt", () => {
    const prompt = getNotionPrompt("notion_create_database_item", {
      data_source: "Tasks",
      item: "Create a Done task named Ship it",
    });

    expect(prompt.description).toBe("Create a Notion data source item");
    expect(prompt.messages[0].content).toMatchObject({
      type: "text",
      text: expect.stringContaining(
        "Use `notion_create_data_source_item_from_values`"
      ),
    });
  });

  test("should build the query items workflow prompt", () => {
    const prompt = getNotionPrompt("notion_query_database_items", {
      data_source: "Tasks",
      query: "Find done tasks tagged AI",
    });

    expect(prompt.description).toBe("Query Notion data source items");
    expect(prompt.messages[0].content).toMatchObject({
      type: "text",
      text: expect.stringContaining("notion_query_data_source_by_values"),
    });
  });

  test("should reject missing required prompt arguments", () => {
    expect(() => getNotionPrompt("notion_find_target", {})).toThrow(
      "Missing required prompt argument: target"
    );
  });
});
