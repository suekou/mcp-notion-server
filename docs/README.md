# Notion MCP Server Documentation

This directory contains comprehensive documentation for the Notion MCP (Model Context Protocol) Server, a production-ready interface to the Notion API.

## Contents

- **[api-overview.md](./api-overview.md)** - Complete overview of Notion API endpoints and coverage
- **[pain-points.md](./pain-points.md)** - Known pain points, limitations, and workarounds
- **[consolidated-design.md](./consolidated-design.md)** - Unified tool design reducing complexity
- **[rate-limiting.md](./rate-limiting.md)** - Rate limit handling and retry strategies
- **[implementation-guide.md](./implementation-guide.md)** - Implementation considerations and best practices

## Quick Start

The Notion MCP Server provides programmatic access to the Notion API through six unified tools:

1. **notion_blocks** - Block operations (retrieve, append, update, delete)
2. **notion_pages** - Page operations (create, retrieve, update)
3. **notion_databases** - Database operations (create, retrieve, update, query)
4. **notion_search** - Search workspace content
5. **notion_users** - User information retrieval
6. **notion_comments** - Comment operations

Each tool uses an `operation` parameter to specify the desired action, following standard CRUD patterns.

## Key Features

- **Complete API Coverage** - All 20 Notion API endpoints supported
- **Missing Endpoints Added** - Create page, retrieve page property item now available
- **Smart Error Handling** - Reactive 429 handling with Retry-After header support
- **Pagination** - Cursor handling for large result sets
- **Format Options** - JSON or Markdown output formats

## Requirements

- Node.js 18+
- Notion API integration token
- Appropriate Notion workspace permissions

## Environment Variables

```bash
NOTION_API_TOKEN=your_token_here
NOTION_MARKDOWN_CONVERSION=true  # Optional: enable markdown output
```

## Usage Example

```javascript
// Retrieve a page with its content
await notion_pages({
  operation: "retrieve",
  page_id: "abc123...",
});

// Create a new page in a database
await notion_pages({
  operation: "create",
  parent: { database_id: "def456..." },
  properties: { Name: { title: [{ text: { content: "New Item" } }] } },
});
```

## Architecture

The server implements the Model Context Protocol (MCP) specification, providing:
- Stateless request/response handling
- JSON-RPC 2.0 protocol
- Standard tool definitions with JSON schemas
- Environment-based configuration

## Rate Limits

Notion API enforces an average of **3 requests per second** per integration token (applies to ALL tiers - Free, Plus, Business, Enterprise). Bursts above this average are allowed.

**For typical MCP usage**, no proactive throttling is needed. The implementation handles 429 errors reactively using the `Retry-After` header.

See [rate-limiting.md](./rate-limiting.md) for detailed strategies and when throttling may be needed (bulk operations only).

## Common Patterns

### Reading Page Content
Pages and their content are separate in Notion. To read full page content:
```javascript
// 1. Get page metadata
const page = await notion_pages({ operation: "retrieve", page_id: "..." });

// 2. Get page content (blocks)
const content = await notion_blocks({
  operation: "retrieve",
  block_id: page_id,  // Use page_id as block_id
  include_children: true
});
```

### Handling Nested Blocks
Toggles, columns, and other containers require separate calls:
```javascript
// 1. Get parent blocks
const blocks = await notion_blocks({ operation: "retrieve", block_id: "..." });

// 2. For each container block, fetch children
for (const block of blocks.results) {
  if (block.has_children) {
    const children = await notion_blocks({
      operation: "retrieve",
      block_id: block.id,
      include_children: true
    });
  }
}
```

### Complex Property Values
Relations and rollups with >25 items are truncated:
```javascript
// Get full property value
await notion_pages({
  operation: "retrieve",
  page_id: "...",
  retrieve_property_item_id: "property_id"
});
```

## Support

- GitHub Issues: [github.com/suekou/mcp-notion-server](https://github.com/suekou/mcp-notion-server)
- Notion API Docs: [developers.notion.com](https://developers.notion.com)

## License

MIT
