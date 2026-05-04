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

const simpleContentItemSchema = {
  type: "object",
  description:
    "A simplified Notion content item. The server converts this into a valid Notion block object.",
  properties: {
    type: {
      type: "string",
      enum: [
        "paragraph",
        "heading_1",
        "heading_2",
        "heading_3",
        "bulleted_list_item",
        "numbered_list_item",
        "to_do",
        "quote",
        "callout",
        "code",
        "divider",
      ],
      description: "The simple content type to append.",
    },
    text: {
      type: "string",
      description:
        "Plain text content. Required for all types except divider.",
    },
    checked: {
      type: "boolean",
      description: "Only used for to_do items.",
    },
    language: {
      type: "string",
      description: "Only used for code blocks. Defaults to plain text.",
    },
    is_toggleable: {
      type: "boolean",
      description: "Only used for heading blocks.",
    },
  },
  required: ["type"],
};

const simpleEditableContentItemSchema = {
  ...simpleContentItemSchema,
  description:
    "A simplified Notion content item for updating an existing editable block. The type must match the current block type.",
  properties: {
    ...simpleContentItemSchema.properties,
    type: {
      ...simpleContentItemSchema.properties.type,
      enum: [
        "paragraph",
        "heading_1",
        "heading_2",
        "heading_3",
        "bulleted_list_item",
        "numbered_list_item",
        "to_do",
        "quote",
        "callout",
        "code",
      ],
      description:
        "The existing block type to update. Must match the block's current type.",
    },
  },
};

const simpleDataSourceFilterSchema = {
  type: "object",
  description:
    "A schema-aware filter for common Notion data source property types. The server converts it into raw Notion filter JSON.",
  properties: {
    property: {
      type: "string",
      description:
        "Exact property name from notion_inspect_data_source, for example Status, Tags, Due, or Estimate.",
    },
    operator: {
      type: "string",
      enum: [
        "equals",
        "does_not_equal",
        "contains",
        "does_not_contain",
        "greater_than",
        "less_than",
        "greater_than_or_equal_to",
        "less_than_or_equal_to",
        "before",
        "after",
        "on_or_before",
        "on_or_after",
        "is_empty",
        "is_not_empty",
      ],
      description:
        "Optional operator. Defaults are type-aware: text/multi_select/relation/people use contains, most other types use equals.",
    },
    value: {
      description:
        "Filter value. Use strings for text/options/dates/relation IDs, numbers for number properties, booleans for checkbox properties. Omit for is_empty/is_not_empty.",
    },
  },
  required: ["property"],
};

const simpleDataSourceSortSchema = {
  type: "object",
  description: "A simple property sort for a data source query.",
  properties: {
    property: {
      type: "string",
      description: "Exact property name to sort by.",
    },
    direction: {
      type: "string",
      enum: ["ascending", "descending"],
      description: "Sort direction. Defaults to ascending.",
    },
  },
  required: ["property"],
};

// Blocks tools
export const appendBlockChildrenTool: Tool = {
  name: "notion_append_block_children",
  description:
    "Append new children blocks to a specified parent block in Notion. Requires insert content capabilities. Use the optional 'position' object to insert at the start, end, or after a specific block.",
  annotations: {
    title: "Append Block Children",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
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
      position: {
        type: "object",
        description:
          "Where to insert the children. Omit this to append at the end. Use { type: 'after_block', after_block: { id } } to replace the old Notion API 'after' parameter.",
        properties: {
          type: {
            type: "string",
            enum: ["after_block", "start", "end"],
          },
          after_block: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The existing block ID to insert after." + commonIdDescription,
              },
            },
            required: ["id"],
          },
        },
        required: ["type"],
      },
      format: formatParameter,
    },
    required: ["block_id", "children"],
  },
};

