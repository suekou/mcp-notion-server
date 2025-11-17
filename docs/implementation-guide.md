# Implementation Guide

This guide covers implementation considerations, best practices, and code examples for building production-ready integrations with the Notion MCP Server.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Common Patterns](#common-patterns)
- [Rate Limiting Implementation](#rate-limiting-implementation)
- [Error Handling](#error-handling)
- [Testing Strategies](#testing-strategies)
- [Production Deployment](#production-deployment)

---

## Getting Started

### Installation

```bash
npm install @suekou/mcp-notion-server
```

### Basic Setup

```javascript
import { NotionClientWrapper } from '@suekou/mcp-notion-server';

const client = new NotionClientWrapper(process.env.NOTION_API_TOKEN);

// Retrieve a page
const page = await client.retrievePage('page-id-here');

// Query a database
const results = await client.queryDatabase('database-id-here', {
  filter: { property: 'Status', select: { equals: 'Active' } }
});
```

### Environment Variables

```bash
# Required
NOTION_API_TOKEN=secret_xxx

# Optional
NOTION_MARKDOWN_CONVERSION=true  # Enable markdown output format
```

---

## Architecture Overview

### MCP Server Components

```
┌─────────────────────────────────────────────────────────┐
│                      MCP Server                         │
│  (Model Context Protocol - JSON-RPC 2.0)               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├─── Server Handler (src/server/index.ts)
                   │    ├── Tool registration
                   │    ├── Request routing
                   │    └── Response formatting
                   │
                   ├─── Client Wrapper (src/client/index.ts)
                   │    ├── HTTP requests to Notion API
                   │    ├── Response parsing
                   │    └── Markdown conversion
                   │
                   ├─── Type Definitions (src/types/)
                   │    ├── args.ts - Tool arguments
                   │    ├── schemas.ts - Tool schemas
                   │    └── responses.ts - API responses
                   │
                   └─── Utilities (src/utils/)
                        └── Tool filtering
```

### Request Flow

```
1. User/LLM sends tool request (JSON-RPC)
   └─> MCP Server receives CallToolRequest

2. Server handler routes to appropriate method
   └─> Validates arguments
   └─> Calls NotionClientWrapper method

3. Client wrapper makes HTTP request to Notion API
   └─> Handles rate limiting (future)
   └─> Retries on errors (future)

4. Response processed and formatted
   └─> JSON or Markdown conversion
   └─> Returns to user/LLM
```

---

## Common Patterns

### Pattern 1: Reading Full Page Content

Pages and content are separate in Notion. To read a complete page:

```javascript
// Step 1: Get page metadata and properties
const page = await client.retrievePage(pageId);
console.log('Page title:', page.properties.title);

// Step 2: Get page content (blocks) - use page ID as block ID
const content = await client.retrieveBlockChildren(pageId);

// Step 3: For nested structures, recursively fetch children
async function fetchAllBlocks(blockId, depth = 0, maxDepth = 3) {
  if (depth >= maxDepth) return [];

  const response = await client.retrieveBlockChildren(blockId);
  const blocks = response.results;

  // Recursively fetch children for container blocks
  for (const block of blocks) {
    if (block.has_children) {
      block.children = await fetchAllBlocks(block.id, depth + 1, maxDepth);
    }
  }

  return blocks;
}

const allBlocks = await fetchAllBlocks(pageId);
```

### Pattern 2: Creating Database Rows

Database rows are pages with a `database_id` parent:

```javascript
// Create a new row (page) in a database
const newRow = await client.createPage(
  { database_id: databaseId },
  {
    Name: { title: [{ text: { content: 'New Task' } }] },
    Status: { select: { name: 'Todo' } },
    Priority: { number: 3 },
    Due: { date: { start: '2024-12-31' } }
  },
  // Optional: Add initial content
  [
    {
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: 'Task description here' } }]
      }
    }
  ]
);
```

### Pattern 3: Handling Complex Properties

Relations and rollups with >25 items require separate API calls:

```javascript
// Standard retrieve truncates at 25 items
const page = await client.retrievePage(pageId);
const relations = page.properties.RelatedPages.relation;  // Max 25 items

// Get full property value
async function getFullProperty(pageId, propertyId) {
  let allItems = [];
  let cursor = undefined;

  do {
    const response = await client.retrievePagePropertyItem(
      pageId,
      propertyId,
      cursor,
      100
    );

    allItems = allItems.concat(response.results || [response]);

    if (response.has_more) {
      cursor = response.next_cursor;
    } else {
      break;
    }
  } while (cursor);

  return allItems;
}

const allRelations = await getFullProperty(pageId, 'RelatedPages');
```

### Pattern 4: Pagination

All list endpoints support pagination with `start_cursor`:

```javascript
async function getAllDatabaseRows(databaseId, filter = {}) {
  let allRows = [];
  let cursor = undefined;
  let pageCount = 0;
  const maxPages = 100;  // Safety limit

  do {
    const response = await client.queryDatabase(
      databaseId,
      filter,
      [],  // sorts
      cursor,
      100  // page_size
    );

    allRows = allRows.concat(response.results);

    // Validate cursor (can be null or invalid)
    if (response.has_more && response.next_cursor && response.next_cursor !== 'null') {
      cursor = response.next_cursor;
    } else {
      break;
    }

    pageCount++;
  } while (cursor && pageCount < maxPages);

  return allRows;
}
```

### Pattern 5: Building Rich Text

Notion uses rich text objects for formatted content:

```javascript
function createRichText(content, annotations = {}) {
  return {
    type: 'text',
    text: { content },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
      ...annotations
    }
  };
}

// Usage
await client.appendBlockChildren(blockId, [
  {
    type: 'paragraph',
    paragraph: {
      rich_text: [
        createRichText('This is '),
        createRichText('bold text', { bold: true }),
        createRichText(' and '),
        createRichText('italic text', { italic: true })
      ]
    }
  }
]);
```

### Pattern 6: Updating Database Schema

```javascript
// Add a new property to a database
await client.updateDatabase(
  databaseId,
  undefined,  // title
  undefined,  // description
  {
    // Add new property
    'Tags': {
      multi_select: {
        options: [
          { name: 'urgent', color: 'red' },
          { name: 'important', color: 'yellow' },
          { name: 'optional', color: 'gray' }
        ]
      }
    },
    // Remove property (set to null)
    'OldProperty': null
  }
);
```

---

## Rate Limiting Implementation

### Reactive Handling (Recommended)

**For typical MCP usage**, use reactive 429 handling instead of proactive throttling:

```javascript
class NotionClientWithRetry extends NotionClientWrapper {
  constructor(token, maxRetries = 3) {
    super(token);
    this.maxRetries = maxRetries;
  }

  async requestWithRetry(fn) {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        // Only retry on rate limit errors
        if (error.status !== 429 || attempt >= this.maxRetries - 1) {
          throw error;
        }

        // Prefer Retry-After header, fallback to exponential backoff
        const retryAfter = error.headers?.get('Retry-After');
        const waitSeconds = retryAfter ? parseInt(retryAfter) : Math.pow(2, attempt + 1);

        console.warn(`Rate limited (429). Waiting ${waitSeconds}s... (attempt ${attempt + 1}/${this.maxRetries})`);

        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        attempt++;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Override methods to use retry logic
  async retrievePage(pageId) {
    return this.requestWithRetry(() => super.retrievePage(pageId));
  }

  async queryDatabase(databaseId, filter, sorts, cursor, pageSize) {
    return this.requestWithRetry(() =>
      super.queryDatabase(databaseId, filter, sorts, cursor, pageSize)
    );
  }

  // ... override other methods
}
```

### Optional Throttling (Bulk Operations Only)

**Only needed for sustained bulk operations** (100+ requests):

```javascript
class OptionalThrottling {
  constructor(requestsPerSecond = 2.5) {
    this.interval = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const waitTime = Math.max(0, this.interval - timeSinceLastRequest);

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }
}

// Usage - only for bulk operations
const limiter = new OptionalThrottling(2.5);

async function syncManyPages(pageIds) {
  for (const pageId of pageIds) {
    await limiter.throttle();  // Only throttle in bulk operations
    await client.retrievePage(pageId);
  }
}
```

**Note:** Notion's rate limit is an **average** of 3 req/sec with bursts allowed. For typical MCP usage (single requests), reactive handling is sufficient.

---

## Error Handling

### Notion API Error Types

```javascript
try {
  const page = await client.retrievePage(pageId);
} catch (error) {
  if (error.status === 400) {
    // Bad request - invalid parameters
    console.error('Invalid request:', error.message);
  } else if (error.status === 401) {
    // Unauthorized - invalid token
    console.error('Authentication failed. Check NOTION_API_TOKEN');
  } else if (error.status === 403) {
    // Forbidden - integration lacks permissions
    console.error('Permission denied. Grant integration access to this resource');
  } else if (error.status === 404) {
    // Not found
    console.error('Page not found:', pageId);
  } else if (error.status === 409) {
    // Conflict - resource locked
    console.error('Resource conflict. Try again later');
  } else if (error.status === 429) {
    // Rate limited
    console.error('Rate limit exceeded. Implement backoff strategy');
  } else if (error.status >= 500) {
    // Server error
    console.error('Notion API error. Try again later');
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Validation Helper

```javascript
function validateNotionId(id, name = 'ID') {
  const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
  const shortIdRegex = /^[0-9a-f]{32}$/i;

  if (!uuidRegex.test(id) && !shortIdRegex.test(id)) {
    throw new Error(`Invalid ${name}: ${id}. Must be a valid UUID or 32-character hex string`);
  }

  return id;
}

// Usage
const pageId = validateNotionId(userInput, 'page_id');
const page = await client.retrievePage(pageId);
```

---

## Testing Strategies

### Unit Tests

```javascript
import { describe, it, expect, vi } from 'vitest';
import { NotionClientWrapper } from './client';

describe('NotionClientWrapper', () => {
  it('should retrieve a page', async () => {
    const client = new NotionClientWrapper('test-token');

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'page-123', object: 'page' })
    });

    const page = await client.retrievePage('page-123');

    expect(page.id).toBe('page-123');
    expect(page.object).toBe('page');
  });

  it('should handle rate limit errors', async () => {
    const client = new NotionClientWrapper('test-token');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limited' })
    });

    await expect(client.retrievePage('page-123')).rejects.toThrow();
  });
});
```

### Integration Tests

```javascript
// Test against real Notion API (use test workspace)
import { NotionClientWrapper } from './client';

