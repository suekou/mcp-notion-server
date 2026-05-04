import type {
  ReadResourceResult,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";

const MIME_TYPE = "text/markdown";

export const notionResources: Resource[] = [
  {
    uri: "notion://server/guide",
    name: "Notion MCP Workflow Guide",
    title: "Notion MCP Workflow Guide",
    description:
      "AI-oriented guidance for choosing the right Notion MCP tools and workflows.",
    mimeType: MIME_TYPE,
  },
  {
    uri: "notion://server/tools",
    name: "Notion MCP Tool Map",
    title: "Notion MCP Tool Map",
    description:
      "Compact map of high-level and low-level Notion MCP tools exposed by this server.",
    mimeType: MIME_TYPE,
  },
];

export function readNotionResource(uri: string): ReadResourceResult {
  const text = resourceTextByUri(uri);

  return {
    contents: [
      {
        uri,
        mimeType: MIME_TYPE,
        text,
      },
    ],
  };
}

function resourceTextByUri(uri: string): string {
  switch (uri) {
    case "notion://server/guide":
      return [
        "# Notion MCP Workflow Guide",
        "",
        "Use high-level tools first when the user gives natural language goals.",
        "",
        "## Discovery",
        "",
        "- Use `notion_find` to locate pages or data sources by title.",
        "- Use `notion_retrieve_database` only when you have a database ID and need its child `data_source_id` values.",
        "- Use `notion_inspect_data_source` before creating items or choosing property values.",
        "- Use `notion_query_data_source_by_values` for common filters and sorts before falling back to raw Notion filter JSON.",
        "",
        "## Reading",
        "",
        "- Use `notion_read_page` for page metadata plus compact block outlines or Markdown.",
        "- Use `notion_retrieve_page` only when you need raw page metadata.",
        "- Use `notion_retrieve_block_children` for low-level page or block content pagination.",
        "- Use `format: \"markdown\"` for human reading when markdown conversion is enabled; use `format: \"json\"` before programmatic edits.",
        "",
        "## Writing",
        "",
        "- Use `notion_append_content` for everyday paragraphs, headings, todos, lists, quotes, callouts, code, and dividers.",
        "- Use `notion_update_content` with block IDs from `notion_read_page` to update existing simple blocks.",
        "- Use `notion_create_data_source_item_from_values` for simple data source item creation; it validates select/status/multi_select options against the schema.",
        "- Use raw JSON tools only when the simplified tools do not support the requested block or property type.",
      ].join("\n");
    case "notion://server/tools":
      return [
        "# Notion MCP Tool Map",
        "",
        "## AI-first tools",
        "",
        "- `notion_find`: compact search results with stable IDs and suggested next tools.",
        "- `notion_read_page`: compact page metadata and block content outline for reading or edit planning.",
        "- `notion_query_data_source_by_values`: schema-aware filters and sorts for common data source queries.",
        "- `notion_inspect_data_source`: compact schema summary for data source properties.",
        "- `notion_append_content`: simplified page content append.",
        "- `notion_update_content`: simplified existing block content update.",
        "- `notion_create_data_source_item_from_values`: simple values to Notion property JSON.",
        "",
        "## Low-level API tools",
        "",
        "- Blocks: `notion_append_block_children`, `notion_append_content`, `notion_update_content`, `notion_retrieve_block`, `notion_retrieve_block_children`, `notion_update_block`, `notion_delete_block`.",
        "- Pages: `notion_retrieve_page`, `notion_read_page`, `notion_update_page_properties`.",
        "- Data sources: `notion_create_data_source`, `notion_query_data_source`, `notion_query_data_source_by_values`, `notion_retrieve_data_source`, `notion_update_data_source`, `notion_create_data_source_item`.",
        "- Discovery: `notion_retrieve_database`, `notion_search`.",
        "- Comments and users: `notion_create_comment`, `notion_retrieve_comments`, `notion_list_all_users`, `notion_retrieve_user`, `notion_retrieve_bot_user`.",
      ].join("\n");
    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
}
