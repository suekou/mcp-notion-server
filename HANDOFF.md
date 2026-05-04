# HANDOFF

## Context

This repository is `@suekou/mcp-notion-server`, a local MCP server for the Notion API. The work so far modernizes the project for Notion API `2026-03-11`, Node.js 24 LTS, pnpm, and AI-friendly tool usage.

The user commits manually. Do not create commits unless explicitly asked. Work in reasonably sized commit units, stop after each unit, and suggest an English conventional commit message (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`).

Important product direction from the user:

- Do not add extra `plan_` / dry-run tools just for safety. Current AI can reason well enough, and validation/type mismatches should be returned as clear tool errors.
- Avoid “あれもこれも” additions. Prefer practical tools that follow MCP and agent tool-design best practices.
- Keep the product goal in focus: latest Notion API + useful AI-facing workflows that are more convenient than the official local OpenAPI-style server.

## Environment Notes

- Development uses `pnpm`, not npm.
- Runtime target is Node.js 24 LTS.
- Local terminal currently reports Node `v22.21.1`, not Node 24.
- Because `.npmrc` has `engine-strict=true`, local verification has been run with:

```bash
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false run build
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false test
```

- CI uses Node 24 and should run without disabling engine checks.
- `ReadLints` may report a TypeScript IDE diagnostic for `.js` ESM imports such as `../client/index.js` in `src/server/index.ts`. `tsc` passes; treat it as non-blocking unless build fails.

## Current Verification

Latest verification passed:

```bash
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false run build
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false test
```

Result:

- Build passed.
- Test suite passed.
- 20 test files passed.
- 114 tests passed.

## Current State

### Runtime, Package, CI

- `package.json` is version `2.0.0`.
- Uses `pnpm@10.24.0`.
- Requires Node `>=24 <25`.
- `package-lock.json` was removed; `pnpm-lock.yaml` is used.
- `.npmrc` enforces engine/package-manager strictness.
- `.node-version` is present.
- `.github/workflows/ci.yml` runs Node 24 + pnpm install/build/test.
- `package.json` `files` includes `build` and `README.md`.

### Notion API Modernization

- Notion API header is `Notion-Version: 2026-03-11`.
- Database-centric operations were migrated toward data sources.
- `notion_retrieve_database` remains for discovering child `data_source_id` values from a database container.
- Data source tools now include:
  - `notion_create_data_source`
  - `notion_query_data_source`
  - `notion_query_data_source_by_values`
  - `notion_retrieve_data_source`
  - `notion_update_data_source`
  - `notion_create_data_source_item`
  - `notion_create_data_source_item_from_values`
- Append block children uses `position`, not old `after`.
- Types/docs/tests now prefer `in_trash` over `archived`.
- `meeting_notes` replaced old `transcription` concept where applicable.
- Markdown conversion supports `data_source` responses.

### Notion API Request Handling

- Removed `node-fetch` and `@types/node-fetch`.
- Uses native Node 24 `fetch`.
- `src/client/index.ts` has a shared request helper with:
  - timeout
  - retry for `429` and `5xx`
  - `Retry-After` support
  - `response.ok` handling
  - structured `NotionApiError`
- Tests cover native fetch behavior, API errors, retry, and timeout.

### MCP Behavior

- Server still uses `@modelcontextprotocol/sdk` v1.x.
- Tools have MCP annotations where useful:
  - read-only hints for read/search/query tools
  - destructive hint for delete
  - idempotency hints for safe updates
- Tool results include `structuredContent` for JSON-like responses.
- Tool errors return `isError: true`, so the model can self-correct.
- Prompts and resources are exposed:
  - `prompts/list`
  - `prompts/get`
  - `resources/list`
  - `resources/read`

## Current Tool Surface

### AI-Friendly Tools

- `notion_find`: compact search results with stable IDs and suggested next tools.
- `notion_inspect_data_source`: compact property schema summary with option names and relation targets.
- `notion_read_page`: page metadata + compact block outline/Markdown with stable block IDs.
- `notion_query_data_source_by_values`: schema-aware filters/sorts for common data source queries.
- `notion_create_data_source_item_from_values`: create data source item from simple values with schema validation.
- `notion_append_content`: append simple Notion content item DSL.
- `notion_append_markdown`: append safe Markdown subset as Notion blocks.
- `notion_update_content`: update one existing simple block after validating current block type.
- `notion_update_content_batch`: update multiple simple blocks after validating all current block types.

### Low-Level Tools

- Blocks:
  - `notion_append_block_children`
  - `notion_retrieve_block`
  - `notion_retrieve_block_children`
  - `notion_update_block`
  - `notion_delete_block`
- Pages:
  - `notion_retrieve_page`
  - `notion_update_page_properties`
- Data sources/databases:
  - `notion_retrieve_database`
  - `notion_create_data_source`
  - `notion_query_data_source`
  - `notion_retrieve_data_source`
  - `notion_update_data_source`
  - `notion_create_data_source_item`
- Comments/users/search:
  - `notion_create_comment`
  - `notion_retrieve_comments`
  - `notion_list_all_users`
  - `notion_retrieve_user`
  - `notion_retrieve_bot_user`
  - `notion_search`

There are intentionally no `plan_` tools now. The previous `notion_plan_page_edit` was removed after user feedback.

## Important Files

- `package.json`: package metadata, pnpm/Node settings, scripts.
- `.github/workflows/ci.yml`: Node 24 CI.
- `src/index.ts`: CLI/env entry point.
- `src/client/index.ts`: Notion API wrapper and request helper.
- `src/server/index.ts`: MCP server, tool dispatch, prompts/resources handlers.
- `src/types/schemas.ts`: MCP tool schemas and annotations.
- `src/types/args.ts`: tool argument types.
- `src/types/responses.ts`: Notion response types.
- `src/content/`: simple content DSL, Markdown subset parser, content update validation.
- `src/page/`: page outline/Markdown reading helpers.
- `src/properties/`: simple data source item value conversion and option validation.
- `src/query/`: schema-aware simple query builder.
- `src/summary/`: compact find/schema summaries.
- `src/prompts/`: workflow prompts.
- `src/resources/`: static guidance resources.
- `src/markdown/`: Notion response to Markdown conversion.

## Completed Commit Units

The user has committed these units manually:

- `chore: migrate tooling to pnpm and Node 24`
- `feat: migrate Notion API tools to data sources`
- `feat: harden Notion API request handling`
- `feat: add MCP tool annotations and structured results`
- `feat: add AI-friendly Notion discovery tools`
- `feat: add simple Notion content append tool`
- `feat: create Notion items from simple values`
- `feat: add Notion workflow prompts`
- `feat: add Notion guidance resources`
- `ci: add Node 24 pnpm validation`
- `docs: prepare 2.0 release notes`
- `chore: polish package metadata for release`
- `feat: add compact Notion page reading tool`
- `feat: add simple Notion content update tool`
- `feat: validate simple data source option values`
- `feat: add schema-aware data source query tool`
- `feat: add batch simple content update tool`
- `feat: add dry-run page edit planning tool`
- `feat: add markdown append tool`
- `chore: remove page edit planning tool`

Note: The `feat: add dry-run page edit planning tool` commit was later counteracted by `chore: remove page edit planning tool`. Current code has no plan tool.

## Current Design Guidance

Prefer direct tools with clear validation errors over separate planning tools. Examples:

- If a block type is wrong, `notion_update_content` / `notion_update_content_batch` should return a clear tool error.
- If a data source option is invalid, `notion_create_data_source_item_from_values` and `notion_query_data_source_by_values` should return valid options and suggestions.
- If the user wants to edit a page, the intended flow is:
  1. `notion_find`
  2. `notion_read_page`
  3. `notion_append_markdown` / `notion_append_content` / `notion_update_content` / `notion_update_content_batch`
  4. raw block tools only for unsupported advanced shapes

Avoid adding wrappers that duplicate existing tool behavior unless they remove real complexity.
