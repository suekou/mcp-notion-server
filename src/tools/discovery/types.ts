import type { RichTextItemResponse } from "../../notion/types.js";

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
  format?: "json" | "markdown";
}
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
