import { describe, expect, test } from "vitest";
import {
  buildPageReadSummary,
  readPageBlockTree,
} from "./index.js";
import type { BlockResponse, ListResponse, PageResponse } from "../types/index.js";

describe("page read helpers", () => {
  test("should read nested page blocks with stable outline IDs", async () => {
    const fetchBlockChildren = async (
      blockId: string
    ): Promise<ListResponse> => ({
      object: "list",
      next_cursor: null,
      has_more: false,
      results: fixtures[blockId] || [],
    });

    const tree = await readPageBlockTree(fetchBlockChildren, "page123", {
      max_depth: 2,
      max_blocks: 10,
    });
    const summary = buildPageReadSummary(page, tree, {
      content_format: "markdown",
      max_depth: 2,
      include_properties: true,
    });

    expect(summary).toMatchObject({
      object: "notion_page_read",
      page: {
        id: "page123",
        title: "Roadmap",
        properties: [
          { name: "Name", id: "title", type: "title", value: "Roadmap" },
        ],
      },
      content: {
        format: "markdown",
        block_count: 3,
        truncated: false,
      },
      editing_hint: {
        append_tool: "notion_append_content",
        parent_block_id: "page123",
      },
    });
    expect(summary.content.outline[1]).toMatchObject({
      id: "todo1",
      type: "to_do",
      text: "Ship MCP refresh",
      children: [
        {
          id: "para2",
          type: "paragraph",
          text: "Check Notion API 2026 behavior",
        },
      ],
    });
    expect(summary.content.markdown).toContain("# Plan");
    expect(summary.content.markdown).toContain("- [ ] Ship MCP refresh");
  });

  test("should mark content as truncated when max_blocks is reached", async () => {
    const fetchBlockChildren = async (): Promise<ListResponse> => ({
      object: "list",
      next_cursor: "next",
      has_more: true,
      results: [heading, todo],
    });

    const tree = await readPageBlockTree(fetchBlockChildren, "page123", {
      max_depth: 1,
      max_blocks: 1,
    });

    expect(tree).toEqual({
      blocks: [
        {
          id: "heading1",
          type: "heading_1",
          text: "Plan",
          has_children: false,
          in_trash: false,
        },
      ],
      block_count: 1,
      truncated: true,
    });
  });

});

const page: PageResponse = {
  object: "page",
  id: "page123",
  created_time: "2026-01-01T00:00:00.000Z",
  last_edited_time: "2026-01-02T00:00:00.000Z",
  parent: { type: "workspace" },
  properties: {
    Name: {
      id: "title",
      type: "title",
      title: [{ type: "text", text: { content: "Roadmap" } }],
    },
  },
  url: "https://notion.so/page123",
};

const heading: BlockResponse = {
  object: "block",
  id: "heading1",
  type: "heading_1",
  created_time: "2026-01-01T00:00:00.000Z",
  last_edited_time: "2026-01-01T00:00:00.000Z",
  has_children: false,
  in_trash: false,
  heading_1: {
    rich_text: [{ type: "text", text: { content: "Plan" } }],
  },
};

const todo: BlockResponse = {
  object: "block",
  id: "todo1",
  type: "to_do",
  created_time: "2026-01-01T00:00:00.000Z",
  last_edited_time: "2026-01-01T00:00:00.000Z",
  has_children: true,
  in_trash: false,
  to_do: {
    rich_text: [{ type: "text", text: { content: "Ship MCP refresh" } }],
    checked: false,
  },
};

const nestedParagraph: BlockResponse = {
  object: "block",
  id: "para2",
  type: "paragraph",
  created_time: "2026-01-01T00:00:00.000Z",
  last_edited_time: "2026-01-01T00:00:00.000Z",
  has_children: false,
  in_trash: false,
  paragraph: {
    rich_text: [
      { type: "text", text: { content: "Check Notion API 2026 behavior" } },
    ],
  },
};

const fixtures: Record<string, BlockResponse[]> = {
  page123: [heading, todo],
  todo1: [nestedParagraph],
};
