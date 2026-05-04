import type { BlockResponse, RichTextItemResponse } from "../types/index.js";

export type SimpleContentItem =
  | {
      type: "paragraph" | "quote" | "callout";
      text: string;
    }
  | {
      type: "heading_1" | "heading_2" | "heading_3";
      text: string;
      is_toggleable?: boolean;
    }
  | {
      type: "bulleted_list_item" | "numbered_list_item";
      text: string;
    }
  | {
      type: "to_do";
      text: string;
      checked?: boolean;
    }
  | {
      type: "code";
      text: string;
      language?: string;
    }
  | {
      type: "divider";
    };

export function buildBlocksFromSimpleContent(
  items: SimpleContentItem[]
): Partial<BlockResponse>[] {
  return items.map((item) => buildBlockFromSimpleContent(item));
}

function buildBlockFromSimpleContent(
  item: SimpleContentItem
): Partial<BlockResponse> {
  switch (item.type) {
    case "paragraph":
    case "quote":
    case "bulleted_list_item":
    case "numbered_list_item":
      return richTextBlock(item.type, item.text);
    case "heading_1":
    case "heading_2":
    case "heading_3":
      return {
        object: "block",
        type: item.type,
        [item.type]: {
          rich_text: textToRichText(item.text),
          is_toggleable: item.is_toggleable ?? false,
        },
      };
    case "to_do":
      return {
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: textToRichText(item.text),
          checked: item.checked ?? false,
        },
      };
    case "callout":
      return {
        object: "block",
        type: "callout",
        callout: {
          rich_text: textToRichText(item.text),
        },
      };
    case "code":
      return {
        object: "block",
        type: "code",
        code: {
          rich_text: textToRichText(item.text),
          language: item.language || "plain text",
        },
      };
    case "divider":
      return {
        object: "block",
        type: "divider",
        divider: {},
      };
  }
}

function richTextBlock(
  type: "paragraph" | "quote" | "bulleted_list_item" | "numbered_list_item",
  text: string
): Partial<BlockResponse> {
  return {
    object: "block",
    type,
    [type]: {
      rich_text: textToRichText(text),
    },
  };
}

function textToRichText(text: string): RichTextItemResponse[] {
  return [
    {
      type: "text",
      text: {
        content: text,
      },
      plain_text: text,
    },
  ];
}
