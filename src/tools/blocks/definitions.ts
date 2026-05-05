import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  blockObjectSchema,
  commonIdDescription,
  formatParameter,
  responseModeParameter,
} from "../../mcp/schema.js";

export const appendBlockChildrenTool: Tool = {
  name: "notion_append_block_children",
  description:
    "Append new children blocks to a specified parent block in Notion. Requires insert content capabilities. Use the optional 'position' object to insert at the start, end, or after a specific block.",
  annotations: {
    title: "Append Block Children",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: `The ID of the parent block. ${commonIdDescription}`,
      },
      children: {
        type: "array",
        description:
          "Array of block objects to append. Each block must follow the Notion block schema.",
        items: blockObjectSchema,
      },
      position: {
        type: "object",
        description:
          "Where to insert the children. Omit this to append at the end. Use { type: 'after_block', after_block: { id } } to replace the old Notion API 'after' parameter.",
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
    required: ["block_id", "children"],
  },
};
export const retrieveBlockTool: Tool = {
  name: "notion_retrieve_block",
  description: "Retrieve a block from Notion",
  annotations: {
    title: "Retrieve Block",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: `The ID of the block to retrieve. ${commonIdDescription}`,
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const retrieveBlockChildrenTool: Tool = {
  name: "notion_retrieve_block_children",
  description: "Retrieve the children of a block",
  annotations: {
    title: "Retrieve Block Children",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: `The ID of the block. ${commonIdDescription}`,
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
      response_mode: responseModeParameter,
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const deleteBlockTool: Tool = {
  name: "notion_delete_block",
  description: "Delete a block in Notion",
  annotations: {
    title: "Delete Block",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: `The ID of the block to delete. ${commonIdDescription}`,
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const updateBlockTool: Tool = {
  name: "notion_update_block",
  description:
    "Update the content of a block in Notion based on its type. The update replaces the entire value for a given field.",
  annotations: {
    title: "Update Block",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: `The ID of the block to update. ${commonIdDescription}`,
      },
      block: {
        type: "object",
        description:
          "The updated content for the block. Must match the block's type schema.",
      },
      format: formatParameter,
    },
    required: ["block_id", "block"],
  },
};
