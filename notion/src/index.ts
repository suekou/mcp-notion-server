#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Type definitions for tool arguments
// Blocks
interface AppendBlockChildrenArgs {
  block_id: string;
  children: any[];
}

interface RetrieveBlockArgs {
  block_id: string;
}

interface RetrieveBlockChildrenArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
}

interface DeleteBlockArgs {
  block_id: string;
}

// Pages
interface RetrievePageArgs {
  page_id: string;
}

interface UpdatePagePropertiesArgs {
  page_id: string;
  properties: any;
}

// Users
interface ListAllUsersArgs {
  start_cursor?: string;
  page_size?: number;
}

interface RetrieveUserArgs {
  user_id: string;
}

// Databases
interface CreateDatabaseArgs {
  parent: any;
  title: any[];
  properties: any;
}

interface QueryDatabaseArgs {
  database_id: string;
  filter?: any;
  sorts?: any;
  start_cursor?: string;
  page_size?: number;
}

interface RetrieveDatabaseArgs {
  database_id: string;
}

interface UpdateDatabaseArgs {
  database_id: string;
  title?: any[];
  description?: any[];
  properties?: any;
}

interface CreateDatabaseItemArgs {
  database_id: string;
  properties: any;
}

// Comments
interface CreateCommentArgs {
  parent?: { page_id: string };
  discussion_id?: string;
  rich_text: any[];
}

interface RetrieveCommentsArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
}

// Search
interface SearchArgs {
  query?: string;
  filter?: { property: string; value: string };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  start_cursor?: string;
  page_size?: number;
}

const commonIdDescription = "It should be a 32-character string (excluding hyphens) formatted as 8-4-4-4-12 with hyphens (-).";

