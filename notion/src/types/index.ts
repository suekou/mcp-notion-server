/**
 * Type definitions for Notion API responses
 */

export type NotionObjectType =
  | "page"
  | "database"
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
  archived?: boolean;
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
  archived?: boolean;
  in_trash?: boolean;
  url?: string;
  public_url?: string;
  parent: {
    type: "database_id" | "page_id" | "workspace";
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
  properties: Record<string, DatabasePropertyConfig>;
  parent?: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
  archived?: boolean;
  is_inline?: boolean;
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
  | BlockResponse
  | ListResponse
  | UserResponse
  | CommentResponse;
