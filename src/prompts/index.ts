import type { GetPromptResult, Prompt } from "@modelcontextprotocol/sdk/types.js";

type PromptArguments = Record<string, string> | undefined;

export const notionPrompts: Prompt[] = [
  {
    name: "notion_find_target",
    title: "Find Notion Target",
    description:
      "Find the right Notion page or data source before reading, editing, or creating content.",
    arguments: [
      {
        name: "target",
        description: "The title, partial name, or description of the Notion target.",
        required: true,
      },
    ],
  },
  {
    name: "notion_create_database_item",
    title: "Create Notion Database Item",
    description:
      "Create a data source item using schema inspection and simple property values.",
    arguments: [
      {
        name: "data_source",
        description: "The data source name or ID.",
        required: true,
      },
      {
        name: "item",
        description: "The item to create, described in natural language.",
        required: true,
      },
    ],
  },
  {
    name: "notion_append_page_content",
    title: "Append Notion Page Content",
    description:
      "Append readable content to a Notion page using the simplified content tool.",
    arguments: [
      {
        name: "page",
        description: "The page title or ID.",
        required: true,
      },
      {
        name: "content",
        description: "The content to append.",
        required: true,
      },
    ],
  },
];

export function getNotionPrompt(
  name: string,
  args: PromptArguments
): GetPromptResult {
  switch (name) {
    case "notion_find_target":
      return promptResult(
        "Find a Notion page or data source",
        [
          `Find the Notion target for: ${requireArg(args, "target")}`,
          "Use `notion_find` first. Prefer `object_type` when the target kind is clear.",
          "Return the best candidate ID, title, object type, and the suggested next tool.",
          "If multiple candidates look plausible, ask the user to choose rather than guessing.",
        ].join("\n")
      );
    case "notion_create_database_item":
      return promptResult(
        "Create a Notion data source item",
        [
          `Data source: ${requireArg(args, "data_source")}`,
          `Item request: ${requireArg(args, "item")}`,
          "Workflow:",
          "1. Use `notion_find` with `object_type: \"data_source\"` if the data source ID is not already provided.",
          "2. Use `notion_inspect_data_source` to get exact property names, option values, and relation fields.",
          "3. Use `notion_create_data_source_item_from_values` with simple values whenever possible.",
          "4. If a property type is unsupported by simple values, fall back to `notion_create_data_source_item` with raw Notion property JSON.",
        ].join("\n")
      );
    case "notion_append_page_content":
      return promptResult(
        "Append content to a Notion page",
        [
          `Page: ${requireArg(args, "page")}`,
          `Content: ${requireArg(args, "content")}`,
          "Workflow:",
          "1. Use `notion_find` with `object_type: \"page\"` if the page ID is not already provided.",
          "2. Use `notion_append_content` for paragraphs, headings, todos, lists, quotes, callouts, code, and dividers.",
          "3. Use `notion_append_block_children` only when the requested block type requires raw Notion block JSON.",
          "4. Keep appended batches reviewable and preserve the user's wording unless they ask for rewriting.",
        ].join("\n")
      );
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

function promptResult(description: string, text: string): GetPromptResult {
  return {
    description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text,
        },
      },
    ],
  };
}

function requireArg(args: PromptArguments, name: string): string {
  const value = args?.[name];
  if (!value) {
    throw new Error(`Missing required prompt argument: ${name}`);
  }
  return value;
}