const client = new NotionClientWrapper(process.env.NOTION_TEST_TOKEN);
const testDatabaseId = process.env.TEST_DATABASE_ID;

describe('Integration Tests', () => {
  it('should create and retrieve a page', async () => {
    // Create page
    const created = await client.createPage(
      { database_id: testDatabaseId },
      { Name: { title: [{ text: { content: 'Test Page' } }] } }
    );

    expect(created.id).toBeDefined();

    // Retrieve page
    const retrieved = await client.retrievePage(created.id);
    expect(retrieved.id).toBe(created.id);

    // Cleanup: archive page
    await client.updatePageProperties(created.id, {}, true);
  });
});
```

---

## Production Deployment

### Environment Configuration

```javascript
// config.js
export const config = {
  notion: {
    token: process.env.NOTION_API_TOKEN,
    rateLimitPerSecond: parseInt(process.env.NOTION_RATE_LIMIT) || 2,
    retryAttempts: parseInt(process.env.NOTION_RETRY_ATTEMPTS) || 4,
    enableMarkdown: process.env.NOTION_MARKDOWN_CONVERSION === 'true'
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  }
};
```

### Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Wrap client with logging
class LoggedNotionClient extends NotionClientWrapper {
  async retrievePage(pageId) {
    logger.info('Retrieving page', { pageId });
    try {
      const page = await super.retrievePage(pageId);
      logger.debug('Page retrieved', { pageId, title: page.properties.title });
      return page;
    } catch (error) {
      logger.error('Failed to retrieve page', { pageId, error: error.message });
      throw error;
    }
  }
}
```

