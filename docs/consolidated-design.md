# Consolidated Tool Design

This document describes the unified tool architecture that reduces cognitive load and improves maintainability by consolidating 18 individual tools into 6 resource-based tools.

## Design Philosophy

**Before:** 18 separate tools (notion_retrieve_page, notion_update_page, notion_create_database, etc.)
**After:** 6 unified tools grouped by resource type with `operation` parameter

**Benefits:**
- 67% reduction in tool count (18 → 6)
- Consistent CRUD pattern across all resources
- Easier to document and learn
- Matches Notion's API documentation structure
- Shared parameters (pagination, parent, properties)
- Natural grouping aligns with API design

## The Six Unified Tools

### 1. notion_blocks

Unified block operations for retrieving, appending, updating, and deleting blocks.

**Operations:**
- `retrieve` - Get block info with optional recursive children fetch
- `append` - Append up to 100 blocks to parent
- `update` - Modify block content/properties
- `delete` - Archive block (soft delete)

**Parameters:**
```typescript
{
  operation: "retrieve" | "append" | "update" | "delete";

  // For retrieve, update, delete
  block_id?: string;

  // For retrieve
  include_children?: boolean;  // Recursive fetch if enabled

  // For append
  parent_block_id?: string;
  children?: Block[];  // Max 100, 2-level nesting
  after_block_id?: string;  // Not officially supported

  // For update
  block_data?: Partial<Block>;

  // Pagination (for retrieve children)
  start_cursor?: string;
  page_size?: number;  // Max 100
}
```

**Examples:**
```javascript
// Retrieve a block with its children
await notion_blocks({
  operation: "retrieve",
  block_id: "abc123",
  include_children: true
});

// Append new blocks
await notion_blocks({
  operation: "append",
  parent_block_id: "abc123",
  children: [
    { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Hello" } }] } }
  ]
});

// Update a block
await notion_blocks({
  operation: "update",
  block_id: "abc123",
  block_data: {
    paragraph: { rich_text: [{ text: { content: "Updated text" } }] }
  }
});

// Delete (archive) a block
await notion_blocks({
  operation: "delete",
  block_id: "abc123"
});
```

**Considerations:**
- `retrieve` with `include_children: false` returns only first level
- Recursive fetch for nested structures required for toggles/columns
- `append` limited to 100 blocks and 2-level nesting per request
- Separate calls required for toggle/column children (biggest pain point)
- `update` does not handle children; use `append` for nested content
- `delete` archives (sets `archived: true`), doesn't permanently delete

---

### 2. notion_pages

Unified page operations for creating, retrieving, and updating pages.

**Operations:**
- `create` - Create standalone page or database row
- `retrieve` - Get page metadata (and optionally specific property items)
- `update` - Update properties or archive status

**Parameters:**
```typescript
{
  operation: "create" | "retrieve" | "update";

  // For retrieve, update
  page_id?: string;

  // For create
  parent?: { database_id: string } | { page_id: string } | { workspace: true };
  properties?: Record<string, PropertyValue>;
  children?: Block[];  // Optional, max 100, 2-level nesting

  // For retrieve - complex properties
  retrieve_property_item_id?: string;  // For relations/rollups >25 items

  // For update
  archived?: boolean;

  // Format
  format?: "json" | "markdown";
}
```

**Examples:**
```javascript
// Create a standalone page
await notion_pages({
  operation: "create",
  parent: { workspace: true },
  properties: {
    title: { title: [{ text: { content: "New Page" } }] }
  },
  children: [
    { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Content" } }] } }
  ]
});

// Create a database row (page with database_id parent)
await notion_pages({
  operation: "create",
  parent: { database_id: "def456" },
  properties: {
    Name: { title: [{ text: { content: "New Row" } }] },
    Status: { select: { name: "In Progress" } }
  }
});

// Retrieve page metadata
await notion_pages({
  operation: "retrieve",
  page_id: "abc123"
});

// Retrieve full property value (for relations/rollups >25 items)
await notion_pages({
  operation: "retrieve",
  page_id: "abc123",
  retrieve_property_item_id: "title"  // Property ID or name
});

// Update page properties
await notion_pages({
  operation: "update",
  page_id: "abc123",
  properties: {
    Status: { select: { name: "Done" } }
  }
});

// Archive a page
await notion_pages({
  operation: "update",
  page_id: "abc123",
  archived: true
});
```

