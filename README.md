# Notion MCP Server

> **Disclaimer:** This is a fork of [@suekou/mcp-notion-server](https://github.com/suekou/mcp-notion-server), originally created by [Kosuke Suenaga](https://github.com/suekou). It has been substantially modified using AI-assisted development (vibe coded with Claude). The additions — auto-pagination, new tools, skills, agents, and documentation — were generated and iterated on with Claude Code. Use at your own discretion; review the code before running in production.

MCP Server for the Notion API, enabling LLMs to interact with Notion workspaces. Supports both JSON and Markdown response formats to optimize token usage.

## Quick Install

```bash
git clone https://github.com/fenixstarlord/mcp-notion-server.git
cd mcp-notion-server
./install.sh
```

The install script checks prerequisites (Node.js >= 18), installs dependencies, builds the project, and prints a ready-to-paste config snippet. You can also pass the token non-interactively:

```bash
NOTION_API_TOKEN=ntn_xxx ./install.sh
```

### Manual Install

```bash
npm install
npm run build
```

## Setup

1. **Create a Notion Integration** at the [Notion Integrations page](https://www.notion.so/profile/integrations). Give it read/update/insert content and comment permissions as needed.

2. **Copy the Integration Token** — you'll need it for the `NOTION_API_TOKEN` env var.

3. **Connect the Integration** — open each Notion page or database you want accessible, click "..." > "Connections", and add your integration.

4. **Configure your MCP client** — add the server to your `claude_desktop_config.json`:

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

Or via npx (using the original suekou package — does not include the fork additions):

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "ntn_xxx"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NOTION_API_TOKEN` | Yes | Notion integration token |
| `NOTION_MARKDOWN_CONVERSION` | No | Set to `"true"` to enable Markdown responses. Reduces token usage significantly but loses the original JSON structure. |

## CLI Arguments

- `--enabledTools` — Comma-separated list of tool names to enable (default: all).

Read-only mode example:

```bash
NOTION_API_TOKEN=ntn_xxx node build/index.js \
  --enabledTools=notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_retrieve_page_property_item,notion_query_database,notion_retrieve_database,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments
```

## Tools (21)

All tools accept an optional `format` parameter (`"json"` or `"markdown"`, default `"markdown"`). Use `"markdown"` for reading, `"json"` when you need to modify content.

### Blocks

| Tool | Description |
|------|-------------|
| `notion_append_block_children` | Append child blocks to a parent block. Required: `block_id`, `children`. Optional: `after`. |
| `notion_retrieve_block` | Retrieve a single block. Required: `block_id`. |
| `notion_retrieve_block_children` | Retrieve children of a block. Required: `block_id`. Optional: `start_cursor`, `page_size`. |
| `notion_delete_block` | Delete a block. Required: `block_id`. |
| `notion_update_block` | Update block content. Required: `block_id`, `block`. |

### Pages

| Tool | Description |
|------|-------------|
| `notion_retrieve_page` | Retrieve a page. Required: `page_id`. |
| `notion_create_page` | Create a page under a page or database. Required: `parent`, `properties`. Optional: `children`, `icon`, `cover`. |
| `notion_update_page_properties` | Update page properties. Required: `page_id`, `properties`. |
| `notion_archive_page` | Archive or restore a page. Required: `page_id`, `archived` (boolean). |
| `notion_retrieve_page_property_item` | Retrieve a specific property value (auto-paginates for relations, rollups, etc.). Required: `page_id`, `property_id`. |

### Databases

| Tool | Description |
|------|-------------|
| `notion_create_database` | Create a database. Required: `parent`, `properties`. Optional: `title`. |
| `notion_query_database` | Query a database with filters and sorts. **Auto-paginates** through all results. Required: `database_id`. Optional: `filter`, `sorts`. |
| `notion_retrieve_database` | Retrieve database schema. Required: `database_id`. |
| `notion_update_database` | Update database title, description, or properties. Required: `database_id`. Optional: `title`, `description`, `properties`. |
| `notion_create_database_item` | Create a row in a database. Required: `database_id`, `properties`. |

### Users

| Tool | Description |
|------|-------------|
| `notion_list_all_users` | List workspace users. Optional: `start_cursor`, `page_size`. *(Enterprise plan required)* |
| `notion_retrieve_user` | Retrieve a user. Required: `user_id`. *(Enterprise plan required)* |
| `notion_retrieve_bot_user` | Retrieve the bot user for the current token. |

### Comments

| Tool | Description |
|------|-------------|
| `notion_create_comment` | Create a comment on a page or discussion. Required: `rich_text`. Optional: `parent`, `discussion_id`. |
| `notion_retrieve_comments` | Retrieve comments on a block or page. Required: `block_id`. Optional: `start_cursor`, `page_size`. |

### Search

| Tool | Description |
|------|-------------|
| `notion_search` | Search pages and databases by title. **Auto-paginates** through all results. Optional: `query`, `filter`, `sort`. |

## Auto-Pagination

`notion_query_database` and `notion_search` automatically loop through all pages of results (100 per request) until exhausted, returning the complete dataset in a single response. No cursor management needed.

Other paginated endpoints (`notion_retrieve_block_children`, `notion_list_all_users`, `notion_retrieve_comments`) still accept `start_cursor` and `page_size` for manual pagination.

`notion_retrieve_page_property_item` also auto-paginates for property types that return paginated lists (relations, rollups, rich_text, title, people).

## Markdown Conversion

When `NOTION_MARKDOWN_CONVERSION=true`, responses requested with `format: "markdown"` are converted to a readable Markdown format, significantly reducing token consumption. Use `format: "json"` when you need the raw structure for modifications.

## Project Structure

```
src/
  index.ts              # CLI entry point
  client/index.ts       # NotionClientWrapper — all API calls
  server/index.ts       # MCP server setup, tool dispatch
  types/
    args.ts             # Tool argument interfaces
    schemas.ts          # MCP tool schemas
    responses.ts        # API response types
    common.ts           # Shared schema definitions
    index.ts            # Re-exports
  markdown/
    index.ts            # JSON → Markdown conversion
    index.test.ts       # Markdown tests
  utils/index.ts        # Tool filtering
skills/                 # Usage guides for common operations
agents/                 # Agent definitions for complex workflows
```

## Development

```bash
npm install             # Install dependencies
npm run build           # Compile TypeScript → build/
npm test                # Run vitest tests
npm run watch           # TypeScript watch mode
npm run inspector       # Launch MCP inspector
```

## Troubleshooting

- **Permission errors** — Ensure the integration has the required capabilities and is connected to the relevant pages/databases.
- **Token errors** — Verify `NOTION_API_TOKEN` is set correctly in your config.
- **Markdown issues** — If editing content after reading in Markdown format fails, switch to `format: "json"` to preserve the original structure.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Credits

- Original project: [@suekou/mcp-notion-server](https://github.com/suekou/mcp-notion-server) by [Kosuke Suenaga](https://github.com/suekou)
- Fork modifications: AI-assisted development with [Claude Code](https://claude.ai/code)
