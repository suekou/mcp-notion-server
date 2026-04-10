# Skill: Query a Notion Database

Use this skill to query a Notion database, apply filters and sorts, and generate reports from the results.

## Steps

1. **Get the database ID** — Use `notion_search` with `filter: { property: "object", value: "database" }` to find databases by name, or use `notion_retrieve_database` if you already have the ID.

2. **Understand the schema** — Call `notion_retrieve_database` with the database_id to see all property names and types. This tells you what fields are available for filtering and sorting.

3. **Query with filters** — Call `notion_query_database` with appropriate filter and sort conditions. Results are auto-paginated; you get everything in one call.

## Example: Query a project tracker

```json
{
  "tool": "notion_query_database",
  "arguments": {
    "database_id": "abc123...",
    "filter": {
      "and": [
        {
          "property": "Status",
          "select": { "equals": "In Progress" }
        },
        {
          "property": "Priority",
          "select": { "equals": "High" }
        }
      ]
    },
    "sorts": [
      { "property": "Due Date", "direction": "ascending" }
    ]
  }
}
```

## Filter syntax reference

- **Text:** `{ "property": "Name", "rich_text": { "contains": "keyword" } }`
- **Select:** `{ "property": "Status", "select": { "equals": "Done" } }`
- **Multi-select:** `{ "property": "Tags", "multi_select": { "contains": "urgent" } }`
- **Date:** `{ "property": "Due", "date": { "before": "2025-01-01" } }`
- **Checkbox:** `{ "property": "Archived", "checkbox": { "equals": false } }`
- **Number:** `{ "property": "Score", "number": { "greater_than": 80 } }`
- **Compound:** Wrap filters in `{ "and": [...] }` or `{ "or": [...] }`

## Interpreting results

Results come as a list of page objects. Each page has a `properties` object with the database columns. Use `format: "markdown"` for readable output, or `format: "json"` when you need to process the data programmatically.
