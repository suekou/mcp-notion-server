import { describe, expect, test } from "vitest";
import { buildPagePropertiesFromSimpleValues } from "./index.js";
import { DataSourceResponse } from "../types/index.js";

const dataSource: DataSourceResponse = {
  object: "data_source",
  id: "ds123",
  parent: { type: "database_id", database_id: "db123" },
  properties: {
    Name: { id: "title", name: "Name", type: "title", title: {} },
    Notes: { id: "notes", name: "Notes", type: "rich_text", rich_text: {} },
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
    Priority: {
      id: "priority",
      name: "Priority",
      type: "select",
      select: {
        options: [
          { id: "high", name: "High", color: "red" },
          { id: "low", name: "Low", color: "gray" },
        ],
      },
    },
    Due: { id: "due", name: "Due", type: "date", date: {} },
    Done: { id: "done", name: "Done", type: "checkbox", checkbox: {} },
    Estimate: { id: "estimate", name: "Estimate", type: "number", number: {} },
    Related: { id: "rel", name: "Related", type: "relation", relation: {} },
  },
};

describe("property value builder", () => {
  test("should convert simple values to Notion page properties", () => {
    expect(
      buildPagePropertiesFromSimpleValues(dataSource, {
        Name: "Ship MCP update",
        Notes: "Use simple values",
        Status: "Done",
        Tags: ["AI", "Notion"],
        Priority: "High",
        Due: { start: "2026-05-04", end: "2026-05-05" },
        Done: true,
        Estimate: 3,
        Related: ["page-a", "page-b"],
      })
    ).toEqual({
      Name: {
        title: [
          {
            type: "text",
            text: { content: "Ship MCP update" },
            plain_text: "Ship MCP update",
          },
        ],
      },
      Notes: {
        rich_text: [
          {
            type: "text",
            text: { content: "Use simple values" },
            plain_text: "Use simple values",
          },
        ],
      },
      Status: { status: { name: "Done" } },
      Tags: { multi_select: [{ name: "AI" }, { name: "Notion" }] },
      Priority: { select: { name: "High" } },
      Due: { date: { start: "2026-05-04", end: "2026-05-05" } },
      Done: { checkbox: true },
      Estimate: { number: 3 },
      Related: { relation: [{ id: "page-a" }, { id: "page-b" }] },
    });
  });

  test("should reject unknown properties", () => {
    expect(() =>
      buildPagePropertiesFromSimpleValues(dataSource, { Missing: "value" })
    ).toThrow("Unknown property 'Missing'");
  });

  test("should reject unknown select options with valid choices", () => {
    expect(() =>
      buildPagePropertiesFromSimpleValues(dataSource, { Priority: "Urgent" })
    ).toThrow(
      "Property 'Priority' does not have option 'Urgent'. Valid options: High, Low."
    );
  });

  test("should suggest case-insensitive option matches", () => {
    expect(() =>
      buildPagePropertiesFromSimpleValues(dataSource, { Status: "done" })
    ).toThrow("Did you mean 'Done'?");
  });

  test("should reject unknown multi-select options", () => {
    expect(() =>
      buildPagePropertiesFromSimpleValues(dataSource, {
        Tags: ["AI", "Docs"],
      })
    ).toThrow(
      "Property 'Tags' does not have option 'Docs'. Valid options: AI, Notion."
    );
  });
});
