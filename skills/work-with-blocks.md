# Skill: Work with Notion Blocks

Use this skill to read, create, update, and delete content blocks within Notion pages.

## Reading page content

A page's content is stored as child blocks. To read a page's full content:

```json
{
  "tool": "notion_retrieve_block_children",
  "arguments": {
    "block_id": "page-id-here"
  }
}
```

For nested content (blocks with `has_children: true`), call `notion_retrieve_block_children` again with that block's ID.

## Supported block types

- **Text:** paragraph, heading_1, heading_2, heading_3
- **Lists:** bulleted_list_item, numbered_list_item, to_do
- **Layout:** toggle, divider, column_list, column
- **Media:** image, video, file, pdf, audio, bookmark, embed
- **Other:** callout, quote, equation, code, table_of_contents, breadcrumb, link_to_page

## Appending blocks

```json
{
  "tool": "notion_append_block_children",
  "arguments": {
    "block_id": "parent-block-or-page-id",
    "children": [
      {
        "object": "block",
        "type": "to_do",
        "to_do": {
          "rich_text": [{ "type": "text", "text": { "content": "Task item" } }],
          "checked": false
        }
      }
    ]
  }
}
```

## Updating a block

```json
{
  "tool": "notion_update_block",
  "arguments": {
    "block_id": "block-id-here",
    "block": {
      "paragraph": {
        "rich_text": [{ "type": "text", "text": { "content": "Updated text" } }]
      }
    }
  }
}
```

## Deleting a block

```json
{
  "tool": "notion_delete_block",
  "arguments": {
    "block_id": "block-id-here"
  }
}
```

## Rich text formatting

Rich text objects support annotations for styling:

```json
{
  "type": "text",
  "text": { "content": "Bold and italic" },
  "annotations": {
    "bold": true,
    "italic": true
  }
}
```

Available annotations: `bold`, `italic`, `strikethrough`, `underline`, `code`, `color`.

## Tips

- Use `notion_retrieve_block` to get a single block's details before updating it.
- The `after` parameter in `notion_append_block_children` lets you insert blocks at a specific position.
- Toggle blocks can have children that are revealed when expanded.
- Headings support `is_toggleable: true` to make them collapsible.