**Considerations:**
- `create` can include children at creation (max 100, 2-level nesting)
- `retrieve` does NOT return block content; use `notion_blocks.retrieve` with `page_id` for full content
- `retrieve_property_item_id` needed for relations/rollups with >25 items to avoid truncation
- Database rows are pages with `parent.database_id` set
- Property names are case-sensitive and must match database schema

**Key Pattern - Reading Full Page Content:**
```javascript
// 1. Get page metadata
const page = await notion_pages({
  operation: "retrieve",
  page_id: "abc123"
});

// 2. Get page content (page ID can be used as block ID)
const content = await notion_blocks({
  operation: "retrieve",
  block_id: "abc123",  // Use page_id here
  include_children: true
});
```

---

### 3. notion_databases

Unified database operations for creating, retrieving, updating schema, and querying rows.

**Operations:**
- `create` - Create database with schema
- `retrieve` - Get database object and schema
- `update` - Update title, description, or schema
- `query` - Query rows with filters, sorts, pagination

**Parameters:**
```typescript
{
  operation: "create" | "retrieve" | "update" | "query";

  // For retrieve, update, query
  database_id?: string;

  // For create
  parent?: { page_id: string } | { workspace: true };
  title?: RichText[];
  description?: RichText[];
  properties?: Record<string, PropertySchema>;

  // For query
  filter?: Filter;
  sorts?: Sort[];
  start_cursor?: string;
  page_size?: number;  // Max 100

  // Format
  format?: "json" | "markdown";
}
```

**Examples:**
```javascript
// Create database
await notion_databases({
  operation: "create",
  parent: { page_id: "abc123" },
  title: [{ text: { content: "Tasks" } }],
  properties: {
    Name: { title: {} },
    Status: { select: { options: [{ name: "Todo" }, { name: "Done" }] } },
    Priority: { number: { format: "number" } }
  }
});

// Retrieve database schema
await notion_databases({
  operation: "retrieve",
  database_id: "def456"
});

// Update database schema (add property)
await notion_databases({
  operation: "update",
  database_id: "def456",
  properties: {
    Tags: { multi_select: { options: [{ name: "urgent" }] } }
  }
});

// Query database with filter and sort
await notion_databases({
  operation: "query",
  database_id: "def456",
  filter: {
    property: "Status",
    select: { equals: "Todo" }
  },
  sorts: [
    { property: "Priority", direction: "descending" }
  ],
  page_size: 100
});

// Paginated query
let cursor = undefined;
let allResults = [];

do {
  const response = await notion_databases({
    operation: "query",
    database_id: "def456",
    start_cursor: cursor,
    page_size: 100
  });

  allResults = allResults.concat(response.results);
  cursor = response.next_cursor;
} while (response.has_more);
```

**Considerations:**
- `query` returns up to 100 rows at a time; use pagination for larger sets
- Views not accessible via API
- Complex sorts/filters on formulas/rollups can be slow
- Property values may be truncated (first 25 items for relations/rollups)
- Use `notion_pages.retrieve` with `retrieve_property_item_id` for full property data

---

### 4. notion_search

Search pages and databases by title within the workspace.

**Operations:**
- `search` - Search workspace (only operation, so parameter optional)

**Parameters:**
```typescript
{
  operation?: "search";  // Optional, implied

  query?: string;  // Title search term
  filter?: {
    property: "object";
    value: "page" | "database";
  };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  start_cursor?: string;
  page_size?: number;  // Max 100

  // Format
  format?: "json" | "markdown";
}
```

