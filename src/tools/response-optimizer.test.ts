import { describe, expect, test } from "vitest";
import type {
  BlockResponse,
  ListResponse,
  PageResponse,
} from "../notion/types.js";
import { optimizeToolResponse } from "./response-optimizer.js";

describe("response optimizer", () => {
  test("should compact large list responses in auto mode", () => {
    const response = pageListResponse(11);

    const optimized = optimizeToolResponse(
      "notion_query_data_source",
      response,
      {},
    );

    expect(optimized).toMatchObject({
      object: "notion_compact_list",
      source_object: "list",
      result_count: 11,
      has_more: false,
      response_mode: "compact",
    });
    expect((optimized as { results: unknown[] }).results[0]).toMatchObject({
      object: "page",
      id: "page-0",
      title: "Task 0",
      properties: {
        Name: "Task 0",
        Status: "Done",
      },
    });
  });

  test("should preserve full responses when requested", () => {
    const response = pageListResponse(11);

    const optimized = optimizeToolResponse(
      "notion_query_data_source",
      response,
      { response_mode: "full" },
    );

    expect(optimized).toBe(response);
  });

  test("should compact block children into stable IDs and text", () => {
    const response: ListResponse = {
      object: "list",
      results: [
        {
          object: "block",
          id: "block-1",
          type: "paragraph",
          created_time: "2026-05-04T00:00:00.000Z",
          last_edited_time: "2026-05-04T00:00:00.000Z",
          has_children: false,
          in_trash: false,
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Hello" },
                plain_text: "Hello",
              },
            ],
          },
        } satisfies BlockResponse,
      ],
      next_cursor: null,
      has_more: false,
    };

    const optimized = optimizeToolResponse(
      "notion_retrieve_block_children",
      response,
      { response_mode: "compact" },
    );

    expect((optimized as { results: unknown[] }).results[0]).toEqual({
      object: "block",
      id: "block-1",
      type: "paragraph",
      text: "Hello",
      has_children: false,
      in_trash: false,
    });
  });

  test("should leave small auto responses unchanged", () => {
    const response = pageListResponse(1);

    const optimized = optimizeToolResponse(
      "notion_query_data_source",
      response,
      {},
    );

    expect(optimized).toBe(response);
  });
});

function pageListResponse(count: number): ListResponse {
  return {
    object: "list",
    results: Array.from({ length: count }, (_, index) => pageResponse(index)),
    next_cursor: null,
    has_more: false,
  };
}

function pageResponse(index: number): PageResponse {
  return {
    object: "page",
    id: `page-${index}`,
    created_time: "2026-05-04T00:00:00.000Z",
    last_edited_time: "2026-05-04T00:00:00.000Z",
    in_trash: false,
    parent: { type: "data_source_id", data_source_id: "data-source-1" },
    properties: {
      Name: {
        id: "title",
        type: "title",
        title: [
          {
            type: "text",
            text: { content: `Task ${index}` },
            plain_text: `Task ${index}`,
          },
        ],
      },
      Status: {
        id: "status",
        type: "status",
        status: { name: "Done" },
      },
    },
  };
}