### Caching Strategy

```javascript
import Redis from 'ioredis';

class CachedNotionClient extends NotionClientWrapper {
  constructor(token, redis) {
    super(token);
    this.redis = redis;
    this.cacheTtl = 300;  // 5 minutes
  }

  async retrievePage(pageId) {
    // Check cache
    const cached = await this.redis.get(`page:${pageId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from API
    const page = await super.retrievePage(pageId);

    // Cache result (blocks are stable by ID)
    await this.redis.setex(
      `page:${pageId}`,
      this.cacheTtl,
      JSON.stringify(page)
    );

    return page;
  }

  async updatePageProperties(pageId, properties, archived) {
    const result = await super.updatePageProperties(pageId, properties, archived);

    // Invalidate cache
    await this.redis.del(`page:${pageId}`);

    return result;
  }
}

// Usage
const redis = new Redis(process.env.REDIS_URL);
const client = new CachedNotionClient(process.env.NOTION_API_TOKEN, redis);
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built code
COPY build ./build

# Run as non-root
USER node

# Expose port for HTTP server mode
EXPOSE 3000

CMD ["node", "build/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  notion-mcp:
    build: .
    environment:
      - NOTION_API_TOKEN=${NOTION_API_TOKEN}
      - NOTION_MARKDOWN_CONVERSION=true
      - LOG_LEVEL=info
    ports:
      - "3000:3000"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

### Monitoring

```javascript
// metrics.js
import { Counter, Histogram, register } from 'prom-client';

export const requestCounter = new Counter({
  name: 'notion_api_requests_total',
  help: 'Total number of Notion API requests',
  labelNames: ['method', 'status']
});

export const requestDuration = new Histogram({
  name: 'notion_api_request_duration_seconds',
  help: 'Notion API request duration',
  labelNames: ['method']
});

export const rateLimitCounter = new Counter({
  name: 'notion_api_rate_limits_total',
  help: 'Total number of rate limit errors'
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Best Practices Summary

1. **Handle 429 reactively** - Use `Retry-After` header, don't throttle everything
2. **Batch operations** - Append 100 blocks at once, not one-by-one
3. **Cache aggressively** - Block IDs are stable, cache by ID
4. **Validate input** - Check IDs, property names, etc.
5. **Log comprehensively** - Track API calls, errors, rate limits
6. **Handle pagination** - Validate cursors, implement safety limits
7. **Test thoroughly** - Unit tests + integration tests against real API
8. **Monitor in production** - Track 429 frequency to decide if throttling is needed
9. **Use TypeScript** - Type safety prevents many errors
10. **Document your schema** - Keep track of database properties and types

**Rate Limiting Philosophy:** Notion allows bursts above the 3 req/sec average. For typical MCP usage, reactive 429 handling is sufficient. Only add proactive throttling if monitoring shows frequent rate limiting.

---

## Additional Resources

- [Notion API Official Docs](https://developers.notion.com)
- [MCP SDK Documentation](https://github.com/anthropics/model-context-protocol)
- [pain-points.md](./pain-points.md) - Known issues and workarounds
- [rate-limiting.md](./rate-limiting.md) - Detailed rate limit strategies
- [api-overview.md](./api-overview.md) - Complete API reference
