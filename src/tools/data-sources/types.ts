import type { RichTextItemResponse } from "../../notion/types.js";
import type { SimplePropertyValues } from "./properties.js";
import type { SimpleDataSourceFilter, SimpleDataSourceSort } from "./query.js";

export type NotionJsonObject = Record<string, unknown>;

export interface CreateDataSourceArgs {
  parent: {
    type: string;
    page_id?: string;
    workspace?: boolean;
  };
  title?: RichTextItemResponse[];
  properties: NotionJsonObject;
  format?: "json" | "markdown";
}

export interface QueryDataSourceArgs {
  data_source_id: string;
  filter?: NotionJsonObject;
  sorts?: Array<{
    property?: string;
    timestamp?: string;
    direction: "ascending" | "descending";
  }>;
  start_cursor?: string;
  page_size?: number;
  format?: "json" | "markdown";
}

export interface QueryDataSourceByValuesArgs {
  data_source_id: string;
  filters?: SimpleDataSourceFilter[];
  match?: "all" | "any";
  sorts?: SimpleDataSourceSort[];
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
  properties?: NotionJsonObject;
  format?: "json" | "markdown";
}

export interface CreateDataSourceItemArgs {
  data_source_id: string;
  properties: NotionJsonObject;
  format?: "json" | "markdown";
}

export interface CreateDataSourceItemFromValuesArgs {
  data_source_id: string;
  values: SimplePropertyValues;
  format?: "json" | "markdown";
}
