import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { NotionResponse } from "../notion/types.js";

export function formatJsonToolResult(response: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
    structuredContent: toStructuredContent(response),
  };
}

export function formatToolError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  const output = { error: { message } };

  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
    isError: true,
  };
}

export function isMarkdownConvertibleResponse(
  response: unknown,
): response is NotionResponse {
  return (
    !!response &&
    typeof response === "object" &&
    "object" in response &&
    [
      "page",
      "database",
      "data_source",
      "block",
      "list",
      "user",
      "comment",
    ].includes((response as { object: string }).object)
  );
}

function toStructuredContent(response: unknown): Record<string, unknown> {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    return response as Record<string, unknown>;
  }

  return { value: response };
}
