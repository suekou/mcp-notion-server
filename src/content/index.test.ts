import { describe, expect, test } from "vitest";
import {
  buildBlocksFromSimpleContent,
  buildBlockUpdateFromSimpleContent,
} from "./index.js";

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
});
