# Tools

All tools return MCP tool results with text content and structured content when JSON-like data is available. Tool errors are returned with `isError: true` so an agent can correct invalid arguments.

Most tools support:

- `format`: `"json"` or `"markdown"`, default `"markdown"`.
- `response_mode`: `"auto"`, `"compact"`, or `"full"` on list-heavy read tools.

## High-level Tools

These are the recommended first-choice tools for agents.

| Tool | Purpose |
| --- | --- |
| `notion_find` | Search pages or data sources and return compact candidates with stable IDs and suggested next tools. |
| `notion_read_page` | Read page metadata plus child blocks as a compact outline, Markdown, or structured JSON. |
| `notion_inspect_data_source` | Summarize data source properties, option values, and relation targets. |
| `notion_query_data_source_by_values` | Query a data source with schema-aware simple filters and sorts. |
| `notion_create_data_source_item_from_values` | Create a data source item from simple values keyed by exact property name. |
| `notion_append_content` | Append common Notion blocks without raw block JSON. |
| `notion_append_markdown` | Append a safe subset of Markdown as Notion blocks. |
| `notion_update_content` | Update one existing simple block. |
| `notion_update_content_batch` | Validate and update multiple existing simple blocks. |

## MCP App Tools

### `notion_open_data_source_app`

Opens the interactive Data Source Explorer.

Optional input:

- `data_source_id`: initial data source ID.

### `notion_open_page_workbench`

Opens the interactive Page Workbench.

Optional input:

- `page_id`: initial page ID.

See [MCP Apps](mcp-apps.md) for details and fallbacks.

## Blocks

### `notion_append_block_children`

Append raw Notion block objects to a parent block or page.

Required:

- `block_id`
- `children`

Optional:

- `position`: `{ "type": "start" }`, `{ "type": "end" }`, or `{ "type": "after_block", "after_block": { "id": "..." } }`

Use this for advanced block types or rich text structures that simplified content tools do not cover.

### `notion_retrieve_block`

Retrieve one raw block by `block_id`.

### `notion_retrieve_block_children`

Retrieve child blocks by `block_id`.

Optional:

- `start_cursor`
- `page_size`, max 100
- `response_mode`

### `notion_update_block`

Update an existing block with raw Notion block JSON.

Required:

- `block_id`
- `block`

The update replaces the provided field value for the block type. Use `notion_update_content` for normal text edits.

### `notion_delete_block`

Delete a block by `block_id`.

## Simple Content

### `notion_append_content`

Append simple content items to a parent block or page.

Required:

- `block_id`
- `items`

Optional:

- `position`

Supported item types:

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
- `divider`

Common fields:

- `text`: required for all types except `divider`
- `checked`: for `to_do`
- `language`: for `code`, defaults to `plain text`
- `is_toggleable`: for headings

### `notion_append_markdown`

Append a safe subset of Markdown.

Required:

- `block_id`
- `markdown`

Optional:

- `position`

Supported Markdown:

- `#`, `##`, `###` headings
- paragraphs
- `-` or `*` bullets
- numbered lists
- `- [ ]` and `- [x]` todos
- block quotes
- dividers
- fenced code blocks

Unsupported Markdown is treated as paragraph text where possible. Use raw block tools for tables, images, nested lists, and rich text annotations.

### `notion_update_content`

Update one existing editable simple block.

Required:

- `block_id`
- `item`

The `item.type` must match the existing block type. `divider` is not editable.

### `notion_update_content_batch`

Update multiple existing editable simple blocks.

Required:

- `updates`: array of `{ "block_id": "...", "item": { ... } }`

The server retrieves and validates all target block types before applying writes.

## Pages

### `notion_retrieve_page`

Retrieve raw page metadata by `page_id`.

### `notion_read_page`

Read a page with compact metadata and child block content.

Required:

- `page_id`

Optional:

- `content_format`: `"outline"`, `"markdown"`, or `"json"`, default `"outline"`
- `max_depth`: default 2
- `max_blocks`: default 100
- `page_size`: default 100, max 100
- `include_properties`: default false

The outline includes stable block IDs for later insertions or updates.

### `notion_update_page_properties`

Update properties of a page or data source item.

Required:

- `page_id`
- `properties`: raw Notion page property values

## Databases and Data Sources

### `notion_create_database`

Create a new Notion database and its initial data source.

Required:

- `parent`
- `initial_data_source.properties`

Optional:

