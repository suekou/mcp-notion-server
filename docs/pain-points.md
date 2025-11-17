# Notion API Pain Points and Considerations

This document outlines the major pain points, limitations, and workarounds when working with the Notion API.

## Top Pain Points

### 1. Nested Blocks Require Separate Calls ⚠️ MOST FRUSTRATING

**Problem:** Toggles, columns, synced blocks, and other container types require exponentially more API calls.

**Impact:**
- One request for parent → get block IDs → additional request for each child container
- Deeply nested structures can require 10-100+ API calls
- Quickly hits rate limits (3 req/sec)
- Exponential complexity with nesting depth

**Example:**
```
Page with 5 toggle blocks, each containing 3 bullet points
= 1 call (page) + 5 calls (toggle children) = 6 calls total

If those bullet points contain toggles:
= 1 + 5 + 15 = 21 calls total
```

**Workaround:**
- Implement recursive fetching with batching
- Cache aggressively by block ID
- Use `has_children` property to skip unnecessary calls
- Consider fetching only visible/expanded sections initially

**Implementation:**
```javascript
async function fetchNestedBlocks(blockId, maxDepth = 3) {
  const blocks = await notion_blocks({
    operation: "retrieve",
    block_id: blockId
  });

  if (maxDepth <= 0) return blocks;

  // Batch child requests
  const childPromises = blocks.results
    .filter(b => b.has_children)
    .map(b => fetchNestedBlocks(b.id, maxDepth - 1));

  await Promise.all(childPromises);
  return blocks;
}
```

### 2. Image URL Expiration (1 Hour) 🖼️

**Problem:** Image URLs expire after ~1 hour, breaking static site generation.

**Impact:**
- Cannot use URLs directly in static sites
- Every API fetch returns new temporary URLs
- Need proxy/CDN or download-and-cache pattern

**Workaround:**
- **Download and cache:** Store images in S3/R2, key by block ID (stable)
- **Proxy through CDN:** Cloudflare Worker that fetches and caches
- **Build-time download:** Download all images during site build
- **On-demand proxy:** Backend endpoint that proxies image requests

**Implementation (Download & Cache):**
```javascript
async function cacheImage(imageBlock) {
  const url = imageBlock.image.file?.url || imageBlock.image.external?.url;
  if (!url) return null;

  // Check if already cached
  const cacheKey = `images/${imageBlock.id}`;
  if (await cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Download and store
  const response = await fetch(url);
  const buffer = await response.buffer();

  // Upload to S3/R2
  const permanentUrl = await uploadToStorage(cacheKey, buffer);
  await cache.set(cacheKey, permanentUrl);

  return permanentUrl;
}
```

### 3. Rate Limits: 3 Requests/Second ⏱️

**Problem:** Official limit is 3 req/sec average, can be hit during bulk operations.

**Impact:**
- Nested block fetching can hit limits with deep structures
- Large-scale sync operations may encounter 429 errors
- HTTP 429 errors with `rate_limited` code

**Official Limits:**
- **Average:** 3 requests/second per integration token
- **Same across ALL tiers:** Free, Plus, Business, Enterprise (no difference)
- **Bursts allowed:** Occasional spikes above 3/sec are permitted
- **Error handling:** HTTP 429 with `Retry-After` header (integer seconds)

**Workaround:**
- **For typical MCP usage:** Handle 429 reactively with `Retry-After` header (no proactive throttling needed)
- **For bulk operations only:** Optional light throttling (~2.5 req/sec)
- Batch operations where possible (more important than throttling)
- Cache aggressively

**Implementation:**
See [rate-limiting.md](./rate-limiting.md) for detailed strategies - focuses on reactive handling rather than aggressive throttling.

### 4. Pagination Issues 📄

**Problem:** Unreliable cursors and payload size limits.

**Issues:**
- `next_cursor` sometimes returns `null` unexpectedly
- `next_cursor` can become invalid mid-pagination
- `PayloadTooLargeError` when accumulating ~300+ items in request body
- Search endpoint pagination particularly unreliable

**Workaround:**
- Validate `next_cursor` before use: `if (cursor && cursor !== "null")`
- Accumulate results client-side, not in request body
- Keep page size at 100 (max)
- Implement error recovery for invalid cursors
- For search, consider limiting results or using filters

