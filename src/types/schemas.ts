/**
 * Schema definitions for Notion API tools
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  commonIdDescription,
  formatParameter,
  richTextObjectSchema,
  blockObjectSchema,
} from "./common.js";

// Blocks tools
export const appendBlockChildrenTool: Tool = {
  name: "notion_append_block_children",
  description:
    "Append new children blocks to a specified parent block in Notion. Requires insert content capabilities. You can optionally specify the 'after' parameter to append after a certain block.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the parent block." + commonIdDescription,
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
          "The ID of the existing block that the new block should be appended after." +
          commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["block_id", "children"],
  },
};

export const retrieveBlockTool: Tool = {
  name: "notion_retrieve_block",
  description: "Retrieve a block from Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to retrieve." + commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const retrieveBlockChildrenTool: Tool = {
  name: "notion_retrieve_block_children",
  description: "Retrieve the children of a block",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block." + commonIdDescription,
      },
      start_cursor: {
        type: "string",
        description: "Pagination cursor for next page of results",
      },
      page_size: {
        type: "number",
        description: "Number of results per page (max 100)",
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const deleteBlockTool: Tool = {
  name: "notion_delete_block",
  description: "Delete a block in Notion",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to delete." + commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["block_id"],
  },
};

export const updateBlockTool: Tool = {
  name: "notion_update_block",
  description:
    "Update the content of a block in Notion based on its type. The update replaces the entire value for a given field.",
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description: "The ID of the block to update." + commonIdDescription,
      },
      block: {
        type: "object",
        description:
          "The updated content for the block. Must match the block's type schema.",
      },
      format: formatParameter,
    },
    required: ["block_id", "block"],
  },
};

// Pages tools
export const retrievePageTool: Tool = {
  name: "notion_retrieve_page",
  description: "Retrieve a page from Notion",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The ID of the page to retrieve." + commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["page_id"],
  },
};

export const updatePagePropertiesTool: Tool = {
  name: "notion_update_page_properties",
  description: "Update properties of a page or an item in a Notion database",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description:
          "The ID of the page or database item to update." +
          commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties to update. These correspond to the columns or fields in the database.",
      },
      format: formatParameter,
    },
    required: ["page_id", "properties"],
  },
};

// Users tools
export const listAllUsersTool: Tool = {
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
      format: formatParameter,
    },
  },
};

export const retrieveUserTool: Tool = {
  name: "notion_retrieve_user",
  description:
    "Retrieve a specific user by user_id in Notion. **Note:** This function requires upgrading to the Notion Enterprise plan and using an Organization API key to avoid permission errors.",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user to retrieve." + commonIdDescription,
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
  inputSchema: {
    type: "object",
    properties: {
      random_string: {
        type: "string",
        description: "Dummy parameter for no-parameter tools",
      },
      format: formatParameter,
    },
    required: ["random_string"],
  },
};

// Databases tools
export const createDatabaseTool: Tool = {
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
      format: formatParameter,
    },
    required: ["parent", "properties"],
  },
};

export const queryDatabaseTool: Tool = {
  name: "notion_query_database",
  description:
    "Query a database in Notion. Automatically paginates through all results and returns the complete dataset.",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description: "The ID of the database to query." + commonIdDescription,
      },
      filter: {
        type: "object",
        description: "Filter conditions",
      },
      sorts: {
        type: "array",
        description: "Sort conditions",
        items: {
          type: "object",
          properties: {
            property: { type: "string" },
            timestamp: { type: "string" },
            direction: {
              type: "string",
              enum: ["ascending", "descending"],
            },
          },
          required: ["direction"],
        },
      },
      format: formatParameter,
    },
    required: ["database_id"],
  },
};

export const retrieveDatabaseTool: Tool = {
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
      format: formatParameter,
    },
    required: ["database_id"],
  },
};

export const updateDatabaseTool: Tool = {
  name: "notion_update_database",
  description: "Update a database in Notion",
  inputSchema: {
    type: "object",
    properties: {
      database_id: {
        type: "string",
        description: "The ID of the database to update." + commonIdDescription,
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
        items: richTextObjectSchema,
      },
      properties: {
        type: "object",
        description:
          "The properties of a database to be changed in the request, in the form of a JSON object.",
      },
      format: formatParameter,
    },
    required: ["database_id"],
  },
};

export const createDatabaseItemTool: Tool = {
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
      format: formatParameter,
    },
    required: ["database_id", "properties"],
  },
};

// Page creation tool
export const createPageTool: Tool = {
  name: "notion_create_page",
  description:
    "Create a new page in Notion. The page can be created as a child of another page or as an item in a database. Supports setting properties, content blocks, icon, and cover image.",
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description:
          "Parent object specifying where to create the page. Use page_id to create a subpage, or database_id to create a database item.",
        properties: {
          type: {
            type: "string",
            description: "Type of parent: 'page_id' or 'database_id'",
            enum: ["page_id", "database_id"],
          },
          page_id: {
            type: "string",
            description:
              "The ID of the parent page (when type is 'page_id')." +
              commonIdDescription,
          },
          database_id: {
            type: "string",
            description:
              "The ID of the parent database (when type is 'database_id')." +
              commonIdDescription,
          },
        },
        required: ["type"],
      },
      properties: {
        type: "object",
        description:
          "Page properties. For pages under a page, use a 'title' property with a rich text array. For database items, match the database schema.",
      },
      children: {
        type: "array",
        description: "Array of block objects to add as page content.",
        items: blockObjectSchema,
      },
      icon: {
        type: "object",
        description: "Page icon. Use type 'emoji' with an emoji character, or type 'external' with an image URL.",
        properties: {
          type: {
            type: "string",
            enum: ["emoji", "external"],
          },
          emoji: {
            type: "string",
            description: "Emoji character (when type is 'emoji')",
          },
          external: {
            type: "object",
            description: "External image (when type is 'external')",
            properties: {
              url: { type: "string", description: "URL of the icon image" },
            },
          },
        },
      },
      cover: {
        type: "object",
        description: "Page cover image. Must be type 'external' with an image URL.",
        properties: {
          type: {
            type: "string",
            enum: ["external"],
          },
          external: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL of the cover image" },
            },
          },
        },
      },
      format: formatParameter,
    },
    required: ["parent", "properties"],
  },
};

// Archive page tool
export const archivePageTool: Tool = {
  name: "notion_archive_page",
  description:
    "Archive or restore a page in Notion. Set archived to true to archive, false to restore.",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The ID of the page to archive or restore." + commonIdDescription,
      },
      archived: {
        type: "boolean",
        description: "True to archive the page, false to restore it.",
      },
      format: formatParameter,
    },
    required: ["page_id", "archived"],
  },
};

// Retrieve page property item tool
export const retrievePagePropertyItemTool: Tool = {
  name: "notion_retrieve_page_property_item",
  description:
    "Retrieve a specific property value from a Notion page. Useful for paginated properties like relations, rollups, rich_text, and title. Automatically paginates through all results.",
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The ID of the page." + commonIdDescription,
      },
      property_id: {
        type: "string",
        description:
          "The ID of the property to retrieve. You can get property IDs from the page object returned by notion_retrieve_page.",
      },
      format: formatParameter,
    },
    required: ["page_id", "property_id"],
  },
};

// Comments tools
export const createCommentTool: Tool = {
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
export const searchTool: Tool = {
  name: "notion_search",
  description:
    "Search pages or databases by title in Notion. Automatically paginates through all results and returns the complete dataset.",
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
      format: formatParameter,
    },
  },
};
