# Workflows

## Agent-first Workflow

Use the high-level tools first:

1. `notion_find` to locate the target.
2. `notion_read_page` or `notion_inspect_data_source` to gather only the context needed.
3. A simplified write or query tool.
4. A raw JSON tool only when the simplified tool cannot represent the required Notion API shape.

The server instructions registered with MCP tell clients to prefer data source IDs for schema, query, and item creation workflows.

## Finding Targets

Use `notion_find` when the user gives a title, partial title, or vague target.

```json
{
  "query": "Roadmap",
  "object_type": "page",
  "page_size": 10
}
```

Use `object_type: "data_source"` when looking for database-like schemas to query or create items in. If the user gives a database ID instead of a data source ID, call `notion_retrieve_database` and use one of the returned child `data_source_id` values.

## Reading Pages

Use `notion_read_page` for most page reading. It returns compact page metadata, an outline with stable block IDs, and an editing hint.

```json
{
  "page_id": "page-id",
  "content_format": "outline",
  "max_depth": 2,
  "max_blocks": 100
}
```

Use `content_format: "markdown"` for human-readable reading. Use `content_format: "json"` or the outline when you need block IDs for edits.

Use `notion_retrieve_page` only when raw page metadata is required. Use `notion_retrieve_block_children` when you need low-level pagination or raw block objects.

## Editing Page Content

Use simplified content tools for common edits:

- `notion_append_markdown`: append a safe subset of Markdown.
- `notion_append_content`: append structured simple content items.
- `notion_update_content`: update one existing simple block after reading its block ID.
- `notion_update_content_batch`: update several existing simple blocks after validating all target block types.

Supported simple content types:

- `paragraph`
- `heading_1`
- `heading_2`
- `heading_3`
- `bulleted_list_item`
- `numbered_list_item`
- `to_do`
- `quote`
- `callout`
- `code`
- `divider` for append only

Supported append positions:

```json
{ "type": "start" }
```

```json
{ "type": "end" }
```

```json
{ "type": "after_block", "after_block": { "id": "block-id" } }
```

Use `notion_append_block_children` or `notion_update_block` for block types, rich text annotations, nested structures, files, tables, and other advanced Notion API shapes that are not covered by simple content.

## Querying Data Sources

Prefer this flow:

1. `notion_find` with `object_type: "data_source"`.
2. `notion_inspect_data_source` to get exact property names, types, option values, and relation metadata.
3. `notion_query_data_source_by_values` for common filters and sorts.
4. `notion_query_data_source` only for raw Notion filter JSON.

Simple filters validate property names, option names, value types, and supported operators before calling Notion.

Supported simple filter property types:

- `title`, `rich_text`
- `number`
- `checkbox`
- `select`, `status`, `multi_select`
- `date`
- `relation`, `people`

Default operators are type-aware:

- Text-like, `multi_select`, `relation`, and `people`: `contains`
- Most other types: `equals`

Multiple filters are combined with `match: "all"` by default. Use `match: "any"` for OR semantics.

## Creating Data Source Items

Use `notion_create_data_source_item_from_values` after inspecting the schema:

```json
{
  "data_source_id": "data-source-id",
  "values": {
    "Name": "Draft release notes",
    "Status": "In progress",
    "Tags": ["Docs", "MCP"],
    "Due": "2026-05-04",
    "Done": false
  }
}
```

Supported simple value property types:

- `title`
- `rich_text`
- `number`
- `checkbox`
- `select`
- `status`
- `multi_select`
- `date`
- `url`
- `email`
- `phone_number`
- `relation`
- `people`

For unsupported properties, use `notion_create_data_source_item` with raw Notion property JSON.

## Creating Databases and Data Sources

Use `notion_create_database` when the user wants a new database. With the current Notion API model, the first schema belongs under `initial_data_source.properties`.

Use `notion_create_data_source` only to add another data source under an existing database.

## Comments and Users

Comment tools require comment capabilities on the integration:

- `notion_create_comment`: Insert comments.
- `notion_retrieve_comments`: Read comments.

User listing and user retrieval can require Notion Enterprise and an Organization API key depending on the workspace and capability level.

## Migration Notes

This release line uses Notion's database/data source split:

- Query, schema, and item creation workflows should use `data_source_id`.
- Use `notion_retrieve_database` to discover child data sources when you only have a database ID.
- Replace database-centric workflows with `notion_query_data_source`, `notion_retrieve_data_source`, `notion_update_data_source`, `notion_create_data_source_item`, and `notion_create_data_source_item_from_values`.
- `notion_append_block_children` uses `position` instead of the older `after` parameter.
- Prefer `in_trash` over deprecated `archived` fields.

## Notion API Constraints to Keep in Mind

- Notion requires a `Notion-Version` header; this server sends `2026-03-11`.
- Data source queries require the parent database to be shared with the integration.
- Notion returns fewer than `page_size` results when appropriate and uses opaque cursors for pagination.
- Notion recommends keeping data source schemas below 500 properties or 50KB.
- Request payloads are limited by Notion size limits, including block array and total payload size limits.