export const appendContentTool: Tool = {
  name: "notion_append_content",
  description:
    "Append common Notion content without writing raw Notion block JSON. Use this for everyday page editing when the user wants to add paragraphs, headings, lists, todos, quotes, callouts, code blocks, or dividers. For unsupported block types or advanced rich text annotations, use notion_append_block_children with raw Notion block objects.",
  annotations: {
    title: "Append Simple Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The parent block or page ID to append content to." +
          commonIdDescription,
      },
      items: {
        type: "array",
        description:
          "Simplified content items to append in order. Keep batches reasonably small for easier review.",
        items: simpleContentItemSchema,
      },
      position: {
        type: "object",
        description:
          "Where to insert the content. Omit this to append at the end.",
        properties: {
          type: {
            type: "string",
            enum: ["after_block", "start", "end"],
          },
          after_block: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "The existing block ID to insert after." +
                  commonIdDescription,
              },
            },
            required: ["id"],
          },
        },
        required: ["type"],
      },
      format: formatParameter,
    },
    required: ["block_id", "items"],
  },
};

export const updateContentTool: Tool = {
  name: "notion_update_content",
  description:
    "Update an existing Notion block without writing raw Notion block JSON. Use this after notion_read_page gives you a block ID and you need to replace the text or simple fields of an existing paragraph, heading, list item, todo, quote, callout, or code block. The item.type must match the block's current type; this tool will reject mismatches so the model can correct itself.",
  annotations: {
    title: "Update Simple Content",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      block_id: {
        type: "string",
        description:
          "The existing block ID to update. Use notion_read_page to find block IDs." +
          commonIdDescription,
      },
      item: simpleEditableContentItemSchema,
      format: formatParameter,
    },
    required: ["block_id", "item"],
  },
};

