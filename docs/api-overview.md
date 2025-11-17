# Notion API Overview

Complete reference for all supported Notion API endpoints, organized by resource type.

## Current Coverage

✅ **Fully Implemented** | ⚠️ **Partially Implemented** | ❌ **Not Implemented**

### Blocks (5 endpoints)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| Retrieve block | ✅ | notion_blocks | `retrieve` | Get single block metadata |
| Retrieve block children | ✅ | notion_blocks | `retrieve` | Pagination supported; use `include_children` param |
| Append block children | ✅ | notion_blocks | `append` | Max 100 blocks, 2-level nesting |
| Update block | ✅ | notion_blocks | `update` | Content/properties only, not children |
| Delete block | ✅ | notion_blocks | `delete` | Archives (soft delete), not permanent |

### Pages (4 endpoints)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| **Create page** | ✅ | notion_pages | `create` | **NEW** - Standalone pages or database rows |
| Retrieve page | ✅ | notion_pages | `retrieve` | Metadata only, not content blocks |
| **Retrieve page property item** | ✅ | notion_pages | `retrieve` | **NEW** - For relations/rollups >25 items; use `retrieve_property_item_id` param |
| Update page | ✅ | notion_pages | `update` | Properties and archive status |

**Key Pattern:**
- Page metadata: `notion_pages({ operation: "retrieve", page_id })`
- Page content (blocks): `notion_blocks({ operation: "retrieve", block_id: page_id, include_children: true })`

### Databases (4 endpoints)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| Create database | ✅ | notion_databases | `create` | Define schema with properties |
| Retrieve database | ✅ | notion_databases | `retrieve` | Get schema and metadata |
| Update database | ✅ | notion_databases | `update` | Modify title, description, or schema |
| Query database | ✅ | notion_databases | `query` | Filter, sort, paginate rows |

**Note:** Database "views" (UI filters/sorts/layouts) are NOT accessible via API.

### Search (1 endpoint)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| Search | ✅ | notion_search | `search` | Title search only; pagination can be unreliable |

**Limitations:**
- Title search only, no full-text content search
- Can be slow (4-10+ seconds)
- Pagination cursors sometimes invalid

### Users (3 endpoints)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| List all users | ✅ | notion_users | `list` | Excludes guests |
| Retrieve user | ✅ | notion_users | `retrieve` | By user ID |
| Retrieve bot user | ✅ | notion_users | `retrieve_bot` | Current integration token |

**Limitation:** Cannot retrieve user by email directly; list all and filter locally.

### Comments (2 endpoints)

| Endpoint | Status | Tool | Operation | Notes |
|----------|--------|------|-----------|-------|
| Create comment | ✅ | notion_comments | `create` | On page or in discussion thread |
| Retrieve comments | ✅ | notion_comments | `retrieve` | From page or block; no "unresolved-only" filter |

**Note:** No official "unresolved-only" filter despite some SDK documentation. Filter locally: `comments.filter(c => !c.resolved)`.

---

## What's Missing from Notion API

These features do not exist in the official Notion API:

❌ **Database views** - Cannot retrieve view configurations (filters, sorts, layouts)
❌ **Full-text content search** - Search endpoint only searches titles
❌ **Bulk operations** - No batch create/update endpoints
❌ **Prepend blocks** - Can only append to end of block list
❌ **Reorder blocks** - No native reorder; requires read-modify-write
❌ **Permanent delete** - Delete only archives (trash); no API for permanent deletion
❌ **User by email** - Must list all users and filter locally
❌ **Impersonate user** - Comments always created by bot, not individual members
❌ **Unresolved comments filter** - Must fetch all and filter locally
❌ **File upload** - Cannot upload files; must host externally and link

---

## Endpoint Details

### Blocks

#### Retrieve Block
```
GET /v1/blocks/{block_id}
```

Returns block object with `type`, content, and `has_children` flag. Does not return children blocks.

**Tool Usage:**
```javascript
await notion_blocks({
  operation: "retrieve",
  block_id: "abc123"
});
```

#### Retrieve Block Children
```
GET /v1/blocks/{block_id}/children
```

Returns paginated list of child blocks (one level only). For nested containers (toggles, columns), must recursively call for each container.

**Tool Usage:**
```javascript
// Single level
await notion_blocks({
  operation: "retrieve",
  block_id: "abc123",
  include_children: false,
  page_size: 100
});

// Recursive fetch (helper wraps multiple calls)
await notion_blocks({
  operation: "retrieve",
  block_id: "abc123",
  include_children: true
});
```

**Limitations:**
- Max 100 blocks per response
- One level only; nested blocks require separate calls
- Toggles/columns require exponential calls with depth