// common object schema
const richTextObjectSchema = {
  type: "object",
  description: "A rich text object.",
  properties: {
    type: {
      type: "string",
      description:
        "The type of this rich text object. Possible values: text, mention, equation.",
      enum: ["text", "mention", "equation"],
    },
    text: {
      type: "object",
      description:
        "Object containing text content and optional link info. Required if type is 'text'.",
      properties: {
        content: {
          type: "string",
          description: "The actual text content.",
        },
        link: {
          type: "object",
          description: "Optional link object with a 'url' field.",
          properties: {
            url: {
              type: "string",
              description: "The URL the text links to.",
            },
          },
        },
      },
    },
    mention: {
      type: "object",
      description:
        "Mention object if type is 'mention'. Represents an inline mention of a database, date, link preview, page, template mention, or user.",
      properties: {
        type: {
          type: "string",
          description: "The type of the mention.",
          enum: [
            "database",
            "date",
            "link_preview",
            "page",
            "template_mention",
            "user",
          ],
        },
        database: {
          type: "object",
          description:
            "Database mention object. Contains a database reference with an 'id' field.",
          properties: {
            id: {
              type: "string",
              description:
                "The ID of the mentioned database." + commonIdDescription,
            },
          },
          required: ["id"],
        },
        date: {
          type: "object",
          description:
            "Date mention object, containing a date property value object.",
          properties: {
            start: {
              type: "string",
              description: "An ISO 8601 formatted start date or date-time.",
            },
            end: {
              type: ["string", "null"],
              description:
                "An ISO 8601 formatted end date or date-time, or null if not a range.",
            },
            time_zone: {
              type: ["string", "null"],
              description:
                "Time zone information for start and end. If null, times are in UTC.",
            },
          },
          required: ["start"],
        },
        link_preview: {
          type: "object",
          description:
            "Link Preview mention object, containing a URL for the link preview.",
          properties: {
            url: {
              type: "string",
              description: "The URL for the link preview.",
            },
          },
          required: ["url"],
        },
        page: {
          type: "object",
          description:
            "Page mention object, containing a page reference with an 'id' field.",
          properties: {
            id: {
              type: "string",
              description:
                "The ID of the mentioned page." + commonIdDescription,
            },
          },
          required: ["id"],
        },
        template_mention: {
          type: "object",
          description:
            "Template mention object, can be a template_mention_date or template_mention_user.",
          properties: {
            type: {
              type: "string",
              enum: ["template_mention_date", "template_mention_user"],
              description: "The template mention type.",
            },
            template_mention_date: {
              type: "string",
              enum: ["today", "now"],
              description: "For template_mention_date type, the date keyword.",
            },
            template_mention_user: {
              type: "string",
              enum: ["me"],
              description: "For template_mention_user type, the user keyword.",
            },
          },
        },
        user: {
          type: "object",
          description: "User mention object, contains a user reference.",
          properties: {
            object: {
              type: "string",
              description: "Should be 'user'.",
              enum: ["user"],
            },
            id: {
              type: "string",
              description:
                "The ID of the user." + commonIdDescription,
            },
          },
          required: ["object", "id"],
        },
      },
      required: ["type"],
      oneOf: [
        { required: ["database"] },
        { required: ["date"] },
        { required: ["link_preview"] },
        { required: ["page"] },
        { required: ["template_mention"] },
        { required: ["user"] },
      ],
    },
    equation: {
      type: "object",
      description:
        "Equation object if type is 'equation'. Represents an inline LaTeX equation.",
      properties: {
        expression: {
          type: "string",
          description: "LaTeX string representing the inline equation.",
        },
      },
      required: ["expression"],
    },
    annotations: {
      type: "object",
      description: "Styling information for the text.",
      properties: {
        bold: { type: "boolean" },
        italic: { type: "boolean" },
        strikethrough: { type: "boolean" },
        underline: { type: "boolean" },
        code: { type: "boolean" },
        color: {
          type: "string",
          description: "Color for the text.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
      },
    },
    href: {
      type: "string",
      description: "The URL of any link or mention in this text, if any.",
    },
    plain_text: {
      type: "string",
      description: "The plain text without annotations.",
    },
  },
  required: ["type"],
};

const blockObjectSchema = {
  type: "object",
  description: "A Notion block object.",
  properties: {
    object: {
      type: "string",
      description: "Should be 'block'.",
      enum: ["block"],
    },
    type: {
      type: "string",
      description:
        "Type of the block. Possible values include 'paragraph', 'heading_1', 'heading_2', 'heading_3', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'toggle', 'child_page', 'child_database', 'embed', 'callout', 'quote', 'equation', 'divider', 'table_of_contents', 'column', 'column_list', 'link_preview', 'synced_block', 'template', 'link_to_page', 'audio', 'bookmark', 'breadcrumb', 'code', 'file', 'image', 'pdf', 'video'. Not all types are supported for creation via API.",
    },
    paragraph: {
      type: "object",
      description: "Paragraph block object.",
      properties: {
        rich_text: richTextObjectSchema,
        color: {
          type: "string",
          description: "The color of the block.",
          enum: [
            "default",
            "blue",
            "blue_background",
            "brown",
            "brown_background",
            "gray",
            "gray_background",
            "green",
            "green_background",
            "orange",
            "orange_background",
            "pink",
            "pink_background",
            "purple",
            "purple_background",
            "red",
            "red_background",
            "yellow",
            "yellow_background",
          ],
        },
        children: {
          type: "array",
          description: "Nested child blocks.",
          items: {
            type: "object",
            description: "A nested block object.",
          },
        },
      },
    },
  },
  required: ["object", "type"],
}

// Tool definitions
// Blocks
const appendBlockChildrenTool: Tool = {
  name: "notion_append_block_children",
  description:
    "Append new children blocks to a specified parent block in Notion. Requires insert content capabilities. You can optionally specify the 'after' parameter to append after a certain block.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the parent block." + commonIdDescription,
      },
      children: {
        type: "array",
        description:
          "Array of block objects to append. Each block must follow the Notion block schema.",
        items: blockObjectSchema,
      },
      after: {
        type: "string",
        description:
          "The ID of the existing block that the new block should be appended after." + commonIdDescription,
      },
    },
    required: ["block_id", "children"],
  },
};

const retrieveBlockTool: Tool = {
  name: "notion_retrieve_block",
  description: "Retrieve a block from Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block to retrieve." + commonIdDescription,
      },
    },
    required: ["block_id"],
  },
};

const retrieveBlockChildrenTool: Tool = {
  name: "notion_retrieve_block_children",
  description: "Retrieve the children of a block",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block." + commonIdDescription,
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
    },
    required: ["block_id"],
  },
};

const deleteBlockTool: Tool = {
  name: "notion_delete_block",
  description: "Delete a block in Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block to delete." + commonIdDescription,
      },
    },
    required: ["block_id"],
  },
};

// Pages
const retrievePageTool: Tool = {
  name: "notion_retrieve_page",
  description: "Retrieve a page from Notion",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description:
          "The ID of the page to retrieve." + commonIdDescription,
      },
    },
    required: ["page_id"],
  },
};

