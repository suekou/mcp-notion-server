import { describe, expect, test } from "vitest";
import { readNotionAppResource } from "../apps/index.js";
import { notionResources, readNotionResource } from "./index.js";

describe("Notion resources", () => {
  test("should list static guidance resources", () => {
    expect(notionResources.map((resource) => resource.uri)).toEqual([
      "notion://server/guide",
      "notion://server/tools",
    ]);
  });

  test("should read the workflow guide resource", () => {
    const result = readNotionResource("notion://server/guide");

    expect(result.contents[0]).toMatchObject({
      uri: "notion://server/guide",
      mimeType: "text/markdown",
      text: expect.stringContaining("notion_find"),
    });
  });

  test("should reject unknown resource URIs", () => {
    expect(() => readNotionResource("notion://server/missing")).toThrow(
      "Unknown resource URI",
    );
  });

  test("should read MCP App HTML resources", () => {
    const result = readNotionAppResource("ui://notion/data-source-explorer");

    expect(result.contents[0]).toMatchObject({
      uri: "ui://notion/data-source-explorer",
      mimeType: "text/html;profile=mcp-app",
      text: expect.stringContaining("notion_query_data_source_by_values"),
    });
  });
});
