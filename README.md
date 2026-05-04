# Notion MCP Server

MCP server for the Notion API, designed for AI agents that need to find, read, and update Notion workspaces with low context overhead. It supports the Notion API `2026-03-11`, data sources, structured MCP results, prompts, resources, and AI-friendly tools that hide much of Notion's raw JSON complexity.

## Highlights

- Notion API `2026-03-11` support, including `data_source_id`, `position`, and `in_trash` semantics.
- AI-friendly discovery via `notion_find`, compact page reading via `notion_read_page`, and schema inspection via `notion_inspect_data_source`.
- Schema-aware querying via `notion_query_data_source_by_values` for common filters and sorts.
- Simplified write tools: `notion_append_content`, `notion_update_content`, and `notion_create_data_source_item_from_values`.
- MCP `annotations`, `structuredContent`, `isError`, prompts, and resources.
- Optional Markdown conversion for token-efficient reading.
- Node.js 24 LTS and pnpm-based development.

## 2.0 Migration Notes

This release line is intended as a breaking modernization.

- Database query, schema, and item creation workflows now use data sources.
- Use `notion_retrieve_database` to discover child `data_source_id` values when you only have a database ID.
- Replace old database-centric workflows with:
  - `notion_query_data_source`
  - `notion_retrieve_data_source`
  - `notion_update_data_source`
  - `notion_create_data_source_item`
  - `notion_create_data_source_item_from_values`
- `notion_append_block_children` now uses `position` instead of the old `after` parameter.
- Prefer `in_trash` over `archived` when reading or writing trash state.

## Recommended AI Workflow

1. Use `notion_find` to locate a page or data source.
2. Use `notion_read_page` to understand a page's current blocks and stable block IDs.
3. Use `notion_inspect_data_source` before creating data source items.
4. Use `notion_query_data_source_by_values` for common data source filtering and sorting.
5. Use `notion_create_data_source_item_from_values` for common property values.
6. Use `notion_append_content` and `notion_update_content` for common page edits.
7. Fall back to raw JSON tools only for advanced Notion API shapes that the simplified tools do not cover.

## Setup

Here is a detailed explanation of the steps mentioned above in the following articles:

- English Version: https://dev.to/suekou/operating-notion-via-claude-desktop-using-mcp-c0h
- Japanese Version: https://qiita.com/suekou/items/44c864583f5e3e6325d9

1. **Create a Notion Integration**:

   - Visit the [Notion Your Integrations page](https://www.notion.so/profile/integrations).
   - Click "New Integration".
   - Name your integration and select appropriate permissions (e.g., "Read content", "Update content").

2. **Retrieve the Secret Key**:

   - Copy the "Internal Integration Token" from your integration.
   - This token will be used for authentication.

3. **Add the Integration to Your Workspace**:

   - Open the page or database you want the integration to access in Notion.
   - Click the "···" button in the top right corner.
   - Click the "Connections" button, and select the the integration you created in step 1 above.

4. **Configure Claude Desktop**:
   Add the following to your `claude_desktop_config.json`:

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

or

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["your-built-file-path"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token"
      }
    }
  }
}
```

## Environment Variables

- `NOTION_API_TOKEN` (required): Your Notion API integration token.
- `NOTION_MARKDOWN_CONVERSION`: Set to "true" to enable experimental Markdown conversion. This can significantly reduce token consumption when viewing content, but may cause issues when trying to edit page content.

## Command Line Arguments

- `--enabledTools`: Comma-separated list of tools to enable (e.g. "notion_retrieve_page,notion_query_data_source"). When specified, only the listed tools will be available. If not specified, all tools are enabled.

Read-only tools example (copy-paste friendly):

```bash
node build/index.js --enabledTools=notion_retrieve_block,notion_retrieve_block_children,notion_retrieve_page,notion_read_page,notion_query_data_source,notion_retrieve_database,notion_retrieve_data_source,notion_find,notion_inspect_data_source,notion_search,notion_list_all_users,notion_retrieve_user,notion_retrieve_bot_user,notion_retrieve_comments
```

## Development

This project uses Node.js 24 LTS and pnpm.

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm test
```

Use the MCP inspector during local development:

```bash
pnpm run inspector
```

## Advanced Configuration

### Markdown Conversion

By default, all responses are returned in JSON format. You can enable experimental Markdown conversion to reduce token consumption:

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

or

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["your-built-file-path"],
      "env": {
        "NOTION_API_TOKEN": "your-integration-token",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
```

When `NOTION_MARKDOWN_CONVERSION` is set to `"true"`, responses will be converted to Markdown format (when `format` parameter is set to `"markdown"`), making them more human-readable and significantly reducing token consumption. However, since this feature is experimental, it may cause issues when trying to edit page content as the original structure is lost in conversion.

You can control the format on a per-request basis by setting the `format` parameter to either `"json"` or `"markdown"` in your tool calls:

- Use `"markdown"` for better readability when only viewing content
- Use `"json"` when you need to modify the returned content

## Troubleshooting

If you encounter permission errors:

1. Ensure the integration has the required permissions.
2. Verify that the integration is invited to the relevant pages or databases.
3. Confirm the token and configuration are correctly set in `claude_desktop_config.json`.

## Project Structure

The project is organized in a modular way to improve maintainability and readability:

```
./
├── src/
│   ├── index.ts              # Entry point and command-line handling
│   ├── client/
│   │   └── index.ts          # NotionClientWrapper class for API interactions
│   ├── content/
│   │   └── index.ts          # Simple content to Notion block conversion
│   ├── page/
│   │   └── index.ts          # Compact page reading and block outline helpers
│   ├── properties/
│   │   └── index.ts          # Simple property values to Notion property JSON conversion
│   ├── prompts/
│   │   └── index.ts          # Reusable MCP prompts for Notion workflows
│   ├── resources/
│   │   └── index.ts          # MCP guidance resources
│   ├── server/
│   │   └── index.ts          # MCP server setup and request handling
│   ├── summary/
│   │   └── index.ts          # Compact AI-friendly result summaries
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── args.ts           # Tool argument interfaces
│   │   ├── common.ts         # Common schema definitions
│   │   ├── responses.ts      # API response type definitions
│   │   └── schemas.ts        # Tool schema definitions
│   ├── utils/
│   │   └── index.ts          # Utility functions
│   └── markdown/
│       └── index.ts          # Markdown conversion utilities
```

### Directory Descriptions

- **index.ts**: Application entry point. Parses command-line arguments and starts the server.
- **client/**: Module responsible for communication with the Notion API.
  - **index.ts**: NotionClientWrapper class implements all API calls.
- **content/**: Converts simplified content items into Notion block objects.
- **page/**: Reads page block trees into compact outlines or Markdown.
- **properties/**: Converts simple property values into Notion page property JSON.
- **prompts/**: Defines reusable MCP prompts for Notion workflows.
- **resources/**: Defines static MCP resources with usage guidance.
- **server/**: MCP server implementation.
  - **index.ts**: Processes requests received from Claude and calls appropriate client methods.
- **summary/**: Produces compact summaries for search results and data source schemas.
- **types/**: Type definition module.
  - **index.ts**: Exports for all types.
  - **args.ts**: Interface definitions for tool arguments.
  - **common.ts**: Definitions for common schemas (ID formats, rich text, etc.).
  - **responses.ts**: Type definitions for Notion API responses.
  - **schemas.ts**: Definitions for MCP tool schemas.
- **utils/**: Utility functions.
  - **index.ts**: Functions like filtering enabled tools.
- **markdown/**: Markdown conversion functionality.
  - **index.ts**: Logic for converting JSON responses to Markdown format.

## Tools

All tools support the following optional parameter:

- `format` (string, "json" or "markdown", default: "markdown"): Controls the response format. Use "markdown" for human-readable output, "json" for programmatic access to the original data structure. Note: Markdown conversion only works when the `NOTION_MARKDOWN_CONVERSION` environment variable is set to "true".

1. `notion_append_block_children`

   - Append child blocks to a parent block.
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
     - `children` (array): Array of block objects to append.
   - Returns: Information about the appended blocks.

2. `notion_append_content`

   - Append common content blocks without writing raw Notion block JSON.
   - Required inputs:
     - `block_id` (string): The ID of the parent block or page.
     - `items` (array): Simplified content items. Supported types: `paragraph`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `quote`, `callout`, `code`, `divider`.
   - Optional inputs:
     - `position` (object): Insert at `start`, `end`, or after a block.
   - Returns: Information about the appended blocks.

3. `notion_update_content`

   - Update an existing editable block without writing raw Notion block JSON.
   - Required inputs:
     - `block_id` (string): The ID of the existing block to update.
     - `item` (object): Simplified content item. Supported types: `paragraph`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `quote`, `callout`, `code`.
   - Returns: Information about the updated block.

4. `notion_retrieve_block`

   - Retrieve information about a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to retrieve.
   - Returns: Detailed information about the block.

5. `notion_retrieve_block_children`

   - Retrieve the children of a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the parent block.
   - Optional inputs:
     - `start_cursor` (string): Cursor for the next page of results.
     - `page_size` (number, default: 100, max: 100): Number of blocks to retrieve.
   - Returns: List of child blocks.

6. `notion_delete_block`

   - Delete a specific block.
   - Required inputs:
     - `block_id` (string): The ID of the block to delete.
   - Returns: Confirmation of the deletion.

7. `notion_retrieve_page`

   - Retrieve information about a specific page.
   - Required inputs:
     - `page_id` (string): The ID of the page to retrieve.
   - Returns: Detailed information about the page.

8. `notion_read_page`

   - Read page metadata plus child blocks as a compact outline or Markdown.
   - Required inputs:
     - `page_id` (string): The ID of the page to read.
   - Optional inputs:
     - `content_format` (string, `outline`, `markdown`, or `json`): How to present block content.
     - `max_depth` (number, default: 2): Maximum nested child-block depth to fetch.
     - `max_blocks` (number, default: 100): Maximum blocks to fetch across the page tree.
     - `include_properties` (boolean): Include compact page property values.
   - Returns: Page metadata, block IDs, text outline, optional Markdown, and append hints.

9. `notion_update_page_properties`

   - Update properties of a page.
   - Required inputs:
     - `page_id` (string): The ID of the page to update.
     - `properties` (object): Properties to update.
   - Returns: Information about the updated page.

10. `notion_create_data_source`

   - Create a new Notion data source.
   - Required inputs:
     - `parent` (object): Parent page object of the data source.
     - `properties` (object): Property schema of the data source.
   - Optional inputs:
     - `title` (array): Title of the data source as a rich text array.
   - Returns: Information about the created data source.

11. `notion_query_data_source`

   - Query a data source.
   - Required inputs:
     - `data_source_id` (string): The ID of the data source to query.
   - Optional inputs:
     - `filter` (object): Filter conditions.
     - `sorts` (array): Sorting conditions.
     - `start_cursor` (string): Cursor for the next page of results.
     - `page_size` (number, default: 100, max: 100): Number of results to retrieve.
   - Returns: List of results from the query.

12. `notion_query_data_source_by_values`

   - Query a data source with simple schema-aware filters and sorts instead of raw Notion filter JSON.
   - Required inputs:
     - `data_source_id` (string): The ID of the data source to query.
   - Optional inputs:
     - `filters` (array): Filters like `{ "property": "Status", "value": "Done" }` or `{ "property": "Estimate", "operator": "greater_than", "value": 3 }`.
     - `match` (string, `all` or `any`): Combine multiple filters with AND or OR.
     - `sorts` (array): Sorts like `{ "property": "Due", "direction": "ascending" }`.
     - `start_cursor` (string): Cursor for the next page of results.
     - `page_size` (number, default: 100, max: 100): Number of results to retrieve.
   - Returns: List of matching data source items.

13. `notion_retrieve_database`

   - Retrieve information about a specific database container, including child data source IDs.
   - Required inputs:
     - `database_id` (string): The ID of the database to retrieve.
   - Returns: Detailed information about the database.

14. `notion_retrieve_data_source`

    - Retrieve metadata and property schema for a specific data source.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to retrieve.
    - Returns: Detailed information about the data source.

15. `notion_update_data_source`

    - Update information about a data source.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to update.
    - Optional inputs:
      - `title` (array): New title for the data source.
      - `description` (array): New description for the data source.
      - `properties` (object): Updated property schema.
    - Returns: Information about the updated data source.

16. `notion_create_data_source_item`

    - Create a new page item in a Notion data source.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to add the item to.
      - `properties` (object): The properties of the new item. These should match the data source schema.
    - Returns: Information about the newly created item.

17. `notion_create_data_source_item_from_values`

    - Create a new page item using simple values instead of raw Notion property JSON.
    - Validates `select`, `status`, and `multi_select` option names against the data source schema before calling Notion.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to add the item to.
      - `values` (object): Simple values keyed by exact property name, such as `{ "Name": "Task", "Status": "Done", "Tags": ["AI", "MCP"], "Due": "2026-05-04" }`.
    - Returns: Information about the newly created item.

18. `notion_find`

    - Find pages or data sources and return compact AI-friendly candidates with stable IDs.
    - Optional inputs:
      - `query` (string): Text to search for in page or data source titles.
      - `object_type` (string): Either `page` or `data_source`.
      - `start_cursor` (string): Pagination start cursor.
      - `page_size` (number, default: 100, max: 100): Number of candidates to retrieve.
    - Returns: Matching candidates with suggested next tools.

19. `notion_inspect_data_source`

    - Inspect a data source schema and return compact property names, types, options, and relation targets.
    - Required inputs:
      - `data_source_id` (string): The ID of the data source to inspect.
    - Returns: A schema summary suitable for creating or updating items.

20. `notion_search`

    - Search pages or data sources by title.
    - Optional inputs:
      - `query` (string): Text to search for in page or data source titles.
      - `filter` (object): Criteria to limit results to either only pages or only data sources.
      - `sort` (object): Criteria to sort the results
      - `start_cursor` (string): Pagination start cursor.
      - `page_size` (number, default: 100, max: 100): Number of results to retrieve.
    - Returns: List of matching pages or data sources.

21. `notion_list_all_users`

    - List all users in the Notion workspace.
    - Note: This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.
    - Optional inputs:
      - start_cursor (string): Pagination start cursor for listing users.
      - page_size (number, max: 100): Number of users to retrieve.
    - Returns: A paginated list of all users in the workspace.

22. `notion_retrieve_user`

    - Retrieve a specific user by user_id in Notion.
    - Note: This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.
    - Required inputs:
      - user_id (string): The ID of the user to retrieve.
    - Returns: Detailed information about the specified user.

23. `notion_retrieve_bot_user`

    - Retrieve the bot user associated with the current token in Notion.
    - Returns: Information about the bot user, including details of the person who authorized the integration.

24. `notion_create_comment`

    - Create a comment in Notion.
    - Requires the integration to have 'insert comment' capabilities.
    - Either specify a `parent` object with a `page_id` or a `discussion_id`, but not both.
    - Required inputs:
      - `rich_text` (array): Array of rich text objects representing the comment content.
    - Optional inputs:
      - `parent` (object): Must include `page_id` if used.
      - `discussion_id` (string): An existing discussion thread ID.
    - Returns: Information about the created comment.

25. `notion_retrieve_comments`
    - Retrieve a list of unresolved comments from a Notion page or block.
    - Requires the integration to have 'read comment' capabilities.
    - Required inputs:
      - `block_id` (string): The ID of the block or page whose comments you want to retrieve.
    - Optional inputs:
      - `start_cursor` (string): Pagination start cursor.
      - `page_size` (number, max: 100): Number of comments to retrieve.
    - Returns: A paginated list of comments associated with the specified block or page.

## Prompts

The server also exposes reusable MCP prompts for common Notion workflows:

- `notion_find_target`: Find the right page or data source before reading, editing, or creating content.
- `notion_create_database_item`: Inspect a data source schema and create an item using simple property values.
- `notion_query_database_items`: Inspect a data source schema and query items using simple filters.
- `notion_append_page_content`: Find a page and append or update common content using `notion_append_content` and `notion_update_content`.

## Resources

The server exposes static MCP resources that clients can attach as guidance:

- `notion://server/guide`: Recommended discovery, reading, and writing workflows.
- `notion://server/tools`: Compact map of high-level and low-level tools.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