const updatePagePropertiesTool: Tool = {
  name: "notion_update_page_properties",
  description: "Update properties of a page or an item in a Notion database",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description:
          "The ID of the page or database item to update." + commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties to update. These correspond to the columns or fields in the database.",
      },
    },
    required: ["page_id", "properties"],
  },
};

// Users
const listAllUsersTool: Tool = {
  name: "notion_list_all_users",
  description:
    "List all users in the Notion workspace. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  inputSchema: {
    type: "object",
    properties: {
      start_cursor: {
        type: "string",
        description: "Pagination start cursor for listing users",
      },
      page_size: {
        type: "number",
        description: "Number of users to retrieve (max 100)",
      },
    },
  },
};

const retrieveUserTool: Tool = {
  name: "notion_retrieve_user",
  description:
    "Retrieve a specific user by user_id in Notion. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description:
          "The ID of the user to retrieve." + commonIdDescription,
      },
    },
    required: ["user_id"],
  },
};

const retrieveBotUserTool: Tool = {
  name: "notion_retrieve_bot_user",
  description:
    "Retrieve the bot user associated with the current token in Notion",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

// Databases
const createDatabaseTool: Tool = {
  name: "notion_create_database",
  description: "Create a database in Notion",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description: "Parent object of the database",
      },
      title: {
        type: "array",
        description:
          "Title of database as it appears in Notion. An array of rich text objects.",
        items: richTextObjectSchema,
      },
      properties: {
        type: "object",
        description:
          "Property schema of database. The keys are the names of properties as they appear in Notion and the values are property schema objects.",
      },
    },
    required: ["parent", "properties"],
  },
};

const queryDatabaseTool: Tool = {
  name: "notion_query_database",
  description: "Query a database in Notion",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the database to query." + commonIdDescription,
      },
      filter: {
        type: "object",
        description: "Filter conditions",
      },
      sorts: {
        type: "array",
        description: "Sort conditions",
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
    },
    required: ["database_id"],
  },
};

const retrieveDatabaseTool: Tool = {
  name: "notion_retrieve_database",
  description: "Retrieve a database in Notion",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the database to retrieve." + commonIdDescription,
      },
    },
    required: ["database_id"],
  },
};

const updateDatabaseTool: Tool = {
  name: "notion_update_database",
  description: "Update a database in Notion",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the database to update." + commonIdDescription,
      },
      title: {
        type: "array",
        description:
          "An array of rich text objects that represents the title of the database that is displayed in the Notion UI.",
        items: richTextObjectSchema,
      },
      description: {
        type: "array",
        description:
          "An array of rich text objects that represents the description of the database that is displayed in the Notion UI.",
      },
      properties: {
        type: "object",
        description:
          "The properties of a database to be changed in the request, in the form of a JSON object.",
      },
    },
    required: ["database_id"],
  },
};

const createDatabaseItemTool: Tool = {
  name: "notion_create_database_item",
  description: "Create a new item (page) in a Notion database",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description:
          "The ID of the database to add the item to." + commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties of the new database item. These should match the database schema.",
      },
    },
    required: ["database_id", "properties"],
  },
};

// Comments
const createCommentTool: Tool = {
  name: "notion_create_comment",
  description:
    "Create a comment in Notion. This requires the integration to have 'insert comment' capabilities. You can either specify a page parent or a discussion_id, but not both.",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description:
          "Parent object that specifies the page to comment on. Must include a page_id if used.",
        properties: {
          page_id: {
            type: "string",
            description:
              "The ID of the page to comment on." + commonIdDescription,
          },
        },
      },
      discussion_id: {
        type: "string",
        description:
          "The ID of an existing discussion thread to add a comment to." + commonIdDescription,
      },
      rich_text: {
        type: "array",
        description:
          "Array of rich text objects representing the comment content.",
        items: richTextObjectSchema,
      },
    },
    required: ["rich_text"],
  },
};

const retrieveCommentsTool: Tool = {
  name: "notion_retrieve_comments",
  description:
    "Retrieve a list of unresolved comments from a Notion page or block. Requires the integration to have 'read comment' capabilities.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block or page whose comments you want to retrieve." + commonIdDescription,
      },
      start_cursor: {
        type: "string",
        description:
          "If supplied, returns a page of results starting after the cursor.",
      },
      page_size: {
        type: "number",
        description: "Number of comments to retrieve (max 100).",
      },
    },
    required: ["block_id"],
  },
};