#### Append Block Children
```
PATCH /v1/blocks/{block_id}/children
```

Appends blocks to end of parent. Cannot prepend or insert at specific position.

**Tool Usage:**
```javascript
await notion_blocks({
  operation: "append",
  parent_block_id: "abc123",
  children: [
    {
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: "Hello world" } }]
      }
    },
    {
      type: "to_do",
      to_do: {
        rich_text: [{ text: { content: "Task item" } }],
        checked: false
      }
    }
  ]
});
```

**Limitations:**
- Max 100 blocks per request
- Max 2 levels of nesting per request
- Always appends to end
- For toggles/columns, must append parent first, then append to children in separate call

#### Update Block
```
PATCH /v1/blocks/{block_id}
```

Updates block content/properties. Cannot update children (use Append for that).

**Tool Usage:**
```javascript
await notion_blocks({
  operation: "update",
  block_id: "abc123",
  block_data: {
    paragraph: {
      rich_text: [{ text: { content: "Updated text" } }]
    }
  }
});
```

**Supported Updates:**
- Text content (paragraph, heading, quote, etc.)
- Checkbox state (to_do)
- Toggle state
- Code language
- NOT supported: children, block type conversion

#### Delete Block
```
DELETE /v1/blocks/{block_id}
```

Archives block (sets `archived: true`). Appears in Trash in UI, not permanently deleted.

**Tool Usage:**
```javascript
await notion_blocks({
  operation: "delete",
  block_id: "abc123"
});
```

---

### Pages

#### Create Page
```
POST /v1/pages
```

Creates standalone page or database row (database rows are pages with `database_id` parent).

**Tool Usage:**
```javascript
// Standalone page
await notion_pages({
  operation: "create",
  parent: { workspace: true },
  properties: {
    title: { title: [{ text: { content: "New Page" } }] }
  },
  children: [  // Optional
    { type: "paragraph", paragraph: { rich_text: [{ text: { content: "Content" } }] } }
  ]
});

// Database row
await notion_pages({
  operation: "create",
  parent: { database_id: "def456" },
  properties: {
    Name: { title: [{ text: { content: "New Row" } }] },
    Status: { select: { name: "In Progress" } }
  }
});
```

**Limitations:**
- Max 100 children blocks
- Max 2 levels of nesting in children
- Property names case-sensitive

#### Retrieve Page
```
GET /v1/pages/{page_id}
```

Returns page metadata and properties. Does NOT return content blocks (use Retrieve Block Children with page_id).

**Tool Usage:**
```javascript
await notion_pages({
  operation: "retrieve",
  page_id: "abc123"
});
```

#### Retrieve Page Property Item
```
GET /v1/pages/{page_id}/properties/{property_id}
```

Retrieves full property value, required for:
- Relations with >25 items
- Rollups with >25 items
- Long text properties

**Tool Usage:**
```javascript
await notion_pages({
  operation: "retrieve",
  page_id: "abc123",
  retrieve_property_item_id: "title"  // Property ID or name
});
```

**Pagination:**
```javascript
let allItems = [];
let cursor = undefined;

do {
  const response = await notion_pages({
    operation: "retrieve",
    page_id: "abc123",
    retrieve_property_item_id: "RelationProperty",
    start_cursor: cursor
  });

  allItems = allItems.concat(response.results);
  cursor = response.next_cursor;
} while (response.has_more);
```

#### Update Page
```
PATCH /v1/pages/{page_id}
```

Updates page properties or archives page. Does NOT update content blocks (use Update Block).

**Tool Usage:**
```javascript
// Update properties
await notion_pages({
  operation: "update",
  page_id: "abc123",
  properties: {
    Status: { select: { name: "Done" } },
    Priority: { number: 1 }
  }
});

// Archive page
await notion_pages({
  operation: "update",
  page_id: "abc123",
  archived: true
});
```

---

### Databases

#### Create Database
```
POST /v1/databases
```

Creates database with schema definition.

**Tool Usage:**
```javascript
await notion_databases({
  operation: "create",
  parent: { page_id: "abc123" },
  title: [{ text: { content: "Tasks" } }],
  properties: {
    Name: { title: {} },
    Status: {
      select: {
        options: [
          { name: "Todo", color: "red" },
          { name: "In Progress", color: "yellow" },
          { name: "Done", color: "green" }
        ]
      }
    },
    Priority: { number: { format: "number" } },
    Due: { date: {} }
  }
});
```

