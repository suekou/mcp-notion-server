import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { commonIdDescription, formatParameter } from "../../mcp/schema.js";

export const retrievePageTool: Tool = {
  name: "notion_retrieve_page",
  description: "Retrieve a page from Notion",
  annotations: {
    title: "Retrieve Page",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: `The ID of the page to retrieve. ${commonIdDescription}`,
      },
      format: formatParameter,
    },
    required: ["page_id"],
  },
};

export const readPageTool: Tool = {
  name: "notion_read_page",
  description:
    "Read a Notion page with compact page metadata plus block content in an AI-friendly outline or Markdown shape. Use this after notion_find when you need to understand or edit a page. It fetches child blocks with max_depth and max_blocks limits so large pages do not overwhelm the model. The outline includes stable block IDs that can be used with notion_append_content position.after_block.",
  annotations: {
    title: "Read Page Content",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: `The ID of the page to read. ${commonIdDescription}`,
      },
      content_format: {
        type: "string",
        enum: ["outline", "markdown", "json"],
        description:
          "How to present page content. Use outline for compact block IDs and text, markdown for human-readable reading, or json for a structured outline without rendered Markdown.",
      },
      max_depth: {
        type: "number",
        description:
          "Maximum child-block depth to fetch. Defaults to 2. Increase only when nested content is needed.",
      },
      max_blocks: {
        type: "number",
        description:
          "Maximum number of blocks to fetch across the page tree. Defaults to 100.",
      },
      page_size: {
        type: "number",
        description:
          "Number of block children to request per Notion API page. Defaults to 100 and cannot exceed 100.",
      },
      include_properties: {
        type: "boolean",
        description:
          "Whether to include compact page property values in the response. Defaults to false to save context.",
      },
      format: formatParameter,
    },
    required: ["page_id"],
  },
};

export const updatePagePropertiesTool: Tool = {
  name: "notion_update_page_properties",
  description: "Update properties of a page or an item in a Notion database",
  annotations: {
    title: "Update Page Properties",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description:
          "The ID of the page or database item to update." +
          commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties to update. These correspond to the columns or fields in the database.",
      },
      format: formatParameter,
    },
    required: ["page_id", "properties"],
  },
};