// Search
const searchTool: Tool = {
  name: "notion_search",
  description: "Search pages or databases by title in Notion",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in page or database titles",
      },
      filter: {
        type: "object",
        description: "Filter results by object type (page or database)",
        properties: {
          property: {
            type: "string",
            description: "Must be 'object'",
          },
          value: {
            type: "string",
            description: "Either 'page' or 'database'",
          },
        },
      },
      sort: {
        type: "object",
        description: "Sort order of results",
        properties: {
          direction: {
            type: "string",
            enum: ["ascending", "descending"],
          },
          timestamp: {
            type: "string",
            enum: ["last_edited_time"],
          },
        },
      },
      start_cursor: {
        type: "string",
        description: "Pagination start cursor",
      },
      page_size: {
        type: "number",
        description: "Number of results to return (max 100)",
      },
    },
  },
};

class NotionClientWrapper {
  private notionToken: string;
  private baseUrl: string = "https://api.notion.com/v1";
  private headers: { [key: string]: string };

  constructor(token: string) {
    this.notionToken = token;
    this.headers = {
      Authorization: `Bearer ${this.notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    };
  }

  async appendBlockChildren(block_id: string, children: any[]): Promise<any> {
    const body = { children };

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  async retrieveBlock(block_id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async retrieveBlockChildren(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<any> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/blocks/${block_id}/children?${params}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async deleteBlock(block_id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/blocks/${block_id}`, {
      method: "DELETE",
      headers: this.headers,
    });

    return response.json();
  }

