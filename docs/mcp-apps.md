# MCP Apps

This server exposes two optional MCP Apps. MCP Apps combine a tool with a `ui://` resource so compatible hosts can render an interactive HTML interface inside the conversation.

Host support varies. When a host does not support MCP Apps, use the fallback tools listed below.

## Capabilities

The MCP server declares the app extension capability:

```json
{
  "extensions": {
    "io.modelcontextprotocol/ui": {
      "mimeTypes": ["text/html;profile=mcp-app"]
    }
  }
}
```

The app HTML is bundled at build time with Vite and served as MCP resources:

- `ui://notion/data-source-explorer`
- `ui://notion/page-workbench`

The app resources use a strict CSP:

- `default-src 'none'`
- `script-src 'unsafe-inline'`
- `style-src 'unsafe-inline'`
- `connect-src 'none'`
- `img-src data:`

The apps call back into this MCP server through the host bridge rather than making direct network requests.

## Data Source Explorer

Tool: `notion_open_data_source_app`

Resource: `ui://notion/data-source-explorer`

Purpose:

- Inspect a data source schema.
- Build simple filters and sorts.
- Query data source items.
- Create items from simple property values.

Optional input:

```json
{
  "data_source_id": "data-source-id"
}
```

Fallback tools:

- `notion_inspect_data_source`
- `notion_query_data_source_by_values`
- `notion_create_data_source_item_from_values`

## Page Workbench

Tool: `notion_open_page_workbench`

Resource: `ui://notion/page-workbench`

Purpose:

- Read page content.
- Select block IDs from a page outline.
- Update simple blocks.
- Append Markdown.

Optional input:

```json
{
  "page_id": "page-id"
}
```

Fallback tools:

- `notion_read_page`
- `notion_update_content`
- `notion_update_content_batch`
- `notion_append_markdown`

## Development

Build app assets:

```bash
pnpm run build:apps
```

Full build:

```bash
pnpm run build
```

The build script writes bundled single-file HTML assets to `build/apps/assets`.
