import type {
  BlockResponse,
  CommentResponse,
  DatabaseResponse,
  DataSourceResponse,
  ListResponse,
  PageProperty,
  PageResponse,
  RichTextItemResponse,
  UserResponse,
} from "../notion/types.js";

type ResponseMode = "auto" | "compact" | "full";

const AUTO_COMPACT_RESULT_COUNT = 10;
const AUTO_COMPACT_JSON_CHARS = 12_000;

const LIST_HEAVY_TOOLS = new Set([
  "notion_retrieve_block_children",
  "notion_query_data_source",
  "notion_query_data_source_by_values",
  "notion_list_all_users",
  "notion_retrieve_comments",
  "notion_search",
]);

export type CompactListResponse = {
  object: "notion_compact_list";
  source_object: "list";
  source_type?: string;
  result_count: number;
  has_more: boolean;
  next_cursor: string | null;
  response_mode: "compact";
  results: CompactResult[];
  full_response_hint: string;
};

type CompactResult =
  | CompactPage
  | CompactDatabase
  | CompactDataSource
  | CompactBlock
  | CompactUser
  | CompactComment
  | CompactUnknown;

type CompactPage = {
  object: "page";
  id: string;
  title: string;
  url?: string;
  parent: PageResponse["parent"];
  last_edited_time: string;
  in_trash?: boolean;
  properties?: Record<string, unknown>;
};

type CompactDatabase = {
  object: "database";
  id: string;
  title: string;
  url?: string;
  data_sources?: Array<{ id: string; name?: string }>;
  in_trash?: boolean;
};

type CompactDataSource = {
  object: "data_source";
  id: string;
  title: string;
  url?: string;
  parent_database_id: string;
  property_count: number;
  properties: Array<{ name: string; id: string; type: string }>;
  in_trash?: boolean;
};

type CompactBlock = {
  object: "block";
  id: string;
  type: string;
  text: string;
  has_children: boolean;
  in_trash?: boolean;
};

type CompactUser = {
  object: "user";
  id: string;
  name?: string;
  type?: string;
};

type CompactComment = {
  object: "comment";
  id: string;
  discussion_id: string;
  parent: CommentResponse["parent"];
  text: string;
  created_time: string;
  last_edited_time: string;
};

type CompactUnknown = {
  object: string;
  id?: string;
};

export function optimizeToolResponse(
  toolName: string,
  response: unknown,
  toolArguments: Record<string, unknown>,
): unknown {
  const responseMode = readResponseMode(toolArguments.response_mode);
  if (responseMode === "full" || !isListResponse(response)) {
    return response;
  }

  if (responseMode === "compact" || shouldAutoCompact(toolName, response)) {
    return compactListResponse(response);
  }

  return response;
}

function shouldAutoCompact(toolName: string, response: ListResponse): boolean {
  if (!LIST_HEAVY_TOOLS.has(toolName)) return false;
  if (response.results.length > AUTO_COMPACT_RESULT_COUNT) return true;
  return JSON.stringify(response).length > AUTO_COMPACT_JSON_CHARS;
}

function compactListResponse(response: ListResponse): CompactListResponse {
  return {
    object: "notion_compact_list",
    source_object: "list",
    source_type: response.type,
    result_count: response.results.length,
    has_more: response.has_more,
    next_cursor: response.next_cursor,
    response_mode: "compact",
    results: response.results.map(compactResult),
    full_response_hint:
      "If raw Notion API objects are required, call the same tool with response_mode: 'full'.",
  };
}

function compactResult(item: ListResponse["results"][number]): CompactResult {
  switch (item.object) {
    case "page":
      return compactPage(item);
    case "database":
      return compactDatabase(item);
    case "data_source":
      return compactDataSource(item);
    case "block":
      return compactBlock(item);
    case "user":
      return compactUser(item);
    case "comment":
      return compactComment(item);
    default:
      return compactUnknown(item);
  }
}

function compactPage(page: PageResponse): CompactPage {
  return {
    object: "page",
    id: page.id,
    title: extractPageTitle(page) || "Untitled page",
    url: page.url,
    parent: page.parent,
    last_edited_time: page.last_edited_time,
    in_trash: page.in_trash,
    properties: compactPageProperties(page.properties),
  };
}

