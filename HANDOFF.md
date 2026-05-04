# HANDOFF

## Context

This repository is `@suekou/mcp-notion-server`, a local MCP server for the Notion API. The goal of this work is a major modernization: support current Notion API behavior, improve MCP protocol usage, and make the server much easier for AI agents than the official local OpenAPI-style server.

The user is committing changes manually. Do not create commits unless explicitly asked. Continue working in reasonably sized commit units, stop after each unit, and suggest an English commit message with a conventional prefix such as `feat:`, `chore:`, `docs:`, or `ci:`.

Development should use `pnpm`, not npm. Runtime target is Node.js 24 LTS.

## Environment Notes

- The local terminal currently reports Node `v22.21.1`, not Node 24.
- Because `.npmrc` has `engine-strict=true`, local verification has been run with:

```bash
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false run build
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false test
```

- CI uses Node 24 and should run without disabling engine checks.
- `ReadLints` repeatedly reports a TypeScript IDE diagnostic for `.js` ESM imports such as `../client/index.js` in `src/server/index.ts`, but `tsc` passes. Treat this as an IDE/module-resolution diagnostic unless it starts failing build.

## Completed Work

### Tooling and Runtime

- Migrated package manager metadata to pnpm:
  - Added `packageManager: "pnpm@10.24.0"`.
  - Added Node/pnpm `engines`.
  - Added `.node-version`.
  - Added `.npmrc` with strict package manager and engine checks.
  - Removed `package-lock.json`.
  - Added `pnpm-lock.yaml`.
- Moved `vitest` to `devDependencies`.
- Updated Node types to v24.
- Kept README usage examples on `npx`, because users commonly install/run CLI packages with `npx` even though development uses pnpm.

Suggested/used commit:

```text
chore: migrate tooling to pnpm and Node 24
```

### Notion API Migration

- Updated Notion API version header to `2026-03-11`.
- Migrated database-centric operations to data sources:
  - `notion_query_data_source`
  - `notion_create_data_source`
  - `notion_retrieve_data_source`
  - `notion_update_data_source`
  - `notion_create_data_source_item`
- Kept `notion_retrieve_database` as a discovery tool for finding child `data_source_id` values.
- Updated append block children from old `after` behavior to new `position`.
- Updated types/tests toward `in_trash` instead of `archived`.
- Added `data_source` response type support in Markdown conversion.

Suggested/used commit:

```text
feat: migrate Notion API tools to data sources
```

### Notion API Request Handling

- Removed `node-fetch` and `@types/node-fetch`.
- Switched to Node 24 native `fetch`.
- Added shared Notion request helper with:
  - timeout
  - retry for `429` and `5xx`
  - `Retry-After` support
  - `response.ok` handling
  - structured `NotionApiError`
- Added tests for native fetch, errors, retry, and timeout.

Suggested/used commit:

```text
feat: harden Notion API request handling
```

### MCP Tool Metadata and Results

- Added MCP `annotations` to tools:
  - read-only hints for read/search tools
  - destructive hint for `notion_delete_block`
  - idempotency hints where appropriate
- Added `structuredContent` for JSON tool results.
- Added `isError: true` for tool errors.
- Extracted server helper functions for tool list and result formatting.
- Added server helper tests.

Suggested/used commit:

```text
feat: add MCP tool annotations and structured results
```

### AI-Friendly Discovery Tools

- Added `src/summary/`.
- Added `notion_find`:
  - wraps search results into compact candidates
  - returns stable IDs, object type, title, parent, and suggested next tool
- Added `notion_inspect_data_source`:
  - returns compact schema summaries
  - includes property names, IDs, types, options, relation targets, and create-item hint
- Added tests and README docs.

Suggested/used commit:

```text
feat: add AI-friendly Notion discovery tools
```

### Simple Content Append Tool

- Added `src/content/`.
- Added `notion_append_content`, a simplified content DSL over Notion block JSON.
- Supported item types:
  - `paragraph`
  - `heading_1`
  - `heading_2`
  - `heading_3`
  - `bulleted_list_item`
  - `numbered_list_item`
  - `to_do`
  - `quote`
  - `callout`
  - `code`
  - `divider`
- Added tests and README docs.

Suggested/used commit:

```text
feat: add simple Notion content append tool
```

### Simple Data Source Item Creation

- Added `src/properties/`.
- Added `notion_create_data_source_item_from_values`.
- This retrieves the data source schema, then converts simple values into Notion page property JSON.
- Supported property types:
  - `title`
  - `rich_text`
  - `number`
  - `checkbox`
  - `select`
  - `status`
  - `multi_select`
  - `date`
  - `url`
  - `email`
  - `phone_number`
  - `relation`
  - `people`
- Unsupported/unknown properties throw clear errors so the AI can self-correct.
- Added tests and README docs.

