/**
 * MCP server setup and request handling
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolResult,
  CallToolRequestSchema,
  GetPromptRequest,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  Prompt,
  ReadResourceRequest,
  ReadResourceRequestSchema,
  ListResourcesRequestSchema,
  Resource,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  buildBlocksFromSimpleContent,
  buildBlockUpdateFromSimpleContent,
  parseMarkdownToSimpleContent,
  validateAppendPosition,
  validateSimpleContentItems,
  validateSimpleContentUpdates,
  validateSimpleEditableContentItem,
  validateSimpleContentUpdatesAgainstBlocks,
} from "../content/index.js";
import { NotionClientWrapper } from "../client/index.js";
import {
  buildPageReadSummary,
  readPageBlockTree,
} from "../page/index.js";
import {
  buildPagePropertiesFromSimpleValues,
  validateSimplePropertyValues,
} from "../properties/index.js";
import { getNotionPrompt, notionPrompts } from "../prompts/index.js";
import {
  buildDataSourceQueryFromSimpleFilters,
  validateSimpleDataSourceQueryInput,
} from "../query/index.js";
import { notionResources, readNotionResource } from "../resources/index.js";
import {
  summarizeDataSourceSchema,
  summarizeFindResults,
} from "../summary/index.js";
import { filterTools } from "../utils/index.js";
import * as schemas from "../types/schemas.js";
import * as args from "../types/args.js";

const SERVER_VERSION = "2.0.0";
const SERVER_INSTRUCTIONS = [
  "Use high-level Notion tools first: notion_find, notion_read_page, notion_inspect_data_source, schema-aware query/create tools, and simple content tools.",
  "Use raw Notion JSON tools only when simplified tools do not support the requested block, property, or API shape.",
  "Prefer data_source_id for schema, query, and item creation workflows. Use notion_retrieve_database only to discover child data sources from a database container.",
].join(" ");

export function getServerInstructions(): string {
  return SERVER_INSTRUCTIONS;
}

export function getAllTools(): Tool[] {
  return [
    schemas.appendBlockChildrenTool,
    schemas.appendContentTool,
    schemas.appendMarkdownTool,
    schemas.updateContentTool,
    schemas.updateContentBatchTool,
    schemas.retrieveBlockTool,
    schemas.retrieveBlockChildrenTool,
    schemas.deleteBlockTool,
    schemas.updateBlockTool,
    schemas.retrievePageTool,
    schemas.readPageTool,
    schemas.updatePagePropertiesTool,
    schemas.listAllUsersTool,
    schemas.retrieveUserTool,
    schemas.retrieveBotUserTool,
    schemas.retrieveDatabaseTool,
    schemas.createDataSourceTool,
    schemas.queryDataSourceTool,
    schemas.queryDataSourceByValuesTool,
    schemas.retrieveDataSourceTool,
    schemas.updateDataSourceTool,
    schemas.createDataSourceItemTool,
    schemas.createDataSourceItemFromValuesTool,
    schemas.createCommentTool,
    schemas.retrieveCommentsTool,
    schemas.findTool,
    schemas.inspectDataSourceTool,
    schemas.searchTool,
  ];
}

export function getAllPrompts(): Prompt[] {
  return notionPrompts;
}

export function getAllResources(): Resource[] {
  return notionResources;
}

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

/**
 * Start the MCP server
 */
