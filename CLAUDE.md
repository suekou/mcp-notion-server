# MCP Notion Server

Unified MCP server for the Notion API, replacing both the official Notion MCP and the suekou MCP with a single, complete implementation built on the public Notion REST API.

## Architecture

```
src/
  index.ts              # CLI entry point (env vars, args parsing)
  client/index.ts       # NotionClientWrapper — all Notion API calls
  server/index.ts       # MCP server setup, tool dispatch (switch statement)
  types/
    args.ts             # Tool argument interfaces
    schemas.ts          # MCP tool schema definitions
    responses.ts        # Notion API response types
    common.ts           # Shared schema components (rich text, blocks)
    index.ts            # Re-exports all types
  markdown/
    index.ts            # Notion response → Markdown conversion
    index.test.ts       # Tests for markdown conversion
  utils/index.ts        # Tool filtering utility
```

## Tools (21 total)

**Blocks:** append_block_children, retrieve_block, retrieve_block_children, delete_block, update_block
**Pages:** retrieve_page, update_page_properties, create_page, archive_page, retrieve_page_property_item
**Databases:** create_database, query_database (auto-paginated), retrieve_database, update_database, create_database_item
**Users:** list_all_users, retrieve_user, retrieve_bot_user
**Comments:** create_comment, retrieve_comments
**Search:** search (auto-paginated)

### Auto-pagination

`notion_query_database` and `notion_search` automatically loop through all pages of results (100 per request) until exhausted, returning the complete dataset in a single response. No manual cursor management needed.

## Build & Run

```bash
npm install
npm run build        # Compile TypeScript → build/
npm test             # Run vitest tests
npm run watch        # TypeScript watch mode
```

### Run locally

```bash
NOTION_API_TOKEN=ntn_xxx node build/index.js
```

### Environment Variables

- `NOTION_API_TOKEN` (required) — Notion integration token
- `NOTION_MARKDOWN_CONVERSION` — Set to `"true"` to enable markdown response format

### CLI Arguments

- `--enabledTools` — Comma-separated list of tool names to enable (default: all)

## Configure in claude_desktop_config.json

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/path/to/mcp-notion-server/build/index.js"],
      "env": {
        "NOTION_API_TOKEN": "ntn_xxx",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
```

## Notion API

- Base URL: `https://api.notion.com/v1`
- API Version: `2022-06-28`
- Auth: Bearer token in Authorization header
