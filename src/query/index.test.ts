import { describe, expect, test } from "vitest";
import type { DataSourceResponse } from "../types/index.js";
import { buildDataSourceQueryFromSimpleFilters } from "./index.js";

const dataSource: DataSourceResponse = {
  object: "data_source",
  id: "ds123",
  parent: { type: "database_id", database_id: "db123" },
  properties: {
    Name: { id: "title", name: "Name", type: "title", title: {} },
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
    Tags: {
      id: "tags",
      name: "Tags",
      type: "multi_select",
      multi_select: {
        options: [
          { id: "ai", name: "AI", color: "blue" },
          { id: "notion", name: "Notion", color: "default" },
        ],
      },
    },
    Estimate: { id: "estimate", name: "Estimate", type: "number", number: {} },
    Done: { id: "done", name: "Done", type: "checkbox", checkbox: {} },
    Due: { id: "due", name: "Due", type: "date", date: {} },
    Related: { id: "rel", name: "Related", type: "relation", relation: {} },
  },
};

describe("simple data source query builder", () => {
  test("should build schema-aware filters and sorts", () => {
    expect(
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        match: "all",
        filters: [
          { property: "Name", value: "MCP" },
          { property: "Status", value: "Done" },
          { property: "Tags", value: "AI" },
          { property: "Estimate", operator: "greater_than", value: 2 },
          { property: "Done", value: false },
          { property: "Due", operator: "on_or_before", value: "2026-05-04" },
          { property: "Related", value: "page123" },
        ],
        sorts: [{ property: "Due", direction: "descending" }],
      }),
    ).toEqual({
      filter: {
        and: [
          { property: "Name", title: { contains: "MCP" } },
          { property: "Status", status: { equals: "Done" } },
          { property: "Tags", multi_select: { contains: "AI" } },
          { property: "Estimate", number: { greater_than: 2 } },
          { property: "Done", checkbox: { equals: false } },
          { property: "Due", date: { on_or_before: "2026-05-04" } },
          { property: "Related", relation: { contains: "page123" } },
        ],
      },
      sorts: [{ property: "Due", direction: "descending" }],
    });
  });

  test("should build an or filter when match is any", () => {
    expect(
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        match: "any",
        filters: [
          { property: "Status", value: "Done" },
          { property: "Status", value: "Todo" },
        ],
      }),
    ).toEqual({
      filter: {
        or: [
          { property: "Status", status: { equals: "Done" } },
          { property: "Status", status: { equals: "Todo" } },
        ],
      },
    });
  });

  test("should reject invalid option values with suggestions", () => {
    expect(() =>
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        filters: [{ property: "Status", value: "done" }],
      }),
    ).toThrow("Did you mean 'Done'?");
  });

  test("should reject unsupported operators for property types", () => {
    expect(() =>
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        filters: [{ property: "Status", operator: "contains", value: "Done" }],
      }),
    ).toThrow("Property 'Status' does not support operator 'contains'");
  });

  test("should reject malformed query shapes", () => {
    expect(() =>
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        match: "some" as any,
      }),
    ).toThrow("match must be either 'all' or 'any'");
    expect(() =>
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        filters: "Status is Done" as any,
      }),
    ).toThrow("filters must be an array when provided");
    expect(() =>
      buildDataSourceQueryFromSimpleFilters(dataSource, {
        sorts: [{ property: "Due", direction: "up" as any }],
      }),
    ).toThrow("sorts[0].direction must be either 'ascending' or 'descending'");
  });
});