export async function startServer(
  notionToken: string,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean
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
    }
  );
  const { server } = mcpServer;

  const notionClient = new NotionClientWrapper(notionToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
      try {
        const toolArguments = request.params.arguments ?? {};

        let response: unknown;

        switch (request.params.name) {
          case "notion_append_block_children": {
            const args = toolArguments as unknown as args.AppendBlockChildrenArgs;
            if (!args.block_id || !args.children) {
              throw new Error(
                "Missing required arguments: block_id and children"
              );
            }
            validateAppendPosition(args.position);
            response = await notionClient.appendBlockChildren(
              args.block_id,
              args.children,
              args.position
            );
            break;
          }

          case "notion_append_content": {
            const args = toolArguments as unknown as args.AppendContentArgs;
            if (!args.block_id || !args.items) {
              throw new Error(
                "Missing required arguments: block_id and items"
              );
            }
            validateAppendPosition(args.position);
            validateSimpleContentItems(args.items);
            response = await notionClient.appendBlockChildren(
              args.block_id,
              buildBlocksFromSimpleContent(args.items),
              args.position
            );
            break;
          }

          case "notion_append_markdown": {
            const args = toolArguments as unknown as args.AppendMarkdownArgs;
            if (!args.block_id || !args.markdown) {
              throw new Error(
                "Missing required arguments: block_id and markdown"
              );
            }
            validateAppendPosition(args.position);
            const items = parseMarkdownToSimpleContent(args.markdown);
            if (items.length === 0) {
              throw new Error("Markdown did not contain appendable content");
            }
            response = await notionClient.appendBlockChildren(
              args.block_id,
              buildBlocksFromSimpleContent(items),
              args.position
            );
            break;
          }

          case "notion_update_content": {
            const args = toolArguments as unknown as args.UpdateContentArgs;
            if (!args.block_id || !args.item) {
              throw new Error(
                "Missing required arguments: block_id and item"
              );
            }
            validateSimpleEditableContentItem(args.item);
            const existingBlock = await notionClient.retrieveBlock(
              args.block_id
            );
            if (existingBlock.type !== args.item.type) {
              throw new Error(
                `Block type mismatch: block ${args.block_id} is ${existingBlock.type}, but item.type was ${args.item.type}`
              );
            }
            response = await notionClient.updateBlock(
              args.block_id,
              buildBlockUpdateFromSimpleContent(args.item)
            );
            break;
          }

          case "notion_update_content_batch": {
            const args =
              toolArguments as unknown as args.UpdateContentBatchArgs;
            if (!args.updates || args.updates.length === 0) {
              throw new Error("Missing required argument: updates");
            }
            validateSimpleContentUpdates(args.updates);

            const existingBlocks = await Promise.all(
              args.updates.map((update) =>
                notionClient.retrieveBlock(update.block_id)
              )
            );
            validateSimpleContentUpdatesAgainstBlocks(
              args.updates,
              existingBlocks
            );

            const results = [];
            for (const update of args.updates) {
              results.push(
                await notionClient.updateBlock(
                  update.block_id,
                  buildBlockUpdateFromSimpleContent(update.item)
                )
              );
            }

            response = {
              object: "notion_content_batch_update",
              updated_count: results.length,
              results,
            };
            break;
          }

          case "notion_retrieve_block": {
            const args = toolArguments as unknown as args.RetrieveBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveBlock(args.block_id);
            break;
          }

          case "notion_retrieve_block_children": {
            const args =
              toolArguments as unknown as args.RetrieveBlockChildrenArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveBlockChildren(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_delete_block": {
            const args = toolArguments as unknown as args.DeleteBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.deleteBlock(args.block_id);
            break;
          }

          case "notion_update_block": {
            const args = toolArguments as unknown as args.UpdateBlockArgs;
            if (!args.block_id || !args.block) {
              throw new Error("Missing required arguments: block_id and block");
            }
            response = await notionClient.updateBlock(
              args.block_id,
              args.block
            );
            break;
          }

          case "notion_retrieve_page": {
            const args = toolArguments as unknown as args.RetrievePageArgs;
            if (!args.page_id) {
              throw new Error("Missing required argument: page_id");
            }
            response = await notionClient.retrievePage(args.page_id);
            break;
          }

          case "notion_read_page": {
            const args = toolArguments as unknown as args.ReadPageArgs;
            if (!args.page_id) {
              throw new Error("Missing required argument: page_id");
            }
            const page = await notionClient.retrievePage(args.page_id);
            const tree = await readPageBlockTree(
              notionClient.retrieveBlockChildren.bind(notionClient),
              args.page_id,
              args
            );
            response = buildPageReadSummary(page, tree, args);
            break;
          }

          case "notion_update_page_properties": {
            const args =
              toolArguments as unknown as args.UpdatePagePropertiesArgs;
            if (!args.page_id || !args.properties) {
              throw new Error(
                "Missing required arguments: page_id and properties"
              );
            }
            response = await notionClient.updatePageProperties(
              args.page_id,
              args.properties
            );
            break;
          }

          case "notion_list_all_users": {
            const args = toolArguments as unknown as args.ListAllUsersArgs;
            response = await notionClient.listAllUsers(
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_retrieve_user": {
            const args = toolArguments as unknown as args.RetrieveUserArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            response = await notionClient.retrieveUser(args.user_id);
            break;
          }

          case "notion_retrieve_bot_user": {
            response = await notionClient.retrieveBotUser();
            break;
          }

          case "notion_query_data_source": {
            const args = toolArguments as unknown as args.QueryDataSourceArgs;
            if (!args.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            response = await notionClient.queryDataSource(
              args.data_source_id,
              args.filter,
              args.sorts,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_query_data_source_by_values": {
            const args =
              toolArguments as unknown as args.QueryDataSourceByValuesArgs;
            if (!args.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            validateSimpleDataSourceQueryInput({
              filters: args.filters,
              match: args.match,
              sorts: args.sorts,
            });
            const dataSource = await notionClient.retrieveDataSource(
              args.data_source_id
            );
            const query = buildDataSourceQueryFromSimpleFilters(dataSource, {
              filters: args.filters,
              match: args.match,
              sorts: args.sorts,
            });
            response = await notionClient.queryDataSource(
              args.data_source_id,
              query.filter,
              query.sorts,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_create_data_source": {
            const args = toolArguments as unknown as args.CreateDataSourceArgs;
            response = await notionClient.createDataSource(
              args.parent,
              args.properties,
              args.title
            );
            break;
          }

          case "notion_retrieve_database": {
            const args = toolArguments as unknown as args.RetrieveDatabaseArgs;
            response = await notionClient.retrieveDatabase(args.database_id);
            break;
          }

          case "notion_retrieve_data_source": {
            const args = toolArguments as unknown as args.RetrieveDataSourceArgs;
            response = await notionClient.retrieveDataSource(
              args.data_source_id
            );
            break;
          }

          case "notion_update_data_source": {
            const args = toolArguments as unknown as args.UpdateDataSourceArgs;
            response = await notionClient.updateDataSource(
              args.data_source_id,
              args.title,
              args.description,
              args.properties
            );
            break;
          }

          case "notion_create_data_source_item": {
            const args =
              toolArguments as unknown as args.CreateDataSourceItemArgs;
            response = await notionClient.createDataSourceItem(
              args.data_source_id,
              args.properties
            );
            break;
          }

          case "notion_create_data_source_item_from_values": {
            const args =
              toolArguments as unknown as args.CreateDataSourceItemFromValuesArgs;
            if (!args.data_source_id || !args.values) {
              throw new Error(
                "Missing required arguments: data_source_id and values"
              );
            }
            validateSimplePropertyValues(args.values);
            const dataSource = await notionClient.retrieveDataSource(
              args.data_source_id
            );
            const properties = buildPagePropertiesFromSimpleValues(
              dataSource,
              args.values
            );
            response = await notionClient.createDataSourceItem(
              args.data_source_id,
              properties
            );
            break;
          }

          case "notion_create_comment": {
            const args = toolArguments as unknown as args.CreateCommentArgs;

            if (!args.parent && !args.discussion_id) {
              throw new Error(
                "Either parent.page_id or discussion_id must be provided"
              );
            }

            response = await notionClient.createComment(
              args.parent,
              args.discussion_id,
              args.rich_text
            );
            break;
          }

          case "notion_retrieve_comments": {
            const args = toolArguments as unknown as args.RetrieveCommentsArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            response = await notionClient.retrieveComments(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_search": {
            const args = toolArguments as unknown as args.SearchArgs;
            response = await notionClient.search(
              args.query,
              args.filter,
              args.sort,
              args.start_cursor,
              args.page_size
            );
            break;
          }

          case "notion_find": {
            const args = toolArguments as unknown as args.FindArgs;
            const filter = args.object_type
              ? { property: "object", value: args.object_type }
              : undefined;
            const searchResponse = await notionClient.search(
              args.query,
              filter,
              undefined,
              args.start_cursor,
              args.page_size
            );
            response = summarizeFindResults(searchResponse, args.query);
            break;
          }

          case "notion_inspect_data_source": {
            const args = toolArguments as unknown as args.InspectDataSourceArgs;
            if (!args.data_source_id) {
              throw new Error("Missing required argument: data_source_id");
            }
            const dataSource = await notionClient.retrieveDataSource(
              args.data_source_id
            );
            response = summarizeDataSourceSchema(dataSource);
            break;
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        // Check format parameter and return appropriate response
        const requestedFormat = (toolArguments as any)?.format || "markdown";

        // Only convert to markdown if both conditions are met:
        // 1. The requested format is markdown
        // 2. The experimental markdown conversion is enabled via environment variable
        if (
          enableMarkdownConversion &&
          requestedFormat === "markdown" &&
          isMarkdownConvertibleResponse(response)
        ) {
          const markdown = await notionClient.toMarkdown(response);
          return {
            content: [{ type: "text", text: markdown }],
          };
        } else {
          return formatJsonToolResult(response);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return formatToolError(error);
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: filterTools(getAllTools(), enabledToolsSet),
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: getAllPrompts(),
    };
  });

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request: GetPromptRequest) => {
      return getNotionPrompt(
        request.params.name,
        request.params.arguments as Record<string, string> | undefined
      );
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: getAllResources(),
    };
  });

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      return readNotionResource(request.params.uri);
    }
  );

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

function toStructuredContent(response: unknown): Record<string, unknown> {
  if (response && typeof response === "object" && !Array.isArray(response)) {
    return response as Record<string, unknown>;
  }

  return { value: response };
}

function isMarkdownConvertibleResponse(
  response: unknown
): response is Parameters<NotionClientWrapper["toMarkdown"]>[0] {
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
