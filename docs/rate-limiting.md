# Rate Limiting and Retry Strategies

This document covers Notion API rate limits, implementation strategies, and best practices for handling 429 errors.

## Official Limits (All Tiers)

**Notion API Rate Limit:**
- **Average:** 3 requests per second per integration token
- **Applies to:** ALL pricing tiers (Free, Plus, Business, Enterprise) - no difference
- **Bursts allowed:** Yes - occasional spikes above 3/sec are permitted
- **HTTP Error:** 429 with `rate_limited` error code
- **Response Header:** `Retry-After` (integer seconds to wait)

**Key Points:**
- Limit is per integration token, not per user or workspace
- It's an **average** of 3/sec - bursts beyond this are allowed
- Future: Notion may introduce tier-based limits, but currently all tiers are the same
- Best practice: Handle 429 responses reactively rather than throttling everything

## Rate Limit Strategy

### Recommended Approach: Reactive Handling (Not Proactive Throttling)

**For typical MCP usage** (single requests from Claude), you **don't need proactive throttling**. The official docs allow bursts, and normal usage won't hit limits.

**When you DO need rate limiting:**
- Bulk sync operations
- Recursive nested block fetching
- Large-scale automation (>3 req/sec sustained)

### 1. Reactive Handling (Recommended for Most Use Cases)

**Handle 429 errors when they occur** using the `Retry-After` header:

```javascript
async function notionRequest(url, options, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, options);

      // Check for rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitSeconds = retryAfter ? parseInt(retryAfter) : Math.pow(2, attempt);

        console.warn(`Rate limited (429). Waiting ${waitSeconds}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));

        attempt++;
        continue;
      }

      // Success or non-retryable error
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      if (attempt >= maxRetries - 1) throw error;
      attempt++;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### 2. Optional Proactive Throttling (For Bulk Operations Only)

**Only use this for known bulk operations** (e.g., syncing entire workspace):

```javascript
class OptionalRateLimiter {
  constructor(requestsPerSecond = 2.5) {
    this.interval = 1000 / requestsPerSecond;  // ~400ms between requests
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
const limiter = new OptionalRateLimiter(2.5);  // Slightly under limit for safety

async function bulkSync() {
  for (const pageId of manyPageIds) {
    await limiter.throttle();  // Only throttle in bulk operations
    await client.retrievePage(pageId);
  }
}
```

### 3. Exponential Backoff (Fallback Only)

Use exponential backoff **only if `Retry-After` header is missing**:

```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      // Only retry on rate limit errors
      if (error.status !== 429 || attempt >= maxRetries - 1) {
        throw error;
      }

      // Prefer Retry-After header, fallback to exponential backoff
      const retryAfter = error.headers?.get('Retry-After');
      const baseDelay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, attempt + 1) * 1000;  // 2s, 4s, 8s

      // Add small jitter to avoid thundering herd (±10%)
      const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);
      const finalDelay = baseDelay + jitter;

      console.warn(`Rate limited (429). Retrying in ${Math.round(finalDelay/1000)}s... (attempt ${attempt + 1}/${maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, finalDelay));
      attempt++;
    }
  }

  throw new Error("Max retries exceeded");
}

// Usage
const result = await retryWithBackoff(async () => {
  return await notionClient.retrievePage("page-id");
});
```

### 4. Request Queue with Concurrency Limit (Optional for Bulk Operations)

**Only needed for sustained bulk operations** (not typical MCP usage):

**Implementation with p-queue:**
```javascript
import PQueue from 'p-queue';

// Max 3 concurrent requests, with 333ms minimum time between starts
const queue = new PQueue({
  concurrency: 3,
  interval: 1000,
  intervalCap: 3
});

// Add requests to queue
const results = await Promise.all([
  queue.add(() => notionClient.pages.retrieve({ page_id: "id1" })),
  queue.add(() => notionClient.pages.retrieve({ page_id: "id2" })),
  queue.add(() => notionClient.pages.retrieve({ page_id: "id3" })),
  // ... many more
]);
```

**Manual Queue Implementation:**
```javascript
class RequestQueue {
  constructor(requestsPerSecond = 3) {
    this.queue = [];
    this.processing = false;
    this.interval = 1000 / requestsPerSecond;
    this.lastRequest = 0;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();

      // Throttle
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      const waitTime = Math.max(0, this.interval - timeSinceLastRequest);

      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      }

      // Execute with retry
      try {
        const result = await retryWithBackoff(fn);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      this.lastRequest = Date.now();
    }

    this.processing = false;
  }
}

// Usage
const queue = new RequestQueue(2);  // 2 req/sec for safety

const results = await Promise.all([
  queue.add(() => notionClient.pages.retrieve({ page_id: "id1" })),
  queue.add(() => notionClient.pages.retrieve({ page_id: "id2" })),
  // ... many more
]);
```

### 5. Batch Operations (Always Recommended)

Group operations to minimize API calls where possible - **this is more important than rate limiting**:

**Append Multiple Blocks:**
```javascript
// Bad: 10 API calls
for (const block of blocks) {
  await notionClient.blocks.append({
    block_id: parentId,
    children: [block]
  });
}

