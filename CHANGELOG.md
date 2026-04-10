# Changelog

All notable changes to this project are documented in this file.

## [Unreleased] — 2026-04-10

### Added

- **Auto-pagination for `notion_query_database`** — Automatically loops through all pages of results (100 per request) until exhausted. Returns the complete dataset in a single response. The `start_cursor` and `page_size` parameters have been removed from this tool since pagination is now handled internally.

- **Auto-pagination for `notion_search`** — Same auto-pagination behavior as `notion_query_database`. Loops until `has_more` is false, returns everything.

- **`notion_create_page` tool** — Create pages under any parent type (page or database). Supports content blocks (`children`), `icon`, and `cover` in addition to `properties`. This is a superset of `notion_create_database_item`, which is retained for backward compatibility.

- **`notion_archive_page` tool** — Archive or restore a page by setting `archived` to `true` or `false`.

- **`notion_retrieve_page_property_item` tool** — Retrieve a specific property value from a page. Auto-paginates for property types that return lists (relations, rollups, rich_text, title, people).

- **Install script (`install.sh`)** — Interactive installer that checks prerequisites, installs dependencies, builds the project, and outputs a ready-to-paste MCP client config. Supports non-interactive mode via `NOTION_API_TOKEN` env var.

- **`CLAUDE.md`** — Project documentation for AI-assisted development, covering architecture, tools, build/run instructions, and configuration.

- **`skills/` directory** — Usage guides for common Notion operations:
  - `query-database.md` — Querying databases with filters and sorts
  - `search-workspace.md` — Searching across the workspace
  - `create-update-pages.md` — Creating, updating, and archiving pages
  - `work-with-blocks.md` — Reading, appending, updating, and deleting blocks

- **`agents/` directory** — Agent definitions for complex workflows:
  - `report-generator.md` — Query a database and produce a structured report
  - `workspace-search.md` — Search and summarize content across Notion

- **`CHANGELOG.md`** — This file.

- **Auto-pagination tests** — New test cases verifying multi-page pagination for `queryDatabase` and `search` methods.

### Changed

- **`notion_query_database` schema** — Removed `start_cursor` and `page_size` parameters (auto-pagination handles this). Updated description to reflect auto-pagination.

- **`notion_search` schema** — Removed `start_cursor` and `page_size` parameters. Updated description.

- **README.md** — Complete rewrite with disclaimer about fork origin and AI-assisted development, quick install instructions, table-formatted tool reference, and auto-pagination documentation.

- **Tool count** — 18 tools → 21 tools.

## [1.2.4] — Prior release (upstream)

Upstream release from [@suekou/mcp-notion-server](https://github.com/suekou/mcp-notion-server). See the [original repository](https://github.com/suekou/mcp-notion-server) for prior history.
