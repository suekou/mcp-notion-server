/**
 * MCP server setup and request handling
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NotionClientWrapper } from "../client/index.js";
import { 
  filterTools, 
  validateId, 
  validatePagination, 
  sanitizeString, 
  safeStringify 
} from "../utils/index.js";
import * as schemas from "../types/schemas.js";
import * as args from "../types/args.js";

/**
 * Start the MCP server
 */
export async function startServer(
  notionToken: string,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean
) {
  const server = new Server(
    {
      name: "Notion MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const notionClient = new NotionClientWrapper(notionToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      // Log request details without sensitive information
      const sanitizedRequest = {
        ...request,
        params: {
          ...request.params,
          // Avoid logging any potential secrets in the arguments
          arguments: request.params.arguments ? "..." : undefined
        }
      };
      console.error("Received CallToolRequest:", sanitizedRequest);
      
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        let response;

        switch (request.params.name) {
          case "notion_append_block_children": {
            const args = request.params
              .arguments as unknown as args.AppendBlockChildrenArgs;
            if (!args.block_id || !args.children) {
              throw new Error(
                "Missing required arguments: block_id and children"
              );
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            // Validate children array
            if (!Array.isArray(args.children)) {
              throw new Error("Children must be an array");
            }
            response = await notionClient.appendBlockChildren(
              blockId,
              args.children
            );
            break;
          }

          case "notion_retrieve_block": {
            const args = request.params
              .arguments as unknown as args.RetrieveBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            response = await notionClient.retrieveBlock(blockId);
            break;
          }

          case "notion_retrieve_block_children": {
            const args = request.params
              .arguments as unknown as args.RetrieveBlockChildrenArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            // Validate pagination parameters
            const { start_cursor, page_size } = validatePagination(
              args.start_cursor,
              args.page_size
            );
            response = await notionClient.retrieveBlockChildren(
              blockId,
              start_cursor,
              page_size
            );
            break;
          }

          case "notion_delete_block": {
            const args = request.params
              .arguments as unknown as args.DeleteBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            response = await notionClient.deleteBlock(blockId);
            break;
          }

          case "notion_update_block": {
            const args = request.params
              .arguments as unknown as args.UpdateBlockArgs;
            if (!args.block_id || !args.block) {
              throw new Error("Missing required arguments: block_id and block");
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            response = await notionClient.updateBlock(
              blockId,
              args.block
            );
            break;
          }

          case "notion_retrieve_page": {
            const args = request.params
              .arguments as unknown as args.RetrievePageArgs;
            if (!args.page_id) {
              throw new Error("Missing required argument: page_id");
            }
            // Validate page_id
            const pageId = validateId(args.page_id);
            response = await notionClient.retrievePage(pageId);
            break;
          }

          case "notion_update_page_properties": {
            const args = request.params
              .arguments as unknown as args.UpdatePagePropertiesArgs;
            if (!args.page_id || !args.properties) {
              throw new Error(
                "Missing required arguments: page_id and properties"
              );
            }
            // Validate page_id
            const pageId = validateId(args.page_id);
            response = await notionClient.updatePageProperties(
              pageId,
              args.properties
            );
            break;
          }

          case "notion_list_all_users": {
            const args = request.params
              .arguments as unknown as args.ListAllUsersArgs;
            // Validate pagination parameters
            const { start_cursor, page_size } = validatePagination(
              args.start_cursor,
              args.page_size
            );
            response = await notionClient.listAllUsers(
              start_cursor,
              page_size
            );
            break;
          }

          case "notion_retrieve_user": {
            const args = request.params
              .arguments as unknown as args.RetrieveUserArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            // Validate user_id
            const userId = validateId(args.user_id);
            response = await notionClient.retrieveUser(userId);
            break;
          }

          case "notion_retrieve_bot_user": {
            response = await notionClient.retrieveBotUser();
            break;
          }

          case "notion_query_database": {
            const args = request.params
              .arguments as unknown as args.QueryDatabaseArgs;
            if (!args.database_id) {
              throw new Error("Missing required argument: database_id");
            }
            // Validate database_id
            const databaseId = validateId(args.database_id);
            // Validate pagination parameters
            const { start_cursor, page_size } = validatePagination(
              args.start_cursor,
              args.page_size
            );
            response = await notionClient.queryDatabase(
              databaseId,
              args.filter,
              args.sorts,
              start_cursor,
              page_size
            );
            break;
          }

          case "notion_create_database": {
            const args = request.params
              .arguments as unknown as args.CreateDatabaseArgs;
            response = await notionClient.createDatabase(
              args.parent,
              args.properties,
              args.title
            );
            break;
          }

          case "notion_retrieve_database": {
            const args = request.params
              .arguments as unknown as args.RetrieveDatabaseArgs;
            // Validate database_id
            const databaseId = validateId(args.database_id);
            response = await notionClient.retrieveDatabase(databaseId);
            break;
          }

          case "notion_update_database": {
            const args = request.params
              .arguments as unknown as args.UpdateDatabaseArgs;
            // Validate database_id
            const databaseId = validateId(args.database_id);
            response = await notionClient.updateDatabase(
              databaseId,
              args.title,
              args.description,
              args.properties
            );
            break;
          }

          case "notion_create_database_item": {
            const args = request.params
              .arguments as unknown as args.CreateDatabaseItemArgs;
            // Validate database_id
            const databaseId = validateId(args.database_id);
            response = await notionClient.createDatabaseItem(
              databaseId,
              args.properties
            );
            break;
          }

          case "notion_create_comment": {
            const args = request.params
              .arguments as unknown as args.CreateCommentArgs;

            if (!args.parent && !args.discussion_id) {
              throw new Error(
                "Either parent.page_id or discussion_id must be provided"
              );
            }

            // Validate discussion_id if provided
            let validatedDiscussionId;
            if (args.discussion_id) {
              validatedDiscussionId = validateId(args.discussion_id);
            }

            // Validate parent.page_id if provided
            let validatedParent = args.parent;
            if (args.parent && args.parent.page_id) {
              validatedParent = {
                ...args.parent,
                page_id: validateId(args.parent.page_id)
              };
            }

            response = await notionClient.createComment(
              validatedParent,
              validatedDiscussionId,
              args.rich_text
            );
            break;
          }

          case "notion_retrieve_comments": {
            const args = request.params
              .arguments as unknown as args.RetrieveCommentsArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            // Validate block_id
            const blockId = validateId(args.block_id);
            // Validate pagination parameters
            const { start_cursor, page_size } = validatePagination(
              args.start_cursor,
              args.page_size
            );
            response = await notionClient.retrieveComments(
              blockId,
              start_cursor,
              page_size
            );
            break;
          }

          case "notion_search": {
            const args = request.params.arguments as unknown as args.SearchArgs;
            // Sanitize search query if provided
            const query = args.query ? sanitizeString(args.query) : undefined;
            // Validate pagination parameters
            const { start_cursor, page_size } = validatePagination(
              args.start_cursor,
              args.page_size
            );
            response = await notionClient.search(
              query,
              args.filter,
              args.sort,
              start_cursor,
              page_size
            );
            break;
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        // Check format parameter and return appropriate response
        const requestedFormat =
          (request.params.arguments as any)?.format || "markdown";

        // Only convert to markdown if both conditions are met:
        // 1. The requested format is markdown
        // 2. The experimental markdown conversion is enabled via environment variable
        if (enableMarkdownConversion && requestedFormat === "markdown") {
          const markdown = await notionClient.toMarkdown(response);
          // Sanitize markdown output
          const sanitizedMarkdown = sanitizeString(markdown);
          return {
            content: [{ type: "text", text: sanitizedMarkdown }],
          };
        } else {
          // Use safe stringify to avoid potential issues
          return {
            content: [
              { type: "text", text: safeStringify(response) },
            ],
          };
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        // Ensure error messages don't reveal sensitive details
        const errorMessage = error instanceof Error 
          ? sanitizeString(error.message) 
          : "An error occurred";
          
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: errorMessage,
              }),
            },
          ],
        };
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allTools = [
      schemas.appendBlockChildrenTool,
      schemas.retrieveBlockTool,
      schemas.retrieveBlockChildrenTool,
      schemas.deleteBlockTool,
      schemas.updateBlockTool,
      schemas.retrievePageTool,
      schemas.updatePagePropertiesTool,
      schemas.listAllUsersTool,
      schemas.retrieveUserTool,
      schemas.retrieveBotUserTool,
      schemas.createDatabaseTool,
      schemas.queryDatabaseTool,
      schemas.retrieveDatabaseTool,
      schemas.updateDatabaseTool,
      schemas.createDatabaseItemTool,
      schemas.createCommentTool,
      schemas.retrieveCommentsTool,
      schemas.searchTool,
    ];
    return {
      tools: filterTools(allTools, enabledToolsSet),
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
