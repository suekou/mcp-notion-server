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

export type SimpleEditableContentItem = Exclude<
  SimpleContentItem,
  { type: "divider" }
>;

export type SimpleContentUpdate = {
  block_id: string;
  item: SimpleEditableContentItem;
};

const SIMPLE_CONTENT_TYPES = [
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "callout",
  "code",
  "divider",
] as const;

const EDITABLE_SIMPLE_CONTENT_TYPES = SIMPLE_CONTENT_TYPES.filter(
  (type) => type !== "divider",
);
type SimpleContentType = (typeof SIMPLE_CONTENT_TYPES)[number];

export function validateAppendPosition(position: unknown): void {
  if (position === undefined) return;
  if (!isRecord(position)) {
    throw new Error(
      "position must be an object: { type: 'start' }, { type: 'end' }, or { type: 'after_block', after_block: { id } }.",
    );
  }

  if (position.type === "start" || position.type === "end") return;

  if (position.type === "after_block") {
    if (
      !isRecord(position.after_block) ||
      typeof position.after_block.id !== "string"
    ) {
      throw new Error(
        "position.after_block.id must be a block ID string when position.type is 'after_block'.",
      );
    }
    return;
  }

  throw new Error("position.type must be one of: start, end, after_block.");
}

export function validateSimpleContentItems(
  items: unknown,
): asserts items is SimpleContentItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array of simple content items.");
  }

  items.forEach((item, index) => {
    validateSimpleContentItem(item, `items[${index}]`);
  });
}

export function validateSimpleEditableContentItem(
  item: unknown,
): asserts item is SimpleEditableContentItem {
  validateSimpleContentItem(item, "item", true);
}

export function validateSimpleContentUpdates(
  updates: unknown,
): asserts updates is SimpleContentUpdate[] {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error(
      "updates must be a non-empty array of simple content updates.",
    );
  }

  updates.forEach((update, index) => {
    const path = `updates[${index}]`;
    if (!isRecord(update)) {
      throw new Error(`${path} must be an object with block_id and item.`);
    }
    if (typeof update.block_id !== "string" || update.block_id.length === 0) {
      throw new Error(`${path}.block_id must be a non-empty block ID string.`);
    }
    validateSimpleContentItem(update.item, `${path}.item`, true);
  });
}

export function buildBlocksFromSimpleContent(
  items: SimpleContentItem[],
): Partial<BlockResponse>[] {
  return items.map((item) => buildBlockFromSimpleContent(item));
}