**Examples:**
```javascript
// Search all accessible content
await notion_search({
  query: "meeting notes"
});

// Search only pages
await notion_search({
  query: "project",
  filter: { property: "object", value: "page" }
});

// Search with sort
await notion_search({
  query: "tasks",
  sort: { direction: "descending", timestamp: "last_edited_time" }
});

// Paginated search
let cursor = undefined;
const allResults = [];

do {
  const response = await notion_search({
    query: "reports",
    start_cursor: cursor,
    page_size: 100
  });

  allResults.push(...response.results);
  cursor = response.next_cursor;
} while (response.has_more && cursor);  // Validate cursor
```

**Considerations:**
- **Title search only** - no full-text content search
- Pagination cursor issues: may return `null` or invalid cursors
- Can be slow (4-10+ seconds per request)
- Limited to objects the integration can access
- Validate `next_cursor` before use: `if (cursor && cursor !== "null")`

---

### 5. notion_users

Retrieve user information from the workspace.

**Operations:**
- `list` - List workspace users (excludes guests)
- `retrieve` - Get specific user by ID
- `retrieve_bot` - Get bot user for current token

**Parameters:**
```typescript
{
  operation: "list" | "retrieve" | "retrieve_bot";

  // For retrieve
  user_id?: string;

  // For list
  start_cursor?: string;
  page_size?: number;  // Max 100
}
```

**Examples:**
```javascript
// List all users
await notion_users({
  operation: "list",
  page_size: 100
});

// Retrieve specific user
await notion_users({
  operation: "retrieve",
  user_id: "abc123"
});

// Get bot user (integration)
await notion_users({
  operation: "retrieve_bot"
});

// Paginated list
let cursor = undefined;
const allUsers = [];

do {
  const response = await notion_users({
    operation: "list",
    start_cursor: cursor,
    page_size: 100
  });

  allUsers.push(...response.results);
  cursor = response.next_cursor;
} while (response.has_more);
```

**Considerations:**
- Guests excluded from `list` endpoint
- Cannot get user by email directly
- Workaround: list all users and filter locally by `user.person.email`
- Bot user represents the integration itself

---

### 6. notion_comments

Create and retrieve comments on pages and discussions.

**Operations:**
- `create` - Create comment on page or in discussion
- `retrieve` - Get comments from page or block

**Parameters:**
```typescript
{
  operation: "create" | "retrieve";

  // For create
  parent?: { page_id: string };
  discussion_id?: string;  // For replying to existing discussion
  rich_text?: RichText[];

  // For retrieve
  block_id?: string;  // Page ID or block ID
  start_cursor?: string;
  page_size?: number;  // Max 100
}
```

**Examples:**
```javascript
// Create comment on page
await notion_comments({
  operation: "create",
  parent: { page_id: "abc123" },
  rich_text: [{ text: { content: "This needs review" } }]
});

// Reply to discussion
await notion_comments({
  operation: "create",
  discussion_id: "def456",
  rich_text: [{ text: { content: "Agreed!" } }]
});

// Retrieve comments from page
await notion_comments({
  operation: "retrieve",
  block_id: "abc123",  // Page ID or block ID
  page_size: 100
});

// Paginated retrieval
let cursor = undefined;
const allComments = [];

do {
  const response = await notion_comments({
    operation: "retrieve",
    block_id: "abc123",
    start_cursor: cursor,
    page_size: 100
  });

  allComments.push(...response.results);
  cursor = response.next_cursor;
} while (response.has_more);
```

**Considerations:**
- Comments always created by bot user, not individual workspace members
- Workaround: prefix comment text with user attribution
- No official "unresolved-only" filter parameter (despite some SDK phrasing)
- Retrieve all comments and filter locally: `comments.filter(c => !c.resolved)`
- Use `discussion_id` from first comment to reply in thread

