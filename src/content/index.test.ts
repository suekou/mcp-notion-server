import { describe, expect, test } from "vitest";
import {
  buildBlocksFromSimpleContent,
  buildBlockUpdateFromSimpleContent,
  parseMarkdownToSimpleContent,
  validateSimpleContentUpdatesAgainstBlocks,
} from "./index.js";
import type { BlockResponse } from "../types/index.js";

describe("content block builder", () => {
  test("should build common Notion blocks from simple content", () => {
    expect(
      buildBlocksFromSimpleContent([
        { type: "heading_2", text: "Plan" },
        { type: "paragraph", text: "Ship the update." },
        { type: "to_do", text: "Write tests", checked: true },
        { type: "code", text: "console.log('ok')", language: "javascript" },
        { type: "divider" },
      ])
    ).toEqual([
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "Plan" },
              plain_text: "Plan",
            },
          ],
          is_toggleable: false,
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Ship the update." },
              plain_text: "Ship the update.",
            },
          ],
        },
      },
      {
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: "Write tests" },
              plain_text: "Write tests",
            },
          ],
          checked: true,
        },
      },
      {
        object: "block",
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: { content: "console.log('ok')" },
              plain_text: "console.log('ok')",
            },
          ],
          language: "javascript",
        },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
    ]);
  });

  test("should build update payloads without raw block wrappers", () => {
    expect(
      buildBlockUpdateFromSimpleContent({
        type: "paragraph",
        text: "Updated text",
      })
    ).toEqual({
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Updated text" },
            plain_text: "Updated text",
          },
        ],
      },
    });
  });

  test("should reject divider updates because they have no editable content", () => {
    expect(() =>
      buildBlockUpdateFromSimpleContent({ type: "divider" })
    ).toThrow("Divider blocks do not have editable content");
  });

  test("should validate batch updates before applying them", () => {
    expect(() =>
      validateSimpleContentUpdatesAgainstBlocks(
        [
          { block_id: "block-a", item: { type: "paragraph", text: "A" } },
          { block_id: "block-b", item: { type: "to_do", text: "B" } },
        ],
        [
          block("block-a", "paragraph"),
          block("block-b", "to_do"),
        ]
      )
    ).not.toThrow();
  });

  test("should reject batch updates with a mismatched block type", () => {
    expect(() =>
      validateSimpleContentUpdatesAgainstBlocks(
        [{ block_id: "block-a", item: { type: "paragraph", text: "A" } }],
        [block("block-a", "heading_2")]
      )
    ).toThrow(
      "Block type mismatch: block block-a is heading_2, but item.type was paragraph"
    );
  });

  test("should parse common Markdown into simple content items", () => {
    expect(
      parseMarkdownToSimpleContent(
        [
          "# Title",
          "",
          "First paragraph",
          "continues here.",
          "",
          "- Bullet",
          "1. Ordered",
          "- [x] Done",
          "- [ ] Todo",
          "> Quote",
          "---",
          "```ts",
          "const ok = true;",
          "```",
        ].join("\n")
      )
    ).toEqual([
      { type: "heading_1", text: "Title" },
      { type: "paragraph", text: "First paragraph continues here." },
      { type: "bulleted_list_item", text: "Bullet" },
      { type: "numbered_list_item", text: "Ordered" },
      { type: "to_do", text: "Done", checked: true },
      { type: "to_do", text: "Todo", checked: false },
      { type: "quote", text: "Quote" },
      { type: "divider" },
      { type: "code", text: "const ok = true;", language: "ts" },
    ]);
  });
});

function block(id: string, type: string): BlockResponse {
  return {
    object: "block",
    id,
    type,
    created_time: "2026-01-01T00:00:00.000Z",
    last_edited_time: "2026-01-01T00:00:00.000Z",
  };
}
