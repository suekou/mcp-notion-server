import type {
  DatabasePropertyConfig,
  DatabaseResponse,
  DataSourceResponse,
  ListResponse,
  PageProperty,
  PageResponse,
  RichTextItemResponse,
} from "../../notion/types.js";

type FindableObject = PageResponse | DatabaseResponse | DataSourceResponse;
type NamedOption = { name: string };

export type NotionFindResult = {
  object: FindableObject["object"];
  id: string;
  title: string;
  url?: string;
  parent?: Record<string, unknown>;
  data_sources?: Array<{ id: string; name?: string }>;
  suggested_next_tool: string;
};

export type NotionFindSummary = {
  object: "notion_find_results";
  query?: string;
  results: NotionFindResult[];
  next_cursor: string | null;
  has_more: boolean;
};

export type DataSourcePropertySummary = {
  name: string;
  id: string;
  type: string;
  options?: string[];
  relation?: {
    database_id?: string;
    data_source_id?: string;
  };
};

export type DataSourceSchemaSummary = {
  object: "notion_data_source_schema";
  id: string;
  title: string;
  parent_database_id: string;
  property_count: number;
  properties: DataSourcePropertySummary[];
  create_item_hint: {
    tool: "notion_create_data_source_item";
    required_parent: {
      data_source_id: string;
    };
  };
};

export function summarizeFindResults(
  response: ListResponse,
  query?: string,
): NotionFindSummary {
  return {
    object: "notion_find_results",
    query,
    results: response.results
      .filter(isFindableObject)
      .map((item) => summarizeFindableObject(item)),
    next_cursor: response.next_cursor,
    has_more: response.has_more,
  };
}

export function summarizeDataSourceSchema(
  dataSource: DataSourceResponse,
): DataSourceSchemaSummary {
  const properties = Object.entries(dataSource.properties || {}).map(
    ([name, property]) => summarizeProperty(name, property),
  );

  return {
    object: "notion_data_source_schema",
    id: dataSource.id,
    title: extractRichText(dataSource.title || []) || "Untitled data source",
    parent_database_id: dataSource.parent.database_id,
    property_count: properties.length,
    properties,
    create_item_hint: {
      tool: "notion_create_data_source_item",
      required_parent: {
        data_source_id: dataSource.id,
      },
    },
  };
}

function summarizeFindableObject(item: FindableObject): NotionFindResult {
  switch (item.object) {
    case "page":
      return {
        object: item.object,
        id: item.id,
        title: extractPageTitle(item) || "Untitled page",
        url: item.url,
        parent: item.parent,
        suggested_next_tool: "notion_retrieve_page",
      };
    case "database":
      return {
        object: item.object,
        id: item.id,
        title: extractRichText(item.title || []) || "Untitled database",
        url: item.url,
        parent: item.parent,
        data_sources: item.data_sources,
        suggested_next_tool: "notion_retrieve_database",
      };
    case "data_source":
      return {
        object: item.object,
        id: item.id,
        title: extractRichText(item.title || []) || "Untitled data source",
        url: item.url,
        parent: item.parent,
        suggested_next_tool: "notion_inspect_data_source",
      };
  }
}

function summarizeProperty(
  name: string,
  property: DatabasePropertyConfig,
): DataSourcePropertySummary {
  const summary: DataSourcePropertySummary = {
    name: property.name || name,
    id: property.id,
    type: property.type,
  };

  const options = extractOptions(property);
  if (options.length > 0) summary.options = options;

  if (property.type === "relation" && property.relation) {
    summary.relation = {
      database_id: property.relation.database_id,
      data_source_id: property.relation.data_source_id,
    };
  }

  return summary;
}

function extractOptions(property: DatabasePropertyConfig): string[] {
  if (property.type === "select") {
    return readOptions(property.select).map((option) => option.name);
  }
  if (property.type === "multi_select") {
    return readOptions(property.multi_select).map((option) => option.name);
  }
  if (property.type === "status") {
    return readOptions(property.status).map((option) => option.name);
  }

  return [];
}

function readOptions(config: unknown): NamedOption[] {
  if (!isRecord(config) || !Array.isArray(config.options)) return [];
  return config.options.filter(isNamedOption);
}

function isNamedOption(value: unknown): value is NamedOption {
  return isRecord(value) && typeof value.name === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isFindableObject(item: unknown): item is FindableObject {
  return (
    !!item &&
    typeof item === "object" &&
    "object" in item &&
    ["page", "database", "data_source"].includes(
      (item as { object: string }).object,
    )
  );
}

function extractPageTitle(page: PageResponse): string {
  for (const property of Object.values(page.properties || {})) {
    const pageProperty = property as PageProperty;
    if (pageProperty.type === "title" && Array.isArray(pageProperty.title)) {
      return extractRichText(pageProperty.title);
    }
  }

  return "";
}

function extractRichText(richTextArray: RichTextItemResponse[]): string {
  return richTextArray
    .map((item) => item.plain_text || item.text?.content || "")
    .join("");
}