- `title`
- `description`
- `is_inline`
- `icon`
- `cover`

With the current Notion API model, the initial schema goes under `initial_data_source.properties`.

### `notion_retrieve_database`

Retrieve a database container and its child data sources by `database_id`.

Use this when you have a database ID but need the `data_source_id` for query, schema, or item operations.

### `notion_create_data_source`

Add another data source to an existing database.

Required:

- `parent`, for example `{ "type": "database_id", "database_id": "..." }`
- `properties`

Optional:

- `title`

Use `notion_create_database` when creating a new database.

### `notion_retrieve_data_source`

Retrieve raw data source metadata and property schema by `data_source_id`.

### `notion_update_data_source`

Update a data source title, description, or property schema.

Required:

- `data_source_id`

Optional:

- `title`
- `description`
- `properties`

### `notion_query_data_source`

Query a data source with raw Notion filter and sort JSON.

Required:

- `data_source_id`

Optional:

- `filter`
- `sorts`
- `start_cursor`
- `page_size`, max 100
- `response_mode`

### `notion_query_data_source_by_values`

Query a data source with simple schema-aware filters and sorts.

Required:

- `data_source_id`

Optional:

- `filters`
- `match`: `"all"` or `"any"`, default `"all"`
- `sorts`
- `start_cursor`
- `page_size`, max 100
- `response_mode`

Supported filter operators:

- `equals`
- `does_not_equal`
- `contains`
- `does_not_contain`
- `greater_than`
- `less_than`
- `greater_than_or_equal_to`
- `less_than_or_equal_to`
- `before`
- `after`
- `on_or_before`
- `on_or_after`
- `is_empty`
- `is_not_empty`

Supported property types:

- Text: `title`, `rich_text`
- Numeric: `number`
- Boolean: `checkbox`
- Options: `select`, `status`, `multi_select`
- Date: `date`
- References: `relation`, `people`

### `notion_create_data_source_item`

Create a page item in a data source with raw Notion property JSON.

Required:

- `data_source_id`
- `properties`

### `notion_create_data_source_item_from_values`

Create a page item in a data source from simple property values.

Required:

- `data_source_id`
- `values`

Supported value types:

- `title`: string
- `rich_text`: string
- `number`: number
- `checkbox`: boolean
- `select`: option name
- `status`: option name
- `multi_select`: string or string array
- `date`: ISO date string or `{ "start": "...", "end": "...", "time_zone": "..." }`
- `url`: string or null
- `email`: string or null
- `phone_number`: string or null
- `relation`: page ID string or string array
- `people`: user ID string or string array

Select, status, and multi-select names are validated against the current data source schema.

## Discovery, Search, Comments, and Users

### `notion_search`

Raw Notion search by title.

Optional:

- `query`
- `filter`: `{ "property": "object", "value": "page" | "data_source" }`
- `sort`
- `start_cursor`
- `page_size`, max 100
- `response_mode`

Prefer `notion_find` for normal agent discovery.

### `notion_find`

Compact search for pages or data sources.

Optional:

- `query`
- `object_type`: `"page"` or `"data_source"`
- `start_cursor`
- `page_size`, max 100

### `notion_inspect_data_source`

Compact data source schema summary.

Required:

- `data_source_id`

### `notion_create_comment`

Create a comment on a page or in an existing discussion.

Required:

- `rich_text`

Optional:

- `parent`: must include `page_id`
- `discussion_id`

Provide either `parent` or `discussion_id`, not both.

### `notion_retrieve_comments`

Retrieve unresolved comments from a page or block.

Required:

- `block_id`

Optional:

- `start_cursor`
- `page_size`, max 100
- `response_mode`

### `notion_list_all_users`

List users in the workspace.

Optional:

- `start_cursor`
- `page_size`, max 100
- `response_mode`

This can require a Notion Enterprise plan and an Organization API key.

### `notion_retrieve_user`

Retrieve one user by `user_id`.

This can require a Notion Enterprise plan and an Organization API key.

### `notion_retrieve_bot_user`

Retrieve the bot user associated with the current token.

## Prompts

The server also exposes MCP prompts:

- `notion_find_target`
- `notion_create_data_source_item_workflow`
- `notion_query_data_source_items_workflow`
- `notion_append_page_content`

## Resources

The server exposes static guidance resources:

- `notion://server/guide`
- `notion://server/tools`

It also exposes MCP App resources:

- `ui://notion/data-source-explorer`
- `ui://notion/page-workbench`
