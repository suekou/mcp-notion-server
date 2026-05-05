# Configuration

## Requirements

- Node.js `>=22`
- pnpm `>=10.24.0` for local development
- A Notion internal integration token
- The integration must be connected to every Notion page or database the server should access

The server uses stdio transport, which is the normal MCP transport for local servers launched by clients such as Claude Desktop.

## Environment Variables

### `NOTION_API_TOKEN`

Required. A Notion bearer token from an internal integration or compatible OAuth flow.

The server sends this token in the `Authorization: Bearer ...` header and sets `Notion-Version: 2026-03-11` for every request.

### `NOTION_MARKDOWN_CONVERSION`

Optional. Set to `"true"` to enable experimental Markdown conversion for Notion API objects.

Most tools accept `format: "json" | "markdown"` and default to `"markdown"`. Markdown conversion only takes effect when this environment variable is set to `"true"` and the returned object is convertible. Use JSON when planning edits that depend on exact Notion API structure.

## Command-line Arguments

### `--enabledTools`

Optional comma-separated allowlist of tool names. When omitted, all tools are registered.

Read-only example:

```bash
node build/index.js --enabledTools=notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_read_page,notion_query_data_source,notion_retrieve_database,notion_retrieve_data_source,notion_find,notion_inspect_data_source,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments
```

## MCP Host Examples

### npx

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token"
      }
    }
  }
}
```

### Local build

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/absolute/path/to/suekou-mcp-notion-server/build/index.js"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token"
      }
    }
  }
}
```

### Markdown conversion

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@suekou/mcp-notion-server"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
```

## Response Controls

Most tools support:

- `format`: `"json"` or `"markdown"`, default `"markdown"`.
- `response_mode`: `"auto"`, `"compact"`, or `"full"` on list-heavy tools.

`response_mode: "auto"` compacts noisy list responses when they are large. Use `"full"` only when raw Notion API objects are needed.

List-heavy tools with response compaction:

- `notion_retrieve_block_children`
- `notion_query_data_source`
- `notion_query_data_source_by_values`
- `notion_list_all_users`
- `notion_retrieve_comments`
- `notion_search`

## Development

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm test
pnpm run inspector
```

Build output:

- TypeScript server: `build/index.js`
- Bundled MCP App HTML: `build/apps/assets/*.html`

## Troubleshooting

### Missing token

If startup prints `Please set NOTION_API_TOKEN environment variable`, the MCP host did not pass the token into the server process. Check the `env` block in the host configuration and restart the host.

### 404 from Notion

For pages, databases, or data sources, a Notion `404` often means the integration has not been connected to that Notion object. Add the integration from the page or database Connections menu.

### 403 from Notion

The integration token is valid, but the integration lacks the required capability. Check the integration settings:

- Read content for reads, search, and queries.
- Insert content for appending blocks and creating items.
- Update content for editing existing pages, blocks, and schemas.
- Read comments or Insert comments for comment tools.

### Rate limits

Notion rate limits requests and returns `429` with a `Retry-After` header. The client wrapper retries retryable statuses, including `429` and server errors, with a default timeout of 30 seconds and two retries.

### Markdown output did not appear

Set `NOTION_MARKDOWN_CONVERSION` to `"true"` and request `format: "markdown"`. Some server-generated compact summaries are already simplified JSON and are not converted through the Notion object Markdown converter.