export const retrieveBlockTool: Tool = {
  name: "notion_retrieve_block",
  description: "Retrieve a block from Notion",
  annotations: {
    title: "Retrieve Block",
    readOnlyHint: true,
    destructiveHint: false,
  },
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
  annotations: {
    title: "Retrieve Block Children",
    readOnlyHint: true,
    destructiveHint: false,
  },
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
  annotations: {
    title: "Delete Block",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
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
  annotations: {
    title: "Update Block",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
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
  annotations: {
    title: "Retrieve Page",
    readOnlyHint: true,
    destructiveHint: false,
  },
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

export const readPageTool: Tool = {
  name: "notion_read_page",
  description:
    "Read a Notion page with compact page metadata plus block content in an AI-friendly outline or Markdown shape. Use this after notion_find when you need to understand or edit a page. It fetches child blocks with max_depth and max_blocks limits so large pages do not overwhelm the model. The outline includes stable block IDs that can be used with notion_append_content position.after_block.",
  annotations: {
    title: "Read Page Content",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      page_id: {
        type: "string",
        description: "The ID of the page to read." + commonIdDescription,
      },
      content_format: {
        type: "string",
        enum: ["outline", "markdown", "json"],
        description:
          "How to present page content. Use outline for compact block IDs and text, markdown for human-readable reading, or json for a structured outline without rendered Markdown.",
      },
      max_depth: {
        type: "number",
        description:
          "Maximum child-block depth to fetch. Defaults to 2. Increase only when nested content is needed.",
      },
      max_blocks: {
        type: "number",
        description:
          "Maximum number of blocks to fetch across the page tree. Defaults to 100.",
      },
      page_size: {
        type: "number",
        description:
          "Number of block children to request per Notion API page. Defaults to 100 and cannot exceed 100.",
      },
      include_properties: {
        type: "boolean",
        description:
          "Whether to include compact page property values in the response. Defaults to false to save context.",
      },
      format: formatParameter,
    },
    required: ["page_id"],
  },
};

export const updatePagePropertiesTool: Tool = {
  name: "notion_update_page_properties",
  description: "Update properties of a page or an item in a Notion database",
  annotations: {
    title: "Update Page Properties",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
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
  annotations: {
    title: "Retrieve Bot User",
    readOnlyHint: true,
    destructiveHint: false,
  },
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

// Data source tools
export const createDataSourceTool: Tool = {
  name: "notion_create_data_source",
  description:
    "Create a Notion data source. In the 2025-09-03+ Notion API, data sources are the schema-bearing objects that replace most direct database operations.",
  annotations: {
    title: "Create Data Source",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      parent: {
        type: "object",
        description: "Parent page object for the data source.",
      },
      title: {
        type: "array",
        description:
          "Title of the data source as it appears in Notion. An array of rich text objects.",
        items: richTextObjectSchema,
      },
      properties: {
        type: "object",
        description:
          "Property schema of the data source. The keys are property names and the values are property schema objects.",
      },
      format: formatParameter,
    },
    required: ["parent", "properties"],
  },
};

export const queryDataSourceTool: Tool = {
  name: "notion_query_data_source",
  description:
    "Query a Notion data source with filters, sorts, and pagination. Use notion_retrieve_database first when you only have a database ID and need to discover its data_source_id.",
  annotations: {
    title: "Query Data Source",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description: "The ID of the data source to query." + commonIdDescription,
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
    required: ["data_source_id"],
  },
};

export const queryDataSourceByValuesTool: Tool = {
  name: "notion_query_data_source_by_values",
  description:
    "Query a Notion data source using simple schema-aware filters and sorts instead of raw Notion filter JSON. Use this after notion_inspect_data_source when the user asks for common queries like Status equals Done, Tags contains AI, Due on or before a date, Estimate greater than 3, or Done equals false. The server validates property names, option names, value types, and supported operators before calling Notion.",
  annotations: {
    title: "Query Data Source By Values",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description: "The ID of the data source to query." + commonIdDescription,
      },
      filters: {
        type: "array",
        description:
          "Simple schema-aware filters. Multiple filters are combined with match=all by default.",
        items: simpleDataSourceFilterSchema,
      },
      match: {
        type: "string",
        enum: ["all", "any"],
        description:
          "How to combine multiple filters. all maps to Notion and; any maps to Notion or.",
      },
      sorts: {
        type: "array",
        description: "Simple property sorts.",
        items: simpleDataSourceSortSchema,
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
    required: ["data_source_id"],
  },
};

export const retrieveDatabaseTool: Tool = {
  name: "notion_retrieve_database",
  description:
    "Retrieve a Notion database container and its child data_sources. Use this to discover which data_source_id should be used for query, schema, and item creation operations.",
  annotations: {
    title: "Retrieve Database",
    readOnlyHint: true,
    destructiveHint: false,
  },
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

export const retrieveDataSourceTool: Tool = {
  name: "notion_retrieve_data_source",
  description:
    "Retrieve metadata and property schema for a Notion data source.",
  annotations: {
    title: "Retrieve Data Source",
    readOnlyHint: true,
    destructiveHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to retrieve." + commonIdDescription,
      },
      format: formatParameter,
    },
    required: ["data_source_id"],
  },
};

export const updateDataSourceTool: Tool = {
  name: "notion_update_data_source",
  description: "Update a Notion data source title, description, or properties.",
  annotations: {
    title: "Update Data Source",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to update." + commonIdDescription,
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
    required: ["data_source_id"],
  },
};

export const createDataSourceItemTool: Tool = {
  name: "notion_create_data_source_item",
  description:
    "Create a new page item in a Notion data source. Use the data_source_id, not the database_id, as the parent.",
  annotations: {
    title: "Create Data Source Item",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to add the item to." + commonIdDescription,
      },
      properties: {
        type: "object",
        description:
          "Properties of the new database item. These should match the database schema.",
      },
      format: formatParameter,
    },
    required: ["data_source_id", "properties"],
  },
};

export const createDataSourceItemFromValuesTool: Tool = {
  name: "notion_create_data_source_item_from_values",
  description:
    "Create a new page item in a Notion data source using simple property values instead of raw Notion property JSON. The server retrieves the data source schema and converts common property types for you: title, rich_text, number, checkbox, select, status, multi_select, date, url, email, phone_number, relation, and people. Use notion_inspect_data_source first when you need valid property names or option values.",
  annotations: {
    title: "Create Item From Values",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
  inputSchema: {
    type: "object",
    properties: {
      data_source_id: {
        type: "string",
        description:
          "The ID of the data source to add the item to." + commonIdDescription,
      },
      values: {
        type: "object",
        description:
          "Simple property values keyed by exact Notion property name. Examples: { Name: 'Task', Status: 'Done', Tags: ['AI', 'MCP'], Due: '2026-05-04', Done: false }.",
      },
      format: formatParameter,
    },
    required: ["data_source_id", "values"],
  },
};

// Comments tools
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
        description: "Pagination start cursor from a previous notion_find call.",
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
