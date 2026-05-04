import { describe, expect, test } from "vitest";
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
});
