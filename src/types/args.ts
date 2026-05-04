/**
 * Type definitions for tool arguments
 */

import type {
  SimpleContentItem,
  SimpleEditableContentItem,
} from "../content/index.js";
import type { PageContentFormat } from "../page/index.js";
import type { SimplePropertyValues } from "../properties/index.js";
import { RichTextItemResponse, BlockResponse } from "./responses.js";

export type AppendBlockChildrenPosition =
  | {
      type: "after_block";
      after_block: {
        id: string;
      };
    }
  | {
      type: "start";
    }
  | {
      type: "end";
    };

// Blocks
export interface AppendBlockChildrenArgs {
  block_id: string;
  children: Partial<BlockResponse>[];
  position?: AppendBlockChildrenPosition;
  format?: "json" | "markdown";
}

export interface AppendContentArgs {
  block_id: string;
  items: SimpleContentItem[];
  position?: AppendBlockChildrenPosition;
  format?: "json" | "markdown";
}

export interface UpdateContentArgs {
  block_id: string;
  item: SimpleEditableContentItem;
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

export interface ReadPageArgs {
  page_id: string;
  content_format?: PageContentFormat;
  max_depth?: number;
  max_blocks?: number;
  page_size?: number;
  include_properties?: boolean;
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

// Data sources
export interface CreateDataSourceArgs {
  parent: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
  title?: RichTextItemResponse[];
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

export interface QueryDataSourceArgs {
  data_source_id: string;
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

export interface RetrieveDataSourceArgs {
  data_source_id: string;
  format?: "json" | "markdown";
}

export interface UpdateDataSourceArgs {
  data_source_id: string;
  title?: RichTextItemResponse[];
  description?: RichTextItemResponse[];
  properties?: Record<string, any>;
  format?: "json" | "markdown";
}

export interface CreateDataSourceItemArgs {
  data_source_id: string;
  properties: Record<string, any>;
  format?: "json" | "markdown";
}

export interface CreateDataSourceItemFromValuesArgs {
  data_source_id: string;
  values: SimplePropertyValues;
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
export interface FindArgs {
  query?: string;
  object_type?: "page" | "data_source";
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface InspectDataSourceArgs {
  data_source_id: string;
  format?: "json" | "markdown";
}

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
