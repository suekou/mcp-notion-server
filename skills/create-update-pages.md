# Skill: Create and Update Notion Pages

Use this skill to create new pages, update existing page properties, archive pages, and manage page content.

## Creating a page under another page

```json
{
  "tool": "notion_create_page",
  "arguments": {
    "parent": {
      "type": "page_id",
      "page_id": "parent-page-id-here"
    },
    "properties": {
      "title": [
        {
          "type": "text",
          "text": { "content": "My New Page" }
        }
      ]
    },
    "children": [
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [
            {
              "type": "text",
              "text": { "content": "This is the first paragraph." }
            }
          ]
        }
      }
    ]
  }
}
```

## Creating a database item

```json
{
  "tool": "notion_create_page",
  "arguments": {
    "parent": {
      "type": "database_id",
      "database_id": "database-id-here"
    },
    "properties": {
      "Name": {
        "title": [{ "type": "text", "text": { "content": "New Task" } }]
      },
      "Status": {
        "select": { "name": "To Do" }
      },
      "Priority": {
        "select": { "name": "High" }
      }
    }
  }
}
```

## Updating page properties

```json
{
  "tool": "notion_update_page_properties",
  "arguments": {
    "page_id": "page-id-here",
    "properties": {
      "Status": { "select": { "name": "Done" } }
    }
  }
}
```

## Archiving a page

```json
{
  "tool": "notion_archive_page",
  "arguments": {
    "page_id": "page-id-here",
    "archived": true
  }
}
```

## Adding content to an existing page

Use `notion_append_block_children` with the page ID as `block_id`:

```json
{
  "tool": "notion_append_block_children",
  "arguments": {
    "block_id": "page-id-here",
    "children": [
      {
        "object": "block",
        "type": "heading_2",
        "heading_2": {
          "rich_text": [{ "type": "text", "text": { "content": "New Section" } }]
        }
      },
      {
        "object": "block",
        "type": "paragraph",
        "paragraph": {
          "rich_text": [{ "type": "text", "text": { "content": "Section content here." } }]
        }
      }
    ]
  }
}
```

## Tips

- Always use `notion_retrieve_database` first to understand the property schema before creating database items.
- Use `format: "json"` when you need to extract property IDs for subsequent updates.
- Setting a page icon: include `icon: { type: "emoji", emoji: "📝" }` in create_page.
- Setting a cover: include `cover: { type: "external", external: { url: "https://..." } }`.