**Implementation:**
```javascript
async function paginateQuery(databaseId, filter = {}) {
  let allResults = [];
  let cursor = undefined;
  let attempts = 0;
  const maxAttempts = 100; // Safety limit

  while (attempts < maxAttempts) {
    const response = await notion_databases({
      operation: "query",
      database_id: databaseId,
      filter,
      start_cursor: cursor,
      page_size: 100
    });

    allResults = allResults.concat(response.results);

    // Validate cursor
    if (!response.has_more || !response.next_cursor ||
        response.next_cursor === "null") {
      break;
    }

    cursor = response.next_cursor;
    attempts++;
  }

  return allResults;
}
```

### 5. Slow Performance (4-10+ Seconds) 🐌

**Problem:** API responses can take 4-10 seconds, especially search endpoint.

**Impact:**
- User-facing apps feel sluggish
- Compounds all other issues (rate limits, pagination)
- Timeouts on slower networks

**Workaround:**
- Implement aggressive caching (Redis, in-memory)
- Use webhooks for change detection instead of polling
- Parallel requests where possible (but mind rate limits)
- Implement optimistic UI updates
- Consider database query endpoint over search when possible

### 6. Property Truncation (25 Item Limit) ✂️

**Problem:** Relations and rollups limited to first 25 items in standard responses.

**Impact:**
- Incomplete data for large relations
- Rollup calculations incorrect
- Requires separate API calls per property

**Workaround:**
- Use "Retrieve page property item" endpoint for full data
- Make separate calls for properties known to exceed 25 items
- Perform rollup aggregations client-side
- Cache property item responses

**Implementation:**
```javascript
async function getFullProperty(pageId, propertyId) {
  let allItems = [];
  let cursor = undefined;

  while (true) {
    const response = await notion_pages({
      operation: "retrieve",
      page_id: pageId,
      retrieve_property_item_id: propertyId,
      start_cursor: cursor
    });

    allItems = allItems.concat(response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  return allItems;
}
```

## Additional Friction Points

### 7. Views Not Accessible via API

**Problem:** Cannot retrieve database views (filters, sorts, layouts).

**Workaround:** Store view configurations in your app or reconstruct filters/sorts manually.

### 8. No Full-Text Content Search

**Problem:** Search endpoint only searches page/database titles, not content.

**Workaround:**
- Build custom search by fetching all content and indexing locally
- Use Algolia, Meilisearch, or similar
- Implement content indexing on sync

### 9. Comments Always Created by Bot User

**Problem:** Cannot impersonate workspace members in comments.

**Workaround:** Prefix comment text with user attribution: `"@username: message"`

### 10. No Bulk Operations

**Problem:** No batch create/update endpoints.

**Workaround:**
- Queue operations with rate limiting
- Use Promise.all with throttling
- Consider background job processor

### 11. No Prepend or Reorder Blocks

**Problem:** "Append block children" always appends to end; no insert-at-position or reorder.

**Workaround:**
- Read-modify-write pattern: fetch all blocks, delete, recreate in desired order
- Very inefficient for large documents

### 12. Delete is Actually Archive

**Problem:** "Delete block" endpoint sets `archived: true` (moved to Trash), not permanent deletion.

**Workaround:** None - this is by design. User must empty Trash manually in UI.

## Summary Table

| Pain Point | Severity | Workaround Difficulty |
|-----------|----------|---------------------|
| Nested blocks require separate calls | 🔴 Critical | Medium |
| Image URL expiration | 🔴 Critical | Medium |
| Rate limits (3 req/sec) | 🟠 High | Medium |
| Pagination issues | 🟠 High | Low |
| Slow performance | 🟠 High | Medium |
| Property truncation (25 items) | 🟡 Medium | Low |
| Views not accessible | 🟡 Medium | High |
| No full-text search | 🟡 Medium | High |
| Comments always bot user | 🟢 Low | Low |
| No bulk operations | 🟢 Low | Medium |
| No prepend/reorder | 🟢 Low | High |
| Delete is archive | 🟢 Low | None |

## Best Practices Summary

1. **Cache aggressively** - Block IDs are stable, cache by ID
2. **Throttle proactively** - Don't wait for 429s
3. **Batch where possible** - Parallel requests with limits
4. **Validate cursors** - Check for null/invalid before use
5. **Download images** - Don't use temporary URLs in production
6. **Recursive fetch with limits** - Max depth for nested blocks
7. **Monitor and log** - Track API call volume and errors
8. **Graceful degradation** - Handle missing data, show partial results

## Resources

- [Notion API Rate Limits](https://developers.notion.com/reference/rate-limits)
- [Working with Page Content](https://developers.notion.com/docs/working-with-page-content)
- [Pagination](https://developers.notion.com/reference/pagination)
