# Skill: Search the Notion Workspace

Use this skill to find pages and databases across the entire Notion workspace.

## Steps

1. **Search by title** — Call `notion_search` with a query string. Results are auto-paginated and return everything matching.

2. **Filter by type** — Use the filter parameter to narrow results to pages or databases only.

3. **Get full content** — For any result, use `notion_retrieve_page` or `notion_retrieve_block_children` to get the full content.

## Example: Find all pages mentioning "Q4 Report"

```json
{
  "tool": "notion_search",
  "arguments": {
    "query": "Q4 Report",
    "filter": {
      "property": "object",
      "value": "page"
    },
    "sort": {
      "direction": "descending",
      "timestamp": "last_edited_time"
    }
  }
}
```

## Example: Find all databases

```json
{
  "tool": "notion_search",
  "arguments": {
    "query": "",
    "filter": {
      "property": "object",
      "value": "database"
    }
  }
}
```

## Tips

- The search API matches against page and database **titles only**, not full content.
- Use `sort` with `last_edited_time` to get most recently edited items first.
- Results include both pages and databases by default; use `filter` to narrow.
- After finding a page, use `notion_retrieve_block_children` with the page ID to read its content blocks.
- After finding a database, use `notion_retrieve_database` to see its schema, then `notion_query_database` to get its rows.