---

## Migration from Old Tool Names

| Old Tool Name | New Tool | Operation |
|--------------|----------|-----------|
| notion_append_block_children | notion_blocks | `append` |
| notion_retrieve_block | notion_blocks | `retrieve` |
| notion_retrieve_block_children | notion_blocks | `retrieve` + `include_children` |
| notion_update_block | notion_blocks | `update` |
| notion_delete_block | notion_blocks | `delete` |
| notion_retrieve_page | notion_pages | `retrieve` |
| notion_update_page_properties | notion_pages | `update` |
| **notion_create_page** ⚠️ NEW | notion_pages | `create` |
| notion_create_database_item | notion_pages | `create` (with `database_id` parent) |
| notion_create_database | notion_databases | `create` |
| notion_retrieve_database | notion_databases | `retrieve` |
| notion_update_database | notion_databases | `update` |
| notion_query_database | notion_databases | `query` |
| notion_search | notion_search | `search` (implied) |
| notion_list_all_users | notion_users | `list` |
| notion_retrieve_user | notion_users | `retrieve` |
| notion_retrieve_bot_user | notion_users | `retrieve_bot` |
| notion_create_comment | notion_comments | `create` |
| notion_retrieve_comments | notion_comments | `retrieve` |

**⚠️ Important Rename:**
`notion_create_database_item` → `notion_pages` with `operation: "create"` and `parent: { database_id }`

This clarifies that database rows are actually pages with a database parent, matching official API terminology.

---

## Consolidation Benefits

1. **Cognitive Load Reduction**
   - 67% fewer tool names to remember (18 → 6)
   - Consistent pattern: resource + operation
   - Natural grouping matches mental model

2. **Consistency**
   - Shared parameters across operations (pagination, format)
   - Standard CRUD pattern (create, retrieve, update, delete)
   - Predictable naming and structure

3. **Maintainability**
   - Single tool definition per resource type
   - Easier to add new operations
   - Centralized validation and error handling

4. **Documentation**
   - Matches Notion's API docs structure
   - Easier to cross-reference official docs
   - Natural organization for guides

5. **Discoverability**
   - Six tools easier to browse than 18
   - Operation parameter makes intent clear
   - IDE/autocomplete friendly

---

## Implementation Considerations

### For MCP Servers

```typescript
// Tool definition with operation parameter
{
  name: "notion_blocks",
  description: "Unified block operations",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["retrieve", "append", "update", "delete"],
        description: "Operation to perform"
      },
      block_id: { type: "string" },
      // ... other parameters
    },
    required: ["operation"]
  }
}

// Handler with operation routing
async function handleNotionBlocks(args) {
  switch (args.operation) {
    case "retrieve":
      return await retrieveBlock(args);
    case "append":
      return await appendBlockChildren(args);
    case "update":
      return await updateBlock(args);
    case "delete":
      return await deleteBlock(args);
  }
}
```

### For n8n Workflows

Create community nodes with:
- Single HTTP Request node per tool
- Operation dropdown parameter
- Dynamic URL/method based on operation
- Shared pagination/format options

### For Direct API Usage

Wrapper functions that route operations:
```javascript
async function notion_pages({ operation, ...params }) {
  switch (operation) {
    case "create":
      return await notionClient.pages.create(params);
    case "retrieve":
      return await notionClient.pages.retrieve(params);
    case "update":
      return await notionClient.pages.update(params);
  }
}
```

---

## Next Steps

1. Implement unified tool handlers in `src/server/index.ts`
2. Add operation routing logic
3. Update schema definitions in `src/types/schemas.ts`
4. Add missing endpoints (create page, retrieve property item)
5. Implement rate limiting and retry logic
6. Update tests and documentation
7. Deprecate old tool names (with backward compatibility)

See [implementation-guide.md](./implementation-guide.md) for detailed implementation steps.
