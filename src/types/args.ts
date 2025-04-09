/**
 * Type definitions for tool arguments
 */

import { RichTextItemResponse, BlockResponse } from "./responses.js";

// Blocks
export interface AppendBlockChildrenArgs {
  block_id: string;
  children: Partial<BlockResponse>[];
  after?: string;
  format?: "json" | "markdown";
}

export interface RetrieveBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface RetrieveBlockChildrenArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface DeleteBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface UpdateBlockArgs {
  block_id: string;
  block: Partial<BlockResponse>;
  format?: "json" | "markdown";
}

// Pages
export interface RetrievePageArgs {
  page_id: string;
  format?: "json" | "markdown";
}

export interface UpdatePagePropertiesArgs {
  page_id: string;
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

// Users
export interface ListAllUsersArgs {
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface RetrieveUserArgs {
  user_id: string;
  format?: "json" | "markdown";
}

export interface RetrieveBotUserArgs {
  random_string: string;
  format?: "json" | "markdown";
}

// Databases
export interface CreateDatabaseArgs {
  parent: {
    type: string;
    page_id?: string;
    database_id?: string;
    workspace?: boolean;
  };
  title?: RichTextItemResponse[];
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

export interface QueryDatabaseArgs {
  database_id: string;
  filter?: Record<string, any>;
  sorts?: Array<{
    property?: string;
    timestamp?: string;
    direction: "ascending" | "descending";
  }>;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface RetrieveDatabaseArgs {
  database_id: string;
  format?: "json" | "markdown";
}

export interface UpdateDatabaseArgs {
  database_id: string;
  title?: RichTextItemResponse[];
  description?: RichTextItemResponse[];
  properties?: Record<string, any>;
  format?: "json" | "markdown";
}

export interface CreateDatabaseItemArgs {
  database_id: string;
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

// Comments
export interface CreateCommentArgs {
  parent?: { page_id: string };
  discussion_id?: string;
  rich_text: RichTextItemResponse[];
  format?: "json" | "markdown";
}

export interface RetrieveCommentsArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

// Search
export interface SearchArgs {
  query?: string;
  filter?: { property: string; value: string };
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}
