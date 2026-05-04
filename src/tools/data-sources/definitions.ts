import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  commonIdDescription,
  formatParameter,
  responseModeParameter,
  richTextObjectSchema,
} from "../../mcp/schema.js";

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
        description: `The ID of the data source to query. ${commonIdDescription}`,
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
      response_mode: responseModeParameter,
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
        description: `The ID of the data source to query. ${commonIdDescription}`,
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
      response_mode: responseModeParameter,
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
        description: `The ID of the database to retrieve. ${commonIdDescription}`,
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
        description: `The ID of the data source to retrieve. ${commonIdDescription}`,
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
        description: `The ID of the data source to update. ${commonIdDescription}`,
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
        description: `The ID of the data source to add the item to. ${commonIdDescription}`,
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
        description: `The ID of the data source to add the item to. ${commonIdDescription}`,
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
