import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { commonIdDescription, formatParameter } from "../../mcp/schema.js";

export const openDataSourceAppTool: Tool = {
  name: "notion_open_data_source_app",
  description:
    "Open an interactive Notion Data Source Explorer MCP App for schema inspection, filter building, querying, and item creation from simple values.",
  annotations: {
    title: "Open Data Source Explorer",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  _meta: {
    ui: {
      resourceUri: "ui://notion/data-source-explorer",
      visibility: ["model", "app"],
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "Optional initial data source ID to inspect and query." +
          commonIdDescription,
      },
      format: formatParameter,
    },
  },
};

export const openPageWorkbenchAppTool: Tool = {
  name: "notion_open_page_workbench",
  description:
    "Open an interactive Notion Page Workbench MCP App for reading page content, selecting block IDs, updating simple blocks, and appending Markdown.",
  annotations: {
    title: "Open Page Workbench",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  _meta: {
    ui: {
      resourceUri: "ui://notion/page-workbench",
      visibility: ["model", "app"],
    },
  },
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: `Optional initial page ID to read.${commonIdDescription}`,
      },
      format: formatParameter,
    },
  },
};