  async retrievePage(page_id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async updatePageProperties(page_id: string, properties: any): Promise<any> {
    const body = { properties };

    const response = await fetch(`${this.baseUrl}/pages/${page_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async listAllUsers(start_cursor?: string, page_size?: number): Promise<any> {
    const params = new URLSearchParams();
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveUser(user_id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/${user_id}`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async retrieveBotUser(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/users/me`, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  }

  async createDatabase(
    parent: any,
    title: any[],
    properties: any
  ): Promise<any> {
    const body = { parent, title, properties };

    const response = await fetch(`${this.baseUrl}/databases`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async queryDatabase(
    database_id: string,
    filter?: any,
    sorts?: any,
    start_cursor?: string,
    page_size?: number
  ): Promise<any> {
    const body: any = {};
    if (filter) body.filter = filter;
    if (sorts) body.sorts = sorts;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    const response = await fetch(
      `${this.baseUrl}/databases/${database_id}/query`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      }
    );

    return response.json();
  }

  async retrieveDatabase(database_id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async updateDatabase(
    database_id: string,
    title?: any[],
    description?: any[],
    properties?: any
  ): Promise<any> {
    const body: any = {};
    if (title) body.title = title;
    if (description) body.description = description;
    if (properties) body.properties = properties;

    const response = await fetch(`${this.baseUrl}/databases/${database_id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async createDatabaseItem(database_id: string, properties: any): Promise<any> {
    const body = {
      parent: { database_id },
      properties,
    };

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async createComment(
    parent?: { page_id: string },
    discussion_id?: string,
    rich_text?: any[]
  ): Promise<any> {
    const body: any = { rich_text };
    if (parent) {
      body.parent = parent;
    }
    if (discussion_id) {
      body.discussion_id = discussion_id;
    }

    const response = await fetch(`${this.baseUrl}/comments`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async retrieveComments(
    block_id: string,
    start_cursor?: string,
    page_size?: number
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append("block_id", block_id);
    if (start_cursor) params.append("start_cursor", start_cursor);
    if (page_size) params.append("page_size", page_size.toString());

    const response = await fetch(
      `${this.baseUrl}/comments?${params.toString()}`,
      {
        method: "GET",
        headers: this.headers,
      }
    );

    return response.json();
  }

  async search(
    query?: string,
    filter?: { property: string; value: string },
    sort?: {
      direction: "ascending" | "descending";
      timestamp: "last_edited_time";
    },
    start_cursor?: string,
    page_size?: number
  ): Promise<any> {
    const body: any = {};
    if (query) body.query = query;
    if (filter) body.filter = filter;
    if (sort) body.sort = sort;
    if (start_cursor) body.start_cursor = start_cursor;
    if (page_size) body.page_size = page_size;

    const response = await fetch(`${this.baseUrl}/search`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }
}

async function main() {
  const notionToken = process.env.NOTION_API_TOKEN;

  if (!notionToken) {
    console.error("Please set NOTION_API_TOKEN environment variable");
    process.exit(1);
  }

  console.error("Starting Notion MCP Server...");
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
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        switch (request.params.name) {
          case "notion_append_block_children": {
            const args = request.params
              .arguments as unknown as AppendBlockChildrenArgs;
            if (!args.block_id || !args.children) {
              throw new Error(
                "Missing required arguments: block_id and children"
              );
            }
            const response = await notionClient.appendBlockChildren(
              args.block_id,
              args.children
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_block": {
            const args = request.params
              .arguments as unknown as RetrieveBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            const response = await notionClient.retrieveBlock(args.block_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_block_children": {
            const args = request.params
              .arguments as unknown as RetrieveBlockChildrenArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            const response = await notionClient.retrieveBlockChildren(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_delete_block": {
            const args = request.params.arguments as unknown as DeleteBlockArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            const response = await notionClient.deleteBlock(args.block_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_page": {
            const args = request.params
              .arguments as unknown as RetrievePageArgs;
            if (!args.page_id) {
              throw new Error("Missing required argument: page_id");
            }
            const response = await notionClient.retrievePage(args.page_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_update_page_properties": {
            const args = request.params
              .arguments as unknown as UpdatePagePropertiesArgs;
            if (!args.page_id || !args.properties) {
              throw new Error(
                "Missing required arguments: page_id and properties"
              );
            }
            const response = await notionClient.updatePageProperties(
              args.page_id,
              args.properties
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_list_all_users": {
            const args = request.params
              .arguments as unknown as ListAllUsersArgs;
            const response = await notionClient.listAllUsers(
              args.start_cursor,
              args.page_size
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_user": {
            const args = request.params
              .arguments as unknown as RetrieveUserArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            const response = await notionClient.retrieveUser(args.user_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_bot_user": {
            const response = await notionClient.retrieveBotUser();
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_query_database": {
            const args = request.params
              .arguments as unknown as QueryDatabaseArgs;
            if (!args.database_id) {
              throw new Error("Missing required argument: database_id");
            }
            const response = await notionClient.queryDatabase(
              args.database_id,
              args.filter,
              args.sorts,
              args.start_cursor,
              args.page_size
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_create_database": {
            const args = request.params
              .arguments as unknown as CreateDatabaseArgs;
            const response = await notionClient.createDatabase(
              args.parent,
              args.title,
              args.properties
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_database": {
            const args = request.params
              .arguments as unknown as RetrieveDatabaseArgs;
            const response = await notionClient.retrieveDatabase(
              args.database_id
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_update_database": {
            const args = request.params
              .arguments as unknown as UpdateDatabaseArgs;
            const response = await notionClient.updateDatabase(
              args.database_id,
              args.title,
              args.description,
              args.properties
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_create_database_item": {
            const args = request.params
              .arguments as unknown as CreateDatabaseItemArgs;
            const response = await notionClient.createDatabaseItem(
              args.database_id,
              args.properties
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_create_comment": {
            const args = request.params
              .arguments as unknown as CreateCommentArgs;

            if (!args.parent && !args.discussion_id) {
              throw new Error(
                "Either parent.page_id or discussion_id must be provided"
              );
            }

            const response = await notionClient.createComment(
              args.parent,
              args.discussion_id,
              args.rich_text
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_retrieve_comments": {
            const args = request.params
              .arguments as unknown as RetrieveCommentsArgs;
            if (!args.block_id) {
              throw new Error("Missing required argument: block_id");
            }
            const response = await notionClient.retrieveComments(
              args.block_id,
              args.start_cursor,
              args.page_size
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "notion_search": {
            const args = request.params.arguments as unknown as SearchArgs;
            const response = await notionClient.search(
              args.query,
              args.filter,
              args.sort,
              args.start_cursor,
              args.page_size
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [
        appendBlockChildrenTool,
        retrieveBlockTool,
        retrieveBlockChildrenTool,
        deleteBlockTool,
        retrievePageTool,
        updatePagePropertiesTool,
        listAllUsersTool,
        retrieveUserTool,
        retrieveBotUserTool,
        createDatabaseTool,
        queryDatabaseTool,
        retrieveDatabaseTool,
        updateDatabaseTool,
        createDatabaseItemTool,
        createCommentTool,
        retrieveCommentsTool,
        searchTool,
      ],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);

  console.error("Notion MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
