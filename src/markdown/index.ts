import type {
  BlockResponse,
  CommentResponse,
  DatabasePropertyConfig,
  DatabaseResponse,
  DataSourceResponse,
  ListResponse,
  NotionResponse,
  PageProperty,
  PageResponse,
  RichTextItemResponse,
  UserResponse,
} from "../notion/types.js";

type NamedOption = { name: string };
type RelationReference = { id: string };
type NotionFileReference = {
  name?: string;
  type?: string;
  external?: { url?: string };
  file?: { url?: string };
  url?: string;
};
type NotionUserReference = {
  id?: string;
  name?: string;
};
type NotionDateValue = {
  start?: string;
  end?: string | null;
};
type NotionIconValue = {
  type?: string;
  emoji?: string;
  external?: { url?: string };
  file?: { url?: string };
};
type NotionParentValue = {
  type?: string;
  page_id?: string;
  data_source_id?: string;
  database_id?: string;
  block_id?: string;
};

export type MarkdownRenderOptions = {
  includeBlockMetadata?: boolean;
  depth?: number;
};

export type MarkdownBlockNode = {
  id: string;
  type: string;
  markdown?: string;
  children?: MarkdownBlockNode[];
  children_omitted?: "max_depth" | "max_blocks";
};

export function convertToMarkdown(
  response: NotionResponse | null | undefined,
): string {
  if (!response) return "";

  switch (response.object) {
    case "page":
      return renderPageResponse(response);
    case "database":
      return renderDatabaseLikeResponse(response);
    case "data_source":
      return renderDatabaseLikeResponse(response);
    case "block":
      return renderBlockToMarkdown(response, { includeBlockMetadata: true });
    case "list":
      return renderListResponse(response);
    case "user":
      return renderUserResponse(response);
    case "comment":
      return renderCommentResponse(response);
    default:
      return renderJsonFallback(response);
  }
}

export function renderBlockToMarkdown(
  block: BlockResponse,
  options: MarkdownRenderOptions = {},
): string {
  const body = renderBlockBody(block, options);
  if (!options.includeBlockMetadata) return body;

  const metadata = `<!-- notion:block id="${block.id}" type="${block.type}" -->`;
  return [metadata, body].filter(Boolean).join("\n");
}

export function renderMarkdownBlockTree(
  blocks: MarkdownBlockNode[],
  options: { includeBlockMetadata?: boolean } = {},
): string {
  return blocks
    .map((block) => renderMarkdownNode(block, 0, options))
    .filter(Boolean)
    .join("\n\n");
}

export function renderRichTextToMarkdown(
  richTextArray: RichTextItemResponse[] | undefined,
): string {
  if (!Array.isArray(richTextArray)) return "";
  return richTextArray.map(renderRichTextItemToMarkdown).join("");
}

export function renderRichTextToPlainText(
  richTextArray: RichTextItemResponse[] | undefined,
): string {
  if (!Array.isArray(richTextArray)) return "";
  return richTextArray
    .map(
      (item) =>
        item.plain_text ||
        item.text?.content ||
        item.equation?.expression ||
        "",
    )
    .join("");
}

function renderPageResponse(page: PageResponse): string {
  const title = extractPageTitle(page) || "Untitled page";
  const sections = [
    `# ${title}`,
    renderObjectMetadata({
      id: page.id,
      object: page.object,
      url: page.url,
      public_url: page.public_url,
      parent: renderParent(page.parent),
      in_trash: page.in_trash,
      last_edited_time: page.last_edited_time,
    }),
    renderPageProperties(page.properties),
    [
      "> Page content is not included in a page metadata response.",
      "> Use `notion_read_page` for AI-friendly Markdown with stable block IDs.",
      `> Block ID: \`${page.id}\``,
    ].join("\n"),
    page.url ? `[View in Notion](${page.url})` : "",
  ];

  return joinSections(sections);
}