// Good: 1 API call (up to 100 blocks)
await notionClient.blocks.append({
  block_id: parentId,
  children: blocks  // Max 100
});
```

**Parallel Fetches (with throttling):**
```javascript
// Bad: Sequential (slow)
const pages = [];
for (const id of pageIds) {
  const page = await notionClient.pages.retrieve({ page_id: id });
  pages.push(page);
}

// Good: Parallel with queue
const queue = new RequestQueue(2);
const pages = await Promise.all(
  pageIds.map(id =>
    queue.add(() => notionClient.pages.retrieve({ page_id: id }))
  )
);
```

## Complete Integration (Simplified - Reactive Approach)

**For typical MCP usage**, use a simple reactive approach:

```javascript
import fetch from 'node-fetch';

class NotionClientSimple {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.notion.com/v1';
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
  }

  async request(endpoint, options = {}, maxRetries = 3) {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: { ...this.headers, ...options.headers }
        });

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitSeconds = retryAfter ? parseInt(retryAfter) : Math.pow(2, attempt + 1);

          if (attempt < maxRetries - 1) {
            console.warn(`Rate limited (429). Waiting ${waitSeconds}s... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            attempt++;
            continue;
          }
        }

        // Parse response
        const data = await response.json();

        if (!response.ok) {
          const error = new Error(data.message || response.statusText);
          error.status = response.status;
          error.code = data.code;
          throw error;
        }

        return data;

      } catch (error) {
        // Retry network errors, but not API errors
        if (attempt < maxRetries - 1 && !error.status) {
          const delay = Math.pow(2, attempt + 1) * 1000;
          console.warn(`Network error. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }

        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  // API methods
  async retrievePage(pageId) {
    return this.request(`/pages/${pageId}`, { method: 'GET' });
  }

  async queryDatabase(databaseId, filter = {}, sorts = [], startCursor, pageSize = 100) {
    return this.request(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ filter, sorts, start_cursor: startCursor, page_size: pageSize })
    });
  }
}

// Usage - no throttling needed for normal MCP usage
const client = new NotionClientSimple(process.env.NOTION_API_TOKEN);
const page = await client.retrievePage('abc123');
```

## Best Practices Summary

### For Typical MCP Usage (Single Requests)

1. **Use Reactive Handling (Not Proactive Throttling)**
   - Handle 429 errors when they occur
   - Respect `Retry-After` header
   - Don't slow down normal requests with throttling

2. **Implement Simple Retry Logic**
   - Max 3 retries with exponential backoff fallback
   - Use `Retry-After` header when available
   - Small jitter (±10%) to avoid thundering herd

3. **Batch Where Possible**
   - Append multiple blocks in one call (max 100)
   - Reduces total API calls more than throttling helps
   - This is the #1 optimization

4. **Cache Aggressively**
   - Block IDs are stable - cache by ID
   - Invalidate on updates
   - Reduces API load more than any rate limiting strategy

### For Bulk Operations Only

5. **Optional Light Throttling**
   - Use ~2.5 req/sec for sustained bulk operations
   - Only when doing 100+ requests in succession
   - Not needed for typical MCP usage

6. **Monitor 429 Frequency**
   - If you see many 429s, then consider throttling
   - If you rarely see 429s, don't throttle

7. **Optimize Nested Fetches**
   - Fetch only necessary depth
   - Use `has_children` to skip unnecessary calls
   - Consider lazy loading for deep structures

### Key Insight

**Bursts are allowed** - the limit is an average of 3/sec, not a hard cap. Occasional spikes are fine. Don't prematurely optimize with aggressive throttling.

## Monitoring Example

```javascript
class RateLimitMonitor {
  constructor() {
    this.stats = {
      total: 0,
      rateLimited: 0,
      retries: 0,
      errors: 0
    };
  }

  recordRequest() {
    this.stats.total++;
  }

  recordRateLimit() {
    this.stats.rateLimited++;
  }

  recordRetry() {
    this.stats.retries++;
  }

  recordError() {
    this.stats.errors++;
  }

  report() {
    console.log('Rate Limit Stats:', {
      ...this.stats,
      rateLimitRate: (this.stats.rateLimited / this.stats.total * 100).toFixed(2) + '%',
      avgRetriesPerRateLimit: (this.stats.retries / Math.max(this.stats.rateLimited, 1)).toFixed(2)
    });
  }
}

const monitor = new RateLimitMonitor();

// In your client
async executeWithRetry(endpoint, options, maxRetries) {
  monitor.recordRequest();

  // ... retry logic with monitor.recordRateLimit() and monitor.recordRetry()
}

// Periodic reporting
setInterval(() => monitor.report(), 60000);  // Every minute
```

## Resources

- [Notion API Rate Limits](https://developers.notion.com/reference/rate-limits)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
