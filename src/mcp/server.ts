/**
 * MCP server setup and request handling.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  CallToolResult,
  Prompt,
  Resource,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { NotionClientWrapper } from "../notion/client.js";
import { getNotionPrompt, notionPrompts } from "../prompts/index.js";
import { notionResources, readNotionResource } from "../resources/index.js";
import {
  appendBlockChildrenTool,
  deleteBlockTool,
  retrieveBlockChildrenTool,
  retrieveBlockTool,
  updateBlockTool,
} from "../tools/blocks/definitions.js";
import { blockToolHandlers } from "../tools/blocks/handlers.js";
import {
  appendContentTool,
  appendMarkdownTool,
  updateContentBatchTool,
  updateContentTool,
} from "../tools/content/definitions.js";
import { contentToolHandlers } from "../tools/content/handlers.js";
import {
  createDataSourceItemFromValuesTool,
  createDataSourceItemTool,
  createDataSourceTool,
  queryDataSourceByValuesTool,
  queryDataSourceTool,
  retrieveDatabaseTool,
  retrieveDataSourceTool,
  updateDataSourceTool,
} from "../tools/data-sources/definitions.js";
import { dataSourceToolHandlers } from "../tools/data-sources/handlers.js";
import {
  createCommentTool,
  findTool,
  inspectDataSourceTool,
  listAllUsersTool,
  retrieveBotUserTool,
  retrieveCommentsTool,
  retrieveUserTool,
  searchTool,
} from "../tools/discovery/definitions.js";
import { discoveryToolHandlers } from "../tools/discovery/handlers.js";
import {
  readPageTool,
  retrievePageTool,
  updatePagePropertiesTool,
} from "../tools/pages/definitions.js";
import { pageToolHandlers } from "../tools/pages/handlers.js";
import type { ToolHandlerMap } from "../tools/types.js";
import { filterTools } from "../utils/index.js";
import {
  formatJsonToolResult,
  formatToolError,
  isMarkdownConvertibleResponse,
} from "./result.js";
import { promptArgsShape, toolInputSchema } from "./schema.js";

export { formatJsonToolResult, formatToolError } from "./result.js";

const SERVER_VERSION = "2.0.0";
const SERVER_INSTRUCTIONS = [
  "Use high-level Notion tools first: notion_find, notion_read_page, notion_inspect_data_source, schema-aware query/create tools, and simple content tools.",
  "Use raw Notion JSON tools only when simplified tools do not support the requested block, property, or API shape.",
  "Prefer data_source_id for schema, query, and item creation workflows. Use notion_retrieve_database only to discover child data sources from a database container.",
].join(" ");

const toolHandlers: ToolHandlerMap = {
  ...blockToolHandlers,
  ...contentToolHandlers,
  ...pageToolHandlers,
  ...dataSourceToolHandlers,
  ...discoveryToolHandlers,
};

export function getServerInstructions(): string {
  return SERVER_INSTRUCTIONS;
}

export function getAllTools(): Tool[] {
  return [
    appendBlockChildrenTool,
    appendContentTool,
    appendMarkdownTool,
    updateContentTool,
    updateContentBatchTool,
    retrieveBlockTool,
    retrieveBlockChildrenTool,
    deleteBlockTool,
    updateBlockTool,
    retrievePageTool,
    readPageTool,
    updatePagePropertiesTool,
    listAllUsersTool,
    retrieveUserTool,
    retrieveBotUserTool,
    retrieveDatabaseTool,
    createDataSourceTool,
    queryDataSourceTool,
    queryDataSourceByValuesTool,
    retrieveDataSourceTool,
    updateDataSourceTool,
    createDataSourceItemTool,
    createDataSourceItemFromValuesTool,
    createCommentTool,
    retrieveCommentsTool,
    findTool,
    inspectDataSourceTool,
    searchTool,
  ];
}

export function getAllPrompts(): Prompt[] {
  return notionPrompts;
}

export function getAllResources(): Resource[] {
  return notionResources;
}

export async function startServer(
  notionToken: string,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean,
) {
  const mcpServer = new McpServer(
    {
      name: "Notion MCP Server",
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  const notionClient = new NotionClientWrapper(notionToken);

  registerNotionTools(
    mcpServer,
    notionClient,
    enabledToolsSet,
    enableMarkdownConversion,
  );
  registerNotionPrompts(mcpServer);
  registerNotionResources(mcpServer);

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

function registerNotionTools(
  server: McpServer,
  notionClient: NotionClientWrapper,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean,
) {
  for (const tool of filterTools(getAllTools(), enabledToolsSet)) {
    server.registerTool(
      tool.name,
      {
        title: tool.annotations?.title,
        description: tool.description,
        inputSchema: toolInputSchema(tool),
        annotations: tool.annotations,
      },
      async (toolArguments: unknown) =>
        executeRegisteredTool(
          tool.name,
          toolArguments,
          notionClient,
          enableMarkdownConversion,
        ),
    );
  }
}

function registerNotionPrompts(server: McpServer) {
  for (const prompt of getAllPrompts()) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: promptArgsShape(prompt.arguments),
      },
      (promptArguments: unknown) =>
        getNotionPrompt(
          prompt.name,
          promptArguments as Record<string, string> | undefined,
        ),
    );
  }
}

function registerNotionResources(server: McpServer) {
  for (const resource of getAllResources()) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      (uri) => readNotionResource(uri.toString()),
    );
  }
}

export async function executeRegisteredTool(
  toolName: string,
  toolArgumentsInput: unknown,
  notionClient: NotionClientWrapper,
  enableMarkdownConversion: boolean,
): Promise<CallToolResult> {
  console.error("Received tool call:", {
    name: toolName,
    arguments: toolArgumentsInput,
  });

  try {
    const toolArguments = isRecord(toolArgumentsInput)
      ? toolArgumentsInput
      : {};
    const handler = toolHandlers[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const response = await handler(toolArguments, { notionClient });
    const requestedFormat =
      typeof toolArguments.format === "string"
        ? toolArguments.format
        : "markdown";

    if (
      enableMarkdownConversion &&
      requestedFormat === "markdown" &&
      isMarkdownConvertibleResponse(response)
    ) {
      const markdown = await notionClient.toMarkdown(response);
      return {
        content: [{ type: "text", text: markdown }],
      };
    }

    return formatJsonToolResult(response);
  } catch (error) {
    console.error("Error executing tool:", error);
    return formatToolError(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