function renderDatabaseLikeResponse(
  database: DatabaseResponse | DataSourceResponse,
): string {
  const title = renderRichTextToPlainText(database.title) || "Untitled";
  const label = database.object === "data_source" ? "Data Source" : "Database";
  const description = renderRichTextToMarkdown(database.description);
  const metadata: Record<string, unknown> = {
    id: database.id,
    object: database.object,
    url: database.url,
    parent:
      database.object === "data_source"
        ? renderParent(database.parent)
        : renderParent(database.parent),
    in_trash: database.in_trash,
  };

  if (database.object === "database" && database.data_sources?.length) {
    metadata.data_sources = database.data_sources
      .map((source) => `${source.name || "Untitled"} (${source.id})`)
      .join(", ");
  }

  return joinSections([
    `# ${title} (${label})`,
    renderObjectMetadata(metadata),
    description,
    renderPropertySchema(database.properties || {}),
    database.url ? `[View in Notion](${database.url})` : "",
  ]);
}

function renderListResponse(list: ListResponse): string {
  if (!Array.isArray(list.results) || list.results.length === 0) {
    return "# Results\n\nNo results.";
  }

  const resultType = list.results[0]?.object || "unknown";
  const titleByType: Record<string, string> = {
    page: "Search Results (Pages)",
    database: "Search Results (Databases)",
    data_source: "Search Results (Data Sources)",
    block: "Block Contents",
    user: "Users",
    comment: "Comments",
  };
  const rendered = list.results
    .map((item) => renderListItem(item))
    .join("\n\n---\n\n");
  const pagination = list.has_more
    ? [
        "> More results are available.",
        list.next_cursor ? `> Next cursor: \`${list.next_cursor}\`` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return joinSections([
    `# ${titleByType[resultType] || "Results List"}`,
    rendered,
    pagination,
  ]);
}

function renderListItem(item: ListResponse["results"][number]): string {
  switch (item.object) {
    case "page": {
      const title = extractPageTitle(item) || "Untitled page";
      const heading = item.url ? `## [${title}](${item.url})` : `## ${title}`;
      return joinSections([
        heading,
        renderObjectMetadata({
          id: item.id,
          object: item.object,
          parent: renderParent(item.parent),
          in_trash: item.in_trash,
          last_edited_time: item.last_edited_time,
        }),
      ]);
    }
    case "database":
    case "data_source": {
      const title = renderRichTextToPlainText(item.title) || "Untitled";
      const heading = item.url ? `## [${title}](${item.url})` : `## ${title}`;
      return joinSections([
        heading,
        renderObjectMetadata({
          id: item.id,
          object: item.object,
          parent: renderParent(item.parent),
          in_trash: item.in_trash,
        }),
      ]);
    }
    case "block":
      return renderBlockToMarkdown(item, { includeBlockMetadata: true });
    case "user":
      return renderUserResponse(item);
    case "comment":
      return renderCommentResponse(item);
    default:
      return renderJsonFallback(item);
  }
}

function renderUserResponse(user: UserResponse): string {
  return joinSections([
    `# ${user.name || "Notion User"}`,
    renderObjectMetadata({
      id: user.id,
      object: user.object,
      type: user.type,
      email: user.person?.email,
      avatar_url: user.avatar_url,
    }),
  ]);
}

function renderCommentResponse(comment: CommentResponse): string {
  return joinSections([
    `# Comment ${comment.id}`,
    renderObjectMetadata({
      id: comment.id,
      object: comment.object,
      discussion_id: comment.discussion_id,
      parent: renderParent(comment.parent),
      created_by: comment.created_by?.id,
      created_time: comment.created_time,
      last_edited_time: comment.last_edited_time,
    }),
    renderRichTextToMarkdown(comment.rich_text),
  ]);
}

function renderBlockBody(
  block: BlockResponse,
  options: MarkdownRenderOptions,
): string {
  const blockType = block.type;
  const content = toRecord(block[blockType]);
  const depth = options.depth || 0;
  const indent = "  ".repeat(depth);

  switch (blockType) {
    case "paragraph":
      return renderRichTextToMarkdown(readRichText(content.rich_text));
    case "heading_1":
      return `${content.is_toggleable ? "<details><summary>" : ""}# ${renderRichTextToMarkdown(readRichText(content.rich_text))}${content.is_toggleable ? "</summary>" : ""}`;
    case "heading_2":
      return `${content.is_toggleable ? "<details><summary>" : ""}## ${renderRichTextToMarkdown(readRichText(content.rich_text))}${content.is_toggleable ? "</summary>" : ""}`;
    case "heading_3":
      return `${content.is_toggleable ? "<details><summary>" : ""}### ${renderRichTextToMarkdown(readRichText(content.rich_text))}${content.is_toggleable ? "</summary>" : ""}`;
    case "bulleted_list_item":
      return `${indent}- ${renderRichTextToMarkdown(readRichText(content.rich_text))}`;
    case "numbered_list_item":
      return `${indent}1. ${renderRichTextToMarkdown(readRichText(content.rich_text))}`;
    case "to_do":
      return `${indent}- [${content.checked ? "x" : " "}] ${renderRichTextToMarkdown(readRichText(content.rich_text))}`;
    case "toggle":
      return `<details>\n<summary>${renderRichTextToMarkdown(readRichText(content.rich_text)) || "Toggle"}</summary>\n\n</details>`;
    case "quote":
      return prefixLines(
        renderRichTextToMarkdown(readRichText(content.rich_text)),
        "> ",
      );
    case "callout":
      return prefixLines(
        [
          renderIcon(content.icon),
          renderRichTextToMarkdown(readRichText(content.rich_text)),
        ]
          .filter(Boolean)
          .join(" "),
        "> ",
      );
    case "code":
      return renderCodeBlock(
        renderRichTextToPlainText(readRichText(content.rich_text)),
        readString(content.language) || undefined,
        readRichText(content.caption),
      );
    case "meeting_notes":
      return joinSections([
        "### Meeting Notes",
        renderRichTextToMarkdown(readRichText(content.rich_text)),
      ]);
    case "equation":
      return `$$\n${readString(content.expression)}\n$$`;
    case "divider":
      return "---";
    case "image":
      return renderMediaBlock("Image", content, true);
    case "video":
      return renderMediaBlock("Video", content);
    case "audio":
      return renderMediaBlock("Audio", content);
    case "file":
      return renderMediaBlock(readString(content.name) || "File", content);
    case "pdf":
      return renderMediaBlock("PDF", content);
    case "bookmark":
      return renderCaptionedLink(
        renderRichTextToPlainText(readRichText(content.caption)) ||
          readString(content.url) ||
          "Bookmark",
        readString(content.url) || undefined,
      );
    case "embed":
      return renderCaptionedLink(
        renderRichTextToPlainText(readRichText(content.caption)) ||
          readString(content.url) ||
          "Embed",
        readString(content.url) || undefined,
      );
    case "link_preview":
      return renderCaptionedLink(
        readString(content.url) || "Link preview",
        readString(content.url) || undefined,
      );
    case "child_page":
      return `Child page: **${readString(content.title) || "Untitled"}** (id: \`${block.id}\`)`;
    case "child_database":
      return `Child database: **${readString(content.title) || "Untitled"}** (id: \`${block.id}\`)`;
    case "link_to_page":
      return renderLinkToPage(content);
    case "table":
      return [
        `Table block: ${readNumber(content.table_width) || "unknown"} columns`,
        content.has_column_header ? "- Has column header" : "",
        content.has_row_header ? "- Has row header" : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "table_row":
      return renderTableRow(readRichTextRows(content.cells));
    case "table_of_contents":
      return "[Table of contents block]";
    case "breadcrumb":
      return "[Breadcrumb block]";
    case "column_list":
      return "[Column list block]";
    case "column":
      return "[Column block]";
    case "synced_block":
      return readString(toRecord(content.synced_from).block_id)
        ? `Synced block from \`${readString(toRecord(content.synced_from).block_id)}\``
        : "Original synced block";
    case "template":
      return `Template: ${renderRichTextToMarkdown(readRichText(content.rich_text))}`;
    case "unsupported":
      return `> Unsupported Notion block. Raw block ID: \`${block.id}\``;
    default:
      return renderFallbackBlock(block);
  }
}

function renderMarkdownNode(
  node: MarkdownBlockNode,
  depth: number,
  options: { includeBlockMetadata?: boolean },
): string {
  const metadata =
    options.includeBlockMetadata === false
      ? ""
      : `<!-- notion:block id="${node.id}" type="${node.type}" -->`;
  const body = indentNestedMarkdown(node.markdown || "", depth, node.type);
  const omitted = node.children_omitted
    ? `> Children omitted because ${node.children_omitted} was reached.`
    : "";
  const children = node.children?.length
    ? node.children
        .map((child) => renderMarkdownNode(child, depth + 1, options))
        .filter(Boolean)
        .join("\n\n")
    : "";

  return joinSections([metadata, body, omitted, children]);
}

function renderRichTextItemToMarkdown(item: RichTextItemResponse): string {
  const rawText =
    item.type === "equation"
      ? item.equation?.expression || item.plain_text || ""
      : item.plain_text || item.text?.content || "";
  let text = escapeMarkdownText(rawText);

  if (item.type === "equation") {
    text = `$${item.equation?.expression || rawText}$`;
  } else if (item.annotations?.code) {
    text = wrapInlineCode(rawText);
  } else {
    if (item.annotations?.bold) text = `**${text}**`;
    if (item.annotations?.italic) text = `*${text}*`;
    if (item.annotations?.strikethrough) text = `~~${text}~~`;
    if (item.annotations?.underline) text = `<u>${text}</u>`;
  }

  if (item.annotations?.color && item.annotations.color !== "default") {
    text = `<span data-notion-color="${escapeHtmlAttribute(item.annotations.color)}">${text}</span>`;
  }

  const href = item.href || item.text?.link?.url;
  if (href) {
    return `[${escapeLinkLabel(stripMarkdownWrapping(text))}](${href})`;
  }

  return text;
}

function renderPageProperties(
  properties: Record<string, PageProperty>,
): string {
  const rows = Object.entries(properties || {}).map(([name, property]) => [
    name,
    property.id,
    property.type,
    renderPagePropertyValue(property),
  ]);

  return renderTable(["Property", "ID", "Type", "Value"], rows);
}

function renderPropertySchema(
  properties: Record<string, DatabasePropertyConfig>,
): string {
  const rows = Object.entries(properties || {}).map(
    ([fallbackName, property]) => [
      property.name || fallbackName,
      property.id,
      property.type,
      renderPropertySchemaDetails(property),
    ],
  );

  return joinSections([
    "## Properties",
    renderTable(["Property Name", "ID", "Type", "Details"], rows, false),
  ]);
}

function renderPagePropertyValue(property: PageProperty): string {
  switch (property.type) {
    case "title":
      return renderRichTextToMarkdown(property.title);
    case "rich_text":
      return renderRichTextToMarkdown(property.rich_text);
    case "number":
      return valueToString(property.number);
    case "select":
      return property.select?.name || "";
    case "multi_select":
      return readNamedOptions(property.multi_select)
        .map((option) => option.name)
        .join(", ");
    case "status":
      return property.status?.name || "";
    case "date":
      return renderDate(property.date);
    case "people":
      return (property.people || []).map(renderUserName).join(", ");
    case "files":
      return (property.files || []).map(renderFileValue).join(", ");
    case "checkbox":
      return property.checkbox ? "true" : "false";
    case "url":
      return property.url || "";
    case "email":
      return property.email || "";
    case "phone_number":
      return property.phone_number || "";
    case "formula":
      return renderTypedValue(property.formula);
    case "relation":
      return readRelationReferences(property.relation)
        .map((relation) => `\`${relation.id}\``)
        .join(", ");
    case "rollup":
      return renderRollup(property.rollup);
    case "created_by":
      return renderUserName(property.created_by);
    case "created_time":
      return property.created_time || "";
    case "last_edited_by":
      return renderUserName(property.last_edited_by);
    case "last_edited_time":
      return property.last_edited_time || "";
    case "unique_id":
      return [property.unique_id?.prefix, property.unique_id?.number]
        .filter(Boolean)
        .join("-");
    case "verification":
      return property.verification?.state || "";
    default:
      return renderCompactJson(property[property.type]);
  }
}

function renderPropertySchemaDetails(property: DatabasePropertyConfig): string {
  const config = toRecord(property[property.type]);

  switch (property.type) {
    case "select":
    case "multi_select":
    case "status":
      return `Options: ${readNamedOptions(config.options)
        .map((option) => option.name)
        .join(", ")}`;
    case "number":
      return `Format: ${readString(config.format) || "number"}`;
    case "relation":
      return `Related data source: ${readString(config.data_source_id) || readString(config.database_id) || ""}`;
    case "formula":
      return `Formula: ${readString(config.expression)}`;
    case "rollup":
      return `Rollup: ${readString(config.function)}`;
    case "title":
      return "Title property";
    case "rich_text":
      return "Rich text";
    case "checkbox":
      return "Boolean";
    case "date":
      return "Date or date range";
    case "people":
      return "People";
    case "files":
      return "Files";
    case "url":
    case "email":
    case "phone_number":
    case "created_by":
    case "created_time":
    case "last_edited_by":
    case "last_edited_time":
    case "unique_id":
    case "verification":
      return property.type;
    default:
      return renderCompactJson(config);
  }
}

function renderObjectMetadata(metadata: Record<string, unknown>): string {
  const rows = Object.entries(metadata)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(([key, value]) => `- ${key}: ${formatMetadataValue(value)}`);

  return rows.length ? rows.join("\n") : "";
}

function renderFallbackBlock(block: BlockResponse): string {
  const content = toRecord(block[block.type]);
  const richText = renderRichTextToMarkdown(readRichText(content.rich_text));
  if (richText) return richText;

  return joinSections([
    `> Unsupported Notion block type: \`${block.type}\``,
    renderJsonFallback(block),
  ]);
}

function renderMediaBlock(
  label: string,
  content: unknown,
  asImage = false,
): string {
  const url = getFileUrl(content);
  const caption = renderRichTextToMarkdown(
    toRichTextArray(toRecord(content).caption),
  );
  const text = caption || label;

  if (asImage && url) {
    return `![${escapeLinkLabel(stripMarkdownWrapping(text))}](${url})`;
  }

  return renderCaptionedLink(text, url);
}

function renderCaptionedLink(label: string, url?: string): string {
  return url ? `[${escapeLinkLabel(label)}](${url})` : label;
}

function renderCodeBlock(
  code: string,
  language?: string,
  caption?: RichTextItemResponse[],
): string {
  const fence = code.includes("```") ? "````" : "```";
  const rendered = `${fence}${language || ""}\n${code}\n${fence}`;
  const renderedCaption = renderRichTextToMarkdown(caption);
  return renderedCaption
    ? `${rendered}\n\nCaption: ${renderedCaption}`
    : rendered;
}

function renderTableRow(cells: RichTextItemResponse[][] | undefined): string {
  if (!Array.isArray(cells)) return "| |";
  return `| ${cells.map((cell) => escapeTableCell(renderRichTextToMarkdown(cell))).join(" | ")} |`;
}

function renderLinkToPage(content: unknown): string {
  const link = toRecord(content);
  const pageId = readString(link.page_id);
  const dataSourceId = readString(link.data_source_id);
  const databaseId = readString(link.database_id);
  if (pageId) return `Link to page: \`${pageId}\``;
  if (dataSourceId) return `Link to data source: \`${dataSourceId}\``;
  if (databaseId) return `Link to database: \`${databaseId}\``;
  return "Link to page";
}

function renderIcon(icon: unknown): string {
  const value = toRecord(icon) as NotionIconValue;
  if (value.type === "emoji") return value.emoji || "";
  if (value.type === "external") return value.external?.url || "";
  if (value.type === "file") return value.file?.url || "";
  return "";
}

function renderDate(date: unknown): string {
  const value = toRecord(date) as NotionDateValue;
  return value.end ? `${value.start} to ${value.end}` : value.start || "";
}

function renderRollup(rollup: unknown): string {
  const value = toRecord(rollup);
  if (!value.type) return "";
  if (value.type === "array") {
    return readArray(value.array)
      .map((item) => renderTypedValue(item))
      .join(", ");
  }
  return renderTypedValue(value);
}

function renderTypedValue(value: unknown): string {
  const record = toRecord(value);
  if (!record.type) return valueToString(value);
  const type = readString(record.type);
  if (type && record[type] !== undefined) {
    return valueToString(record[type]);
  }
  return valueToString(value);
}

function renderFileValue(file: unknown): string {
  const value = toRecord(file) as NotionFileReference;
  const url = getFileUrl(file);
  const name = value.name || "Attachment";
  return url ? `[${escapeLinkLabel(name)}](${url})` : name;
}

function renderUserName(user: unknown): string {
  const value = toRecord(user) as NotionUserReference;
  return value.name || value.id || "";
}

function renderParent(parent: unknown): string {
  const value = toRecord(parent) as NotionParentValue;
  const id =
    value.page_id ||
    value.data_source_id ||
    value.database_id ||
    value.block_id ||
    "";
  return id ? `${value.type}:${id}` : value.type || "";
}

function renderTable(
  headers: string[],
  rows: Array<Array<unknown>>,
  includeHeading = true,
): string {
  const table = [
    `| ${headers.map(escapeTableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(
      (row) =>
        `| ${row.map((value) => escapeTableCell(valueToString(value))).join(" | ")} |`,
    ),
  ].join("\n");

  return includeHeading ? joinSections(["## Properties", table]) : table;
}

function renderJsonFallback(value: unknown): string {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function extractPageTitle(page: PageResponse): string {
  for (const property of Object.values(page.properties || {})) {
    if (property.type === "title" && Array.isArray(property.title)) {
      return renderRichTextToPlainText(property.title);
    }
  }
  return "";
}

function getFileUrl(content: unknown): string | undefined {
  const value = toRecord(content) as NotionFileReference;
  if (value.type === "external") return value.external?.url;
  if (value.type === "file") return value.file?.url;
  return value.external?.url || value.file?.url || value.url;
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.map(valueToString).join(", ");
  if (typeof value === "object" && value !== null)
    return renderCompactJson(value);
  return valueToString(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readRichText(value: unknown): RichTextItemResponse[] | undefined {
  return toRichTextArray(value);
}

function toRichTextArray(value: unknown): RichTextItemResponse[] | undefined {
  return Array.isArray(value) ? (value as RichTextItemResponse[]) : undefined;
}

function readRichTextRows(
  value: unknown,
): RichTextItemResponse[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(Array.isArray) as RichTextItemResponse[][];
}

function readNamedOptions(value: unknown): NamedOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (option): option is NamedOption =>
      !!option &&
      typeof option === "object" &&
      typeof (option as { name?: unknown }).name === "string",
  );
}

function readRelationReferences(value: unknown): RelationReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (relation): relation is RelationReference =>
      !!relation &&
      typeof relation === "object" &&
      typeof (relation as { id?: unknown }).id === "string",
  );
}

function valueToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return renderCompactJson(value);
}

function renderCompactJson(value: unknown): string {
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

function joinSections(parts: Array<string | undefined | null>): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");
}

function prefixLines(text: string, prefix: string): string {
  if (!text) return prefix.trimEnd();
  return text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function indentNestedMarkdown(
  text: string,
  depth: number,
  type: string,
): string {
  if (!text || depth === 0) return text;
  const shouldIndent = [
    "bulleted_list_item",
    "numbered_list_item",
    "to_do",
    "quote",
  ].includes(type);
  if (!shouldIndent) return text;
  const indent = "  ".repeat(depth);
  return text
    .split("\n")
    .map((line) => (line ? `${indent}${line}` : line))
    .join("\n");
}

function escapeMarkdownText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/([*_~[\]])/g, "\\$1");
}

function escapeLinkLabel(text: string): string {
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeTableCell(value: unknown): string {
  return valueToString(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeHtmlAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function wrapInlineCode(text: string): string {
  if (!text.includes("`")) return `\`${text}\``;
  return `\`\` ${text} \`\``;
}

function stripMarkdownWrapping(text: string): string {
  return text.replace(/<[^>]+>/g, "");
}