function compactDatabase(database: DatabaseResponse): CompactDatabase {
  return {
    object: "database",
    id: database.id,
    title: extractRichText(database.title || []) || "Untitled database",
    url: database.url,
    data_sources: database.data_sources,
    in_trash: database.in_trash,
  };
}

function compactDataSource(dataSource: DataSourceResponse): CompactDataSource {
  return {
    object: "data_source",
    id: dataSource.id,
    title: extractRichText(dataSource.title || []) || "Untitled data source",
    url: dataSource.url,
    parent_database_id: dataSource.parent.database_id,
    property_count: Object.keys(dataSource.properties || {}).length,
    properties: Object.entries(dataSource.properties || {}).map(
      ([name, property]) => ({
        name: property.name || name,
        id: property.id,
        type: property.type,
      }),
    ),
    in_trash: dataSource.in_trash,
  };
}

function compactBlock(block: BlockResponse): CompactBlock {
  return {
    object: "block",
    id: block.id,
    type: block.type,
    text: extractBlockText(block),
    has_children: !!block.has_children,
    in_trash: block.in_trash,
  };
}

function compactUser(user: UserResponse): CompactUser {
  return {
    object: "user",
    id: user.id,
    name: user.name,
    type: user.type,
  };
}

function compactComment(comment: CommentResponse): CompactComment {
  return {
    object: "comment",
    id: comment.id,
    discussion_id: comment.discussion_id,
    parent: comment.parent,
    text: extractRichText(comment.rich_text),
    created_time: comment.created_time,
    last_edited_time: comment.last_edited_time,
  };
}

function compactUnknown(item: unknown): CompactUnknown {
  const record = isRecord(item) ? item : {};
  return {
    object: typeof record.object === "string" ? record.object : "unknown",
    id: typeof record.id === "string" ? record.id : undefined,
  };
}

function compactPageProperties(
  properties: Record<string, PageProperty>,
): Record<string, unknown> | undefined {
  const entries = Object.entries(properties || {}).map(([name, property]) => [
    name,
    compactPageProperty(property),
  ]);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function compactPageProperty(property: PageProperty): unknown {
  switch (property.type) {
    case "title":
      return extractRichText(property.title || []);
    case "rich_text":
      return extractRichText(property.rich_text || []);
    case "number":
      return property.number ?? null;
    case "select":
      return property.select?.name || null;
    case "multi_select":
      return property.multi_select?.map((option) => option.name) || [];
    case "status":
      return property.status?.name || null;
    case "date":
      return property.date || null;
    case "people":
      return property.people?.map((person) => person.id).filter(Boolean) || [];
    case "files":
      return property.files?.map((file) => file.name || file.url) || [];
    case "checkbox":
      return property.checkbox ?? null;
    case "url":
      return property.url || null;
    case "email":
      return property.email || null;
    case "phone_number":
      return property.phone_number || null;
    case "relation":
      return property.relation?.map((relation) => relation.id) || [];
    case "created_time":
      return property.created_time;
    case "last_edited_time":
      return property.last_edited_time;
    default:
      return { type: property.type };
  }
}

function extractBlockText(block: BlockResponse): string {
  const content = toRecord(block[block.type]);
  const richText = Array.isArray(content.rich_text)
    ? (content.rich_text as RichTextItemResponse[])
    : [];
  if (richText.length > 0) return extractRichText(richText);

  if (typeof content.title === "string") return content.title;
  if (typeof content.url === "string") return content.url;

  return "";
}

function extractPageTitle(page: PageResponse): string {
  for (const property of Object.values(page.properties || {})) {
    if (property.type === "title" && Array.isArray(property.title)) {
      return extractRichText(property.title);
    }
  }

  return "";
}

function extractRichText(richTextArray: RichTextItemResponse[]): string {
  return richTextArray
    .map((item) => item.plain_text || item.text?.content || "")
    .join("");
}

function readResponseMode(value: unknown): ResponseMode {
  return value === "compact" || value === "full" ? value : "auto";
}

function isListResponse(value: unknown): value is ListResponse {
  return (
    isRecord(value) &&
    value.object === "list" &&
    Array.isArray(value.results) &&
    typeof value.has_more === "boolean" &&
    "next_cursor" in value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
