import { describe, expect, test } from "vitest";
import type { DataSourceResponse, ListResponse } from "../types/index.js";
import { summarizeDataSourceSchema, summarizeFindResults } from "./index.js";

describe("summary helpers", () => {
  test("should summarize search results into compact find candidates", () => {
    const response: ListResponse = {
      object: "list",
      next_cursor: "next",
      has_more: true,
      results: [
        {
          object: "page",
          id: "page123",
          created_time: "2026-01-01T00:00:00.000Z",
          last_edited_time: "2026-01-01T00:00:00.000Z",
          parent: { type: "workspace" },
          properties: {
            Name: {
              id: "title",
              type: "title",
              title: [{ type: "text", text: { content: "Roadmap" } }],
            },
          },
          url: "https://notion.so/page123",
        },
        {
          object: "data_source",
          id: "ds123",
          title: [{ type: "text", text: { content: "Tasks" } }],
          parent: { type: "database_id", database_id: "db123" },
          properties: {},
        },
      ],
    };

    expect(summarizeFindResults(response, "task")).toEqual({
      object: "notion_find_results",
      query: "task",
      next_cursor: "next",
      has_more: true,
      results: [
        {
          object: "page",
          id: "page123",
          title: "Roadmap",
          url: "https://notion.so/page123",
          parent: { type: "workspace" },
          suggested_next_tool: "notion_retrieve_page",
        },
        {
          object: "data_source",
          id: "ds123",
          title: "Tasks",
          parent: { type: "database_id", database_id: "db123" },
          suggested_next_tool: "notion_inspect_data_source",
        },
      ],
    });
  });

  test("should summarize data source schema with options and create hint", () => {
    const dataSource: DataSourceResponse = {
      object: "data_source",
      id: "ds123",
      title: [{ type: "text", text: { content: "Tasks" } }],
      parent: { type: "database_id", database_id: "db123" },
      properties: {
        Name: {
          id: "title",
          name: "Name",
          type: "title",
          title: {},
        },
        Status: {
          id: "status",
          name: "Status",
          type: "status",
          status: {
            options: [
              { id: "todo", name: "Todo", color: "default" },
              { id: "done", name: "Done", color: "green" },
            ],
          },
        },
      },
    };

    expect(summarizeDataSourceSchema(dataSource)).toEqual({
      object: "notion_data_source_schema",
      id: "ds123",
      title: "Tasks",
      parent_database_id: "db123",
      property_count: 2,
      properties: [
        { name: "Name", id: "title", type: "title" },
        {
          name: "Status",
          id: "status",
          type: "status",
          options: ["Todo", "Done"],
        },
      ],
      create_item_hint: {
        tool: "notion_create_data_source_item",
        required_parent: { data_source_id: "ds123" },
      },
    });
  });
});
