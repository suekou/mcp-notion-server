import type { ToolHandlerMap } from "../types.js";

export const appToolHandlers: ToolHandlerMap = {
  notion_open_data_source_app: async (args) => ({
    object: "notion_mcp_app",
    app: "data_source_explorer",
    resource_uri: "ui://notion/data-source-explorer",
    data_source_id:
      typeof args.data_source_id === "string" ? args.data_source_id : undefined,
    fallback:
      "Use notion_inspect_data_source, notion_query_data_source_by_values, and notion_create_data_source_item_from_values when the host does not support MCP Apps.",
  }),
  notion_open_page_workbench: async (args) => ({
    object: "notion_mcp_app",
    app: "page_workbench",
    resource_uri: "ui://notion/page-workbench",
    page_id: typeof args.page_id === "string" ? args.page_id : undefined,
    fallback:
      "Use notion_read_page, notion_update_content, notion_update_content_batch, and notion_append_markdown when the host does not support MCP Apps.",
  }),
};
