/**
 * Type definitions for Notion API responses
 */

export type NotionObjectType =
  | "page"
  | "database"
  | "data_source"
  | "block"
  | "list"
  | "user"
  | "comment";

export type RichTextItemResponse = {
  type: "text" | "mention" | "equation";
  text?: {
    content: string;
    link?: {
      url: string;
    } | null;
  };
  mention?: {
    type:
      | "database"
      | "date"
      | "link_preview"
      | "page"
      | "template_mention"
      | "user";
    [key: string]: any;
  };
  annotations?: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text?: string;
  href?: string | null;
  equation?: {
    expression: string;
  };
};

export type BlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "toggle"
  | "child_page"
  | "child_database"
  | "embed"
  | "callout"
  | "quote"
  | "equation"
  | "divider"
  | "table_of_contents"
  | "column"
  | "column_list"
  | "link_preview"
  | "synced_block"
  | "template"
  | "link_to_page"
  | "meeting_notes"
  | "audio"
  | "bookmark"
  | "breadcrumb"
  | "code"
  | "file"
  | "image"
  | "pdf"
  | "video"
  | "unsupported"
  | string;

export type BlockResponse = {
  object: "block";
  id: string;
  type: BlockType;
  created_time: string;
  last_edited_time: string;
  has_children?: boolean;
  in_trash?: boolean;
  [key: string]: any;
};

export type PageResponse = {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by?: {
    object: "user";
    id: string;
  };
  last_edited_by?: {
    object: "user";
    id: string;
  };
  cover?: {
    type: string;
    [key: string]: any;
  } | null;
  icon?: {
    type: string;
    [key: string]: any;
  } | null;
  in_trash?: boolean;
  url?: string;
  public_url?: string;
  parent: {
    type: "data_source_id" | "database_id" | "page_id" | "workspace";
    data_source_id?: string;
    database_id?: string;
    page_id?: string;
  };
  properties: Record<string, PageProperty>;
};

export type PageProperty = {
  id: string;
  type: string;
  [key: string]: any;
};

export type DatabaseResponse = {
  object: "database";
  id: string;
  created_time: string;
  last_edited_time: string;
  title: RichTextItemResponse[];
  description?: RichTextItemResponse[];
  url?: string;
  icon?: {
    type: string;
    emoji?: string;
    [key: string]: any;
  } | null;
  cover?: {
    type: string;
    [key: string]: any;
  } | null;
  properties?: Record<string, DatabasePropertyConfig>;
  data_sources?: Array<{
    id: string;
    name?: string;
  }>;
  parent?: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
  in_trash?: boolean;
  is_inline?: boolean;
};

export type DataSourceResponse = {
  object: "data_source";
  id: string;
  created_time?: string;
  last_edited_time?: string;
  title?: RichTextItemResponse[];
  description?: RichTextItemResponse[];
  properties: Record<string, DatabasePropertyConfig>;
  parent: {
    type: "database_id";
    database_id: string;
  };
  database_parent?: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
  in_trash?: boolean;
  url?: string;
};

export type DatabasePropertyConfig = {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
};

export type ListResponse = {
  object: "list";
  results: Array<
    | PageResponse
    | DatabaseResponse
    | DataSourceResponse
    | BlockResponse
    | UserResponse
    | CommentResponse
  >;
  next_cursor: string | null;
  has_more: boolean;
  type?: string;
  page_or_database?: Record<string, any>;
};

export type UserResponse = {
  object: "user";
  id: string;
  name?: string;
  avatar_url?: string | null;
  type?: "person" | "bot";
  person?: {
    email: string;
  };
  bot?: Record<string, any>;
};

export type CommentResponse = {
  object: "comment";
  id: string;
  parent: {
    type: "page_id" | "block_id";
    page_id?: string;
    block_id?: string;
  };
  discussion_id: string;
  created_time: string;
  last_edited_time: string;
  created_by: {
    object: "user";
    id: string;
  };
  rich_text: RichTextItemResponse[];
};

export type NotionResponse =
  | PageResponse
  | DatabaseResponse
  | DataSourceResponse
  | BlockResponse
  | ListResponse
  | UserResponse
  | CommentResponse;
