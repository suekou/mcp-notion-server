import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { commonIdDescription, formatParameter } from "../../mcp/schema.js";

const simpleContentItemSchema = {
  type: "object",
  description:
    "A simplified Notion content item. The server converts this into a valid Notion block object.",
  properties: {
    type: {
      type: "string",
      enum: [
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
      ],
      description: "The simple content type to append.",
    },
    text: {
      type: "string",
      description: "Plain text content. Required for all types except divider.",
    },
    checked: {
      type: "boolean",
      description: "Only used for to_do items.",
    },
    language: {
      type: "string",
      description: "Only used for code blocks. Defaults to plain text.",
    },
    is_toggleable: {
      type: "boolean",
      description: "Only used for heading blocks.",
    },
  },
  required: ["type"],
};

const simpleEditableContentItemSchema = {
  ...simpleContentItemSchema,
  description:
    "A simplified Notion content item for updating an existing editable block. The type must match the current block type.",
  properties: {
    ...simpleContentItemSchema.properties,
    type: {
      ...simpleContentItemSchema.properties.type,
      enum: [
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
      ],
      description:
        "The existing block type to update. Must match the block's current type.",
    },
  },
};

export const appendContentTool: Tool = {
  name: "notion_append_content",
  description:
    "Append common Notion content without writing raw Notion block JSON. Use this for everyday page editing when the user wants to add paragraphs, headings, lists, todos, quotes, callouts, code blocks, or dividers. For unsupported block types or advanced rich text annotations, use notion_append_block_children with raw Notion block objects.",
  annotations: {
    title: "Append Simple Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The parent block or page ID to append content to." +
          commonIdDescription,
      },
      items: {
        type: "array",
        description:
          "Simplified content items to append in order. Keep batches reasonably small for easier review.",
        items: simpleContentItemSchema,
      },
      position: {
        type: "object",
        description:
          "Where to insert the content. Omit this to append at the end.",
        properties: {
          type: {
            type: "string",
            enum: ["after_block", "start", "end"],
          },
          after_block: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "The existing block ID to insert after." +
                  commonIdDescription,
              },
            },
            required: ["id"],
          },
        },
        required: ["type"],
      },
      format: formatParameter,
    },
    required: ["block_id", "items"],
  },
};

export const appendMarkdownTool: Tool = {
  name: "notion_append_markdown",
  description:
    "Append a safe subset of Markdown to a Notion page or block without writing raw Notion block JSON. Supports headings (#, ##, ###), paragraphs, bullet items, numbered items, todos (- [ ] / - [x]), quotes, dividers, and fenced code blocks. Use this when the user provides Markdown-like content and wants it appended; use raw block tools for tables, images, rich text annotations, nested lists, or advanced Notion blocks.",
  annotations: {
    title: "Append Markdown Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The parent block or page ID to append Markdown content to." +
          commonIdDescription,
      },
      markdown: {
        type: "string",
        description:
          "Markdown content to convert into simple Notion blocks. Unsupported Markdown is treated as plain paragraph text where possible.",
      },
      position: {
        type: "object",
        description:
          "Where to insert the content. Omit this to append at the end.",
        properties: {
          type: {
            type: "string",
            enum: ["after_block", "start", "end"],
          },
          after_block: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "The existing block ID to insert after." +
                  commonIdDescription,
              },
            },
            required: ["id"],
          },
        },
        required: ["type"],
      },
      format: formatParameter,
    },
    required: ["block_id", "markdown"],
  },
};

export const updateContentTool: Tool = {
  name: "notion_update_content",
  description:
    "Update an existing Notion block without writing raw Notion block JSON. Use this after notion_read_page gives you a block ID and you need to replace the text or simple fields of an existing paragraph, heading, list item, todo, quote, callout, or code block. The item.type must match the block's current type; this tool will reject mismatches so the model can correct itself.",
  annotations: {
    title: "Update Simple Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The existing block ID to update. Use notion_read_page to find block IDs." +
          commonIdDescription,
      },
      item: simpleEditableContentItemSchema,
      format: formatParameter,
    },
    required: ["block_id", "item"],
  },
};

export const updateContentBatchTool: Tool = {
  name: "notion_update_content_batch",
  description:
    "Update multiple existing Notion blocks without writing raw Notion block JSON. Use this after notion_read_page when the user wants several simple text edits at once. The server retrieves every target block and validates all item.type values before applying updates, so block type mistakes fail before any write is attempted.",
  annotations: {
    title: "Update Simple Content Batch",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        description:
          "Batch of existing blocks to update. Keep batches reviewable and use block IDs from notion_read_page.",
        items: {
          type: "object",
          properties: {
            block_id: {
              type: "string",
              description: `The existing block ID to update. ${commonIdDescription}`,
            },
            item: simpleEditableContentItemSchema,
          },
          required: ["block_id", "item"],
        },
      },
      format: formatParameter,
    },
    required: ["updates"],
  },
};
