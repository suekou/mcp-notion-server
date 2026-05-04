import type { PageContentFormat } from "./reader.js";

export type NotionJsonObject = Record<string, unknown>;

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
  properties: NotionJsonObject;
  format?: "json" | "markdown";
}