export function parseMarkdownToSimpleContent(
  markdown: string,
): SimpleContentItem[] {
  const items: SimpleContentItem[] = [];
  const paragraphLines: string[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let codeFence:
    | {
        language?: string;
        lines: string[];
      }
    | undefined;

  for (const line of lines) {
    const fenceMatch = line.match(/^```([\w#+.-]*)\s*$/);
    if (fenceMatch) {
      if (codeFence) {
        items.push({
          type: "code",
          text: codeFence.lines.join("\n"),
          language: codeFence.language,
        });
        codeFence = undefined;
      } else {
        flushParagraph(items, paragraphLines);
        codeFence = {
          language: fenceMatch[1] || undefined,
          lines: [],
        };
      }
      continue;
    }

    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph(items, paragraphLines);
      continue;
    }

    const block = parseMarkdownLine(trimmed);
    if (block) {
      flushParagraph(items, paragraphLines);
      items.push(block);
      continue;
    }

    paragraphLines.push(trimmed);
  }

  if (codeFence) {
    items.push({
      type: "code",
      text: codeFence.lines.join("\n"),
      language: codeFence.language,
    });
  }
  flushParagraph(items, paragraphLines);

  return items;
}

export function buildBlockUpdateFromSimpleContent(
  item: SimpleContentItem,
): Partial<BlockResponse> {
  if (item.type === "divider") {
    throw new Error("Divider blocks do not have editable content");
  }

  const block = buildBlockFromSimpleContent(item);
  const type = block.type;
  if (!type) {
    throw new Error("Simple content item did not produce a block type");
  }

  return {
    [type]: block[type],
  };
}

export function validateSimpleContentUpdatesAgainstBlocks(
  updates: SimpleContentUpdate[],
  blocks: BlockResponse[],
): void {
  if (updates.length !== blocks.length) {
    throw new Error(
      `Expected ${updates.length} blocks for validation, received ${blocks.length}.`,
    );
  }

  updates.forEach((update, index) => {
    const block = blocks[index];
    if (block.id !== update.block_id) {
      throw new Error(
        `Block validation order mismatch: expected ${update.block_id}, received ${block.id}.`,
      );
    }

    if (block.type !== update.item.type) {
      throw new Error(
        `Block type mismatch: block ${update.block_id} is ${block.type}, but item.type was ${update.item.type}`,
      );
    }
  });
}

function parseMarkdownLine(line: string): SimpleContentItem | undefined {
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
    return { type: "divider" };
  }

  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    return {
      type: `heading_${heading[1].length}` as
        | "heading_1"
        | "heading_2"
        | "heading_3",
      text: heading[2],
    };
  }

  const todo = line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/);
  if (todo) {
    return {
      type: "to_do",
      text: todo[2],
      checked: todo[1].toLowerCase() === "x",
    };
  }

  const bullet = line.match(/^[-*]\s+(.+)$/);
  if (bullet) {
    return {
      type: "bulleted_list_item",
      text: bullet[1],
    };
  }

  const numbered = line.match(/^\d+[.)]\s+(.+)$/);
  if (numbered) {
    return {
      type: "numbered_list_item",
      text: numbered[1],
    };
  }

  const quote = line.match(/^>\s?(.+)$/);
  if (quote) {
    return {
      type: "quote",
      text: quote[1],
    };
  }

  return undefined;
}

function flushParagraph(
  items: SimpleContentItem[],
  paragraphLines: string[],
): void {
  if (paragraphLines.length === 0) return;
  items.push({
    type: "paragraph",
    text: paragraphLines.join(" "),
  });
  paragraphLines.length = 0;
}

function buildBlockFromSimpleContent(
  item: SimpleContentItem,
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

function validateSimpleContentItem(
  item: unknown,
  path: string,
  editableOnly = false,
): asserts item is SimpleContentItem {
  if (!isRecord(item)) {
    throw new Error(`${path} must be an object with a supported type.`);
  }

  const allowedTypes = editableOnly
    ? EDITABLE_SIMPLE_CONTENT_TYPES
    : SIMPLE_CONTENT_TYPES;
  if (!isSimpleContentType(item.type, allowedTypes)) {
    throw new Error(`${path}.type must be one of: ${allowedTypes.join(", ")}.`);
  }

  if (item.type !== "divider" && typeof item.text !== "string") {
    throw new Error(`${path}.text must be a string for ${item.type} content.`);
  }
  if (item.type === "divider" && "text" in item) {
    throw new Error(`${path}.text is not supported for divider content.`);
  }
  if ("checked" in item && typeof item.checked !== "boolean") {
    throw new Error(`${path}.checked must be a boolean when provided.`);
  }
  if ("language" in item && typeof item.language !== "string") {
    throw new Error(`${path}.language must be a string when provided.`);
  }
  if ("is_toggleable" in item && typeof item.is_toggleable !== "boolean") {
    throw new Error(`${path}.is_toggleable must be a boolean when provided.`);
  }
}

function isSimpleContentType(
  value: unknown,
  allowedTypes: readonly SimpleContentType[],
): value is SimpleContentType {
  return (
    typeof value === "string" &&
    (allowedTypes as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function richTextBlock(
  type: "paragraph" | "quote" | "bulleted_list_item" | "numbered_list_item",
  text: string,
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
