import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  commonIdDescription,
  formatParameter,
  richTextObjectSchema,
} from "../../mcp/schema.js";

export const listAllUsersTool: Tool = {
  name: "notion_list_all_users",
  description:
    "List all users in the Notion workspace. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  annotations: {
    title: "List Users",
    readOnlyHint: true,
    destructiveHint: false,
  },
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
      format: formatParameter,
    },
  },
};

export const retrieveUserTool: Tool = {
  name: "notion_retrieve_user",
  description:
    "Retrieve a specific user by user_id in Notion. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  annotations: {
    title: "Retrieve User",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: `The ID of the user to retrieve. ${commonIdDescription}`,
      },
      format: formatParameter,
    },
    required: ["user_id"],
  },
};

export const retrieveBotUserTool: Tool = {
  name: "notion_retrieve_bot_user",
  description:
    "Retrieve the bot user associated with the current token in Notion",
  annotations: {
    title: "Retrieve Bot User",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      format: formatParameter,
    },
  },
};
export const createCommentTool: Tool = {
  name: "notion_create_comment",
  description:
    "Create a comment in Notion. This requires the integration to have 'insert comment' capabilities. You can either specify a page parent or a discussion_id, but not both.",
  annotations: {
    title: "Create Comment",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
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
            description: `The ID of the page to comment on. ${commonIdDescription}`,
          },
        },
      },
      discussion_id: {
        type: "string",
        description:
          "The ID of an existing discussion thread to add a comment to." +
          commonIdDescription,
      },
      rich_text: {
        type: "array",
        description:
          "Array of rich text objects representing the comment content.",
        items: richTextObjectSchema,
      },
      format: formatParameter,
    },
    required: ["rich_text"],
  },
};

export const retrieveCommentsTool: Tool = {
  name: "notion_retrieve_comments",
  description:
    "Retrieve a list of unresolved comments from a Notion page or block. Requires the integration to have 'read comment' capabilities.",
  annotations: {
    title: "Retrieve Comments",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The ID of the block or page whose comments you want to retrieve." +
          commonIdDescription,
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
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

// Search tool
export const findTool: Tool = {
  name: "notion_find",
  description:
    "Find Notion pages or data sources and return compact, AI-friendly candidates with stable IDs and suggested next tools. Use this before low-level retrieve/query tools when the user gives a title, partial name, or vague target. Prefer this over raw notion_search for discovery because it trims noisy API fields and highlights the IDs needed for the next action.",
  annotations: {
    title: "Find Notion Targets",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Text to search for in Notion page or data source titles. Omit to list recent accessible targets.",
      },
      object_type: {
        type: "string",
        enum: ["page", "data_source"],
        description:
          "Optional target type filter. Use 'page' when looking for content pages, and 'data_source' when looking for database-like schemas to query or create items in.",
      },
      start_cursor: {
        type: "string",
        description:
          "Pagination start cursor from a previous notion_find call.",
      },
      page_size: {
        type: "number",
        description:
          "Number of candidates to return. Keep this small for AI context efficiency; max 100.",
      },
      format: formatParameter,
    },
  },
};

export const inspectDataSourceTool: Tool = {
  name: "notion_inspect_data_source",
  description:
    "Inspect a Notion data source schema and return a compact property summary for AI agents. Use this before creating or updating items so the model can choose valid property names, option values, and relation targets without reading the full Notion API object.",
  annotations: {
    title: "Inspect Data Source",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The data source ID to inspect. Use notion_find or notion_retrieve_database first if you only have a title or database ID." +
          commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["data_source_id"],
  },
};

export const searchTool: Tool = {
  name: "notion_search",
  description: "Search pages or data sources by title in Notion",
  annotations: {
    title: "Search Notion",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in page or data source titles",
      },
      filter: {
        type: "object",
        description: "Filter results by object type (page or data_source)",
        properties: {
          property: {
            type: "string",
            description: "Must be 'object'",
          },
          value: {
            type: "string",
            description: "Either 'page' or 'data_source'",
            enum: ["page", "data_source"],
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
        description: "Number of results to return (max 100). ",
      },
      format: formatParameter,
    },
  },
};