Suggested/used commit:

```text
feat: create Notion items from simple values
```

### MCP Prompts

- Added `src/prompts/`.
- Added MCP prompt capability and handlers:
  - `prompts/list`
  - `prompts/get`
- Added prompts:
  - `notion_find_target`
  - `notion_create_database_item`
  - `notion_append_page_content`
- Added tests and README docs.

Suggested/used commit:

```text
feat: add Notion workflow prompts
```

### MCP Resources

- Added `src/resources/`.
- Added MCP resource capability and handlers:
  - `resources/list`
  - `resources/read`
- Added static guidance resources:
  - `notion://server/guide`
  - `notion://server/tools`
- Added tests and README docs.

Suggested/used commit:

```text
feat: add Notion guidance resources
```

### CI

- Added `.github/workflows/ci.yml`.
- CI runs:
  - Node 24
  - pnpm 10.24.0
  - `pnpm install --frozen-lockfile`
  - `pnpm run build`
  - `pnpm test`
- Added README development commands.

Suggested/used commit:

```text
ci: add Node 24 pnpm validation
```

### Release Docs

- Bumped package version to `2.0.0`.
- Updated package description.
- Added README sections:
  - Highlights
  - 2.0 Migration Notes
  - Recommended AI Workflow
- Updated project structure docs for new directories.
- Refreshed `pnpm-lock.yaml`.

Suggested/used commit:

```text
docs: prepare 2.0 release notes
```

## Current Verification Status

Latest verification command:

```bash
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false run build
pnpm --dir "/Users/suenaga.kosuke/Desktop/mcp/suekou-mcp-notion-server" --config.engine-strict=false test
```

Latest result:

- Build passed.
- Test suite passed.
- 16 test files passed.
- 84 tests passed.

README/package lints had no errors in the latest docs-only step.

## Important Files and Directories

- `package.json`: Node 24, pnpm, package version `2.0.0`.
- `pnpm-lock.yaml`: pnpm lockfile.
- `.github/workflows/ci.yml`: Node 24 CI.
- `src/client/index.ts`: Notion API wrapper and request helper.
- `src/server/index.ts`: MCP server, tools/prompts/resources handlers.
- `src/types/args.ts`: tool argument types.
- `src/types/schemas.ts`: MCP tool schemas and annotations.
- `src/types/responses.ts`: Notion response types.
- `src/content/`: simple content item to block JSON conversion.
- `src/properties/`: simple property value to Notion property JSON conversion.
- `src/summary/`: compact AI-friendly summaries.
- `src/prompts/`: reusable MCP prompts.
- `src/resources/`: static MCP guidance resources.
- `src/markdown/`: Notion response to Markdown conversion.

## Remaining Work

### Small Release Polish

- Fix `package.json` `files` entry:
  - It currently lists `Readme.md`.
  - It should be `README.md`.
- Consider reorganizing the README tool list into:
  - AI-first tools
  - Low-level Notion API tools
  - Prompts
  - Resources
- Run verification on an actual Node 24 environment without `engine-strict=false`:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm test
```

- Investigate the recurring IDE `ReadLints` warning for `.js` imports if desired. Since `tsc` passes, this is not currently blocking.

### Larger Product Work

- MCP SDK v2 migration:
  - Current implementation still uses `@modelcontextprotocol/sdk` v1.x.
  - Modern MCP concepts were added where supported, but the SDK package split has not been done.
- Streamable HTTP / remote deployment support.
- OAuth or other remote auth flow.
- Elicitation:
  - Use forms for choosing among multiple data source candidates.
  - Use confirmations for destructive operations.
  - Do not collect secrets via form elicitation.
- Markdown page editing:
  - Current writing is append-oriented.
  - A future `notion_edit_page_markdown` or patch workflow would be a major differentiator.
- Natural-language query/filter DSL:
  - Current simplification focuses on item creation values.
  - Query filters and sorts still use raw Notion-ish JSON.
- Real Notion integration testing:
  - Run against a sandbox workspace.
  - Validate `2026-03-11` data source behavior end to end.
  - Validate MCP Inspector flows.
- Better schema-aware validation:
  - Validate select/status option names against schema.
  - Improve relation/people handling.
  - Return suggestions when values do not match schema.

## Suggested Next Commit

For a small cleanup:

```text
chore: polish package metadata for release
```

Likely tasks:

- Change `files: ["build", "Readme.md"]` to `files: ["build", "README.md"]`.
- Maybe add `HANDOFF.md` to `.gitignore` or decide whether it should remain tracked. The user explicitly requested this file for agent handoff, so ask before ignoring/removing it.

For a larger feature:

```text
feat: add markdown page editing workflow
```

Likely tasks:

- Add a read-page outline/content helper.
- Add a safe section-based append/replace flow.
- Add tests using local block fixtures.

