#!/usr/bin/env node
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { NotionClientWrapper } from './build/client/index.js';
import { filterTools } from './build/utils/index.js';
import * as schemas from './build/types/schemas.js';

const PORT = process.env.PORT || 3000;
const NOTION_API_TOKEN = process.env.NOTION_API_TOKEN;
const enableMarkdownConversion = process.env.NOTION_MARKDOWN_CONVERSION === 'true';

if (!NOTION_API_TOKEN) {
  console.error('NOTION_API_TOKEN environment variable is required');
  process.exit(1);
}

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: ['https://chatgpt.com', 'https://chat.openai.com', '*'],
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id'],
}));

// Store transports by session ID
const transports = {};

// Function to create and configure an MCP server instance
function createMcpServer(enabledToolsSet = new Set()) {
  const server = new Server(
    {
      name: 'Notion MCP Server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const notionClient = new NotionClientWrapper(NOTION_API_TOKEN);

  // Set up tool handlers (same logic as the original server)
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error('Received CallToolRequest:', request);
    try {
      if (!request.params.arguments) {
        throw new Error('No arguments provided');
      }

      let response;
      switch (request.params.name) {
        case 'notion_append_block_children': {
          const args = request.params.arguments;
          if (!args.block_id || !args.children) {
            throw new Error('Missing required arguments: block_id and children');
          }
          response = await notionClient.appendBlockChildren(args.block_id, args.children);
          break;
        }
        case 'notion_retrieve_block': {
          const args = request.params.arguments;
          if (!args.block_id) {
            throw new Error('Missing required argument: block_id');
          }
          response = await notionClient.retrieveBlock(args.block_id);
          break;
        }
        case 'notion_retrieve_block_children': {
          const args = request.params.arguments;
          if (!args.block_id) {
            throw new Error('Missing required argument: block_id');
          }
          response = await notionClient.retrieveBlockChildren(
            args.block_id,
            args.start_cursor,
            args.page_size
          );
          break;
        }
        case 'notion_delete_block': {
          const args = request.params.arguments;
          if (!args.block_id) {
            throw new Error('Missing required argument: block_id');
          }
          response = await notionClient.deleteBlock(args.block_id);
          break;
        }
        case 'notion_update_block': {
          const args = request.params.arguments;
          if (!args.block_id || !args.block) {
            throw new Error('Missing required arguments: block_id and block');
          }
          response = await notionClient.updateBlock(args.block_id, args.block);
          break;
        }
        case 'notion_retrieve_page': {
          const args = request.params.arguments;
          if (!args.page_id) {
            throw new Error('Missing required argument: page_id');
          }
          response = await notionClient.retrievePage(args.page_id);
          break;
        }
        case 'notion_update_page_properties': {
          const args = request.params.arguments;
          if (!args.page_id || !args.properties) {
            throw new Error('Missing required arguments: page_id and properties');
          }
          response = await notionClient.updatePageProperties(args.page_id, args.properties);
          break;
        }
        case 'notion_list_all_users': {
          const args = request.params.arguments;
          response = await notionClient.listAllUsers(args.start_cursor, args.page_size);
          break;
        }
        case 'notion_retrieve_user': {
          const args = request.params.arguments;
          if (!args.user_id) {
            throw new Error('Missing required argument: user_id');
          }
          response = await notionClient.retrieveUser(args.user_id);
          break;
        }
        case 'notion_retrieve_bot_user': {
          response = await notionClient.retrieveBotUser();
          break;
        }
        case 'notion_create_database': {
          const args = request.params.arguments;
          if (!args.parent || !args.properties) {
            throw new Error('Missing required arguments: parent and properties');
          }
          response = await notionClient.createDatabase(
            args.parent,
            args.properties,
            args.title,
            args.is_inline
          );
          break;
        }
        case 'notion_query_database': {
          const args = request.params.arguments;
          if (!args.database_id) {
            throw new Error('Missing required argument: database_id');
          }
          response = await notionClient.queryDatabase(
            args.database_id,
            args.filter,
            args.sorts,
            args.start_cursor,
            args.page_size
          );
          break;
        }
        case 'notion_retrieve_database': {
          const args = request.params.arguments;
          if (!args.database_id) {
            throw new Error('Missing required argument: database_id');
          }
          response = await notionClient.retrieveDatabase(args.database_id);
          break;
        }
        case 'notion_update_database': {
          const args = request.params.arguments;
          if (!args.database_id) {
            throw new Error('Missing required argument: database_id');
          }
          response = await notionClient.updateDatabase(
            args.database_id,
            args.title,
            args.description,
            args.properties
          );
          break;
        }
        case 'notion_create_database_item': {
          const args = request.params.arguments;
          if (!args.parent || !args.properties) {
            throw new Error('Missing required arguments: parent and properties');
          }
          response = await notionClient.createDatabaseItem(args.parent, args.properties);
          break;
        }
        case 'notion_create_comment': {
          const args = request.params.arguments;
          if (!args.parent || !args.rich_text) {
            throw new Error('Missing required arguments: parent and rich_text');
          }
          response = await notionClient.createComment(args.parent, args.rich_text);
          break;
        }
        case 'notion_retrieve_comments': {
          const args = request.params.arguments;
          if (!args.block_id) {
            throw new Error('Missing required argument: block_id');
          }
          response = await notionClient.retrieveComments(
            args.block_id,
            args.start_cursor,
            args.page_size
          );
          break;
        }
        case 'notion_search': {
          const args = request.params.arguments;
          response = await notionClient.search(
            args.query,
            args.filter,
            args.sort,
            args.start_cursor,
            args.page_size
          );
          break;
        }
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }

      // Format response
      if (enableMarkdownConversion && response && typeof response === 'object') {
        const markdown = JSON.stringify(response, null, 2);
        return {
          content: [{ type: 'text', text: markdown }],
        };
      } else {
        return {
          content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
        };
      }
    } catch (error) {
      console.error('Error executing tool:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  });

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

  return server;
}

// Helper to check if request body is an initialize request
function isInitializeRequest(body) {
  return body && body.method === 'initialize';
}

// Streamable HTTP endpoint (/mcp)
app.all('/mcp', async (req, res) => {
  console.log(`Received ${req.method} request to /mcp`);
  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
      const existingTransport = transports[sessionId];
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        transport = existingTransport;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Session exists but uses a different transport protocol',
          },
          id: null,
        });
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          console.log(`StreamableHTTP session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided or not an initialize request',
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// SSE endpoint (deprecated but supported)
app.get('/sse', async (req, res) => {
  console.log('Received GET request to /sse (deprecated SSE transport)');
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;

  res.on('close', () => {
    delete transports[transport.sessionId];
  });

  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const existingTransport = transports[sessionId];

  if (existingTransport instanceof SSEServerTransport) {
    await existingTransport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No transport found or wrong transport type',
      },
      id: null,
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', notion_configured: !!NOTION_API_TOKEN });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Notion MCP HTTP Server listening on port ${PORT}`);
  console.log(`Streamable HTTP endpoint: /mcp`);
  console.log(`SSE endpoint (deprecated): /sse`);
  console.log(`Health check: /health`);
});

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  console.log('Server shutdown complete');
  process.exit(0);
});