**Property Types:**
- `title` - Required, one per database
- `rich_text`, `number`, `select`, `multi_select`, `date`, `people`, `files`, `checkbox`, `url`, `email`, `phone_number`
- `formula`, `relation`, `rollup`, `created_time`, `created_by`, `last_edited_time`, `last_edited_by`

#### Retrieve Database
```
GET /v1/databases/{database_id}
```

Returns database schema and metadata. Does NOT return rows (use Query Database).

**Tool Usage:**
```javascript
await notion_databases({
  operation: "retrieve",
  database_id: "def456"
});
```

#### Update Database
```
PATCH /v1/databases/{database_id}
```

Updates database title, description, or schema.

**Tool Usage:**
```javascript
// Add property
await notion_databases({
  operation: "update",
  database_id: "def456",
  properties: {
    Tags: { multi_select: { options: [{ name: "urgent" }] } }
  }
});

// Update title
await notion_databases({
  operation: "update",
  database_id: "def456",
  title: [{ text: { content: "Updated Tasks" } }]
});
```

#### Query Database
```
POST /v1/databases/{database_id}/query
```

Queries database rows with filters, sorts, and pagination.

**Tool Usage:**
```javascript
await notion_databases({
  operation: "query",
  database_id: "def456",
  filter: {
    and: [
      { property: "Status", select: { equals: "Todo" } },
      { property: "Priority", number: { greater_than: 2 } }
    ]
  },
  sorts: [
    { property: "Priority", direction: "descending" },
    { property: "Due", direction: "ascending" }
  ],
  page_size: 100
});
```

**Filter Examples:**
```javascript
// Text contains
{ property: "Name", title: { contains: "meeting" } }

// Select equals
{ property: "Status", select: { equals: "Done" } }

// Date in range
{ property: "Due", date: { on_or_after: "2024-01-01" } }

// Checkbox is checked
{ property: "Done", checkbox: { equals: true } }

// Relation contains
{ property: "Projects", relation: { contains: "project_id" } }

// Compound
{ and: [filter1, filter2] }
{ or: [filter1, filter2] }
```

**Pagination:**
```javascript
let allRows = [];
let cursor = undefined;

do {
  const response = await notion_databases({
    operation: "query",
    database_id: "def456",
    start_cursor: cursor,
    page_size: 100
  });

  allRows = allRows.concat(response.results);
  cursor = response.next_cursor;
} while (response.has_more);
```

---

### Search

#### Search
```
POST /v1/search
```

Searches workspace by title (pages and databases only, not content).

**Tool Usage:**
```javascript
// Search all
await notion_search({
  query: "meeting notes"
});

// Search only pages
await notion_search({
  query: "project",
  filter: { property: "object", value: "page" }
});

// With sort
await notion_search({
  query: "tasks",
  sort: { direction: "descending", timestamp: "last_edited_time" }
});
```

**Limitations:**
- Title search only
- Slow (4-10+ seconds)
- Pagination unreliable
- Limited to accessible objects

---

### Users

#### List All Users
```
GET /v1/users
```

Returns workspace members (excludes guests).

**Tool Usage:**
```javascript
await notion_users({
  operation: "list",
  page_size: 100
});
```

#### Retrieve User
```
GET /v1/users/{user_id}
```

Returns user object by ID.

**Tool Usage:**
```javascript
await notion_users({
  operation: "retrieve",
  user_id: "abc123"
});
```

#### Retrieve Bot User
```
GET /v1/users/me
```

Returns bot user for current integration token.

**Tool Usage:**
```javascript
await notion_users({
  operation: "retrieve_bot"
});
```

---

### Comments

#### Create Comment
```
POST /v1/comments
```

Creates comment on page or replies to discussion.

**Tool Usage:**
```javascript
// New comment on page
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
```

**Note:** Always created by bot user, not individual members.

#### Retrieve Comments
```
GET /v1/comments
```

Retrieves comments from page or block.

**Tool Usage:**
```javascript
await notion_comments({
  operation: "retrieve",
  block_id: "abc123",  // Page ID or block ID
  page_size: 100
});

// Filter unresolved locally
const comments = await notion_comments({
  operation: "retrieve",
  block_id: "abc123"
});
const unresolved = comments.results.filter(c => !c.resolved);
```

---

## Rate Limits

- **Average:** 3 requests/second per integration
- **Window:** 15 minutes (2,700 requests)
- **Error:** HTTP 429 with `rate_limited` code

See [rate-limiting.md](./rate-limiting.md) for handling strategies.

---

## Resources

- [Official Notion API Reference](https://developers.notion.com/reference)
- [Working with Page Content](https://developers.notion.com/docs/working-with-page-content)
- [Database Queries and Filters](https://developers.notion.com/reference/post-database-query-filter)
