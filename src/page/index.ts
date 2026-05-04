import type {
  SimpleContentItem,
  SimpleContentUpdate,
} from "../content/index.js";
import type {
  BlockResponse,
  ListResponse,
  PageProperty,
  PageResponse,
  RichTextItemResponse,
} from "../types/index.js";

export type PageContentFormat = "outline" | "markdown" | "json";

export type ReadPageOptions = {
  content_format?: PageContentFormat;
  max_depth?: number;
  max_blocks?: number;
  page_size?: number;
  include_properties?: boolean;
};

export type PageEditAppend = {
  block_id?: string;
  after_block_id?: string;
  items: SimpleContentItem[];
};

export type PageEditPlanOptions = ReadPageOptions & {
  updates?: SimpleContentUpdate[];
  appends?: PageEditAppend[];
  include_outline?: boolean;
};

export type PageBlockNode = {
  id: string;
  type: string;
  text: string;
  has_children: boolean;
  in_trash?: boolean;
  children?: PageBlockNode[];
  children_omitted?: "max_depth" | "max_blocks";
};

export type PageBlockTreeResult = {
  blocks: PageBlockNode[];
  block_count: number;
  truncated: boolean;
};

export type PageReadSummary = {
  object: "notion_page_read";
  page: {
    id: string;
    title: string;
    url?: string;
    parent: PageResponse["parent"];
    last_edited_time: string;
    in_trash?: boolean;
    properties?: PagePropertySummary[];
  };
  content: {
    format: PageContentFormat;
    max_depth: number;
    block_count: number;
    truncated: boolean;
    outline: PageBlockNode[];
    markdown?: string;
  };
  editing_hint: {
    append_tool: "notion_append_content";
    parent_block_id: string;
    note: string;
  };
};

export type PageEditPlan = {
  object: "notion_page_edit_plan";
  page: {
    id: string;
    title: string;
    last_edited_time: string;
  };
  valid: true;
  operation_count: number;
  operations: PageEditPlanOperation[];
  warnings: string[];
  outline?: PageBlockNode[];
};

export type PageEditPlanOperation =
  | {
      type: "update_content_batch";
      tool: "notion_update_content_batch";
      arguments: {
        updates: SimpleContentUpdate[];
      };
    }
  | {
      type: "append_content";
      tool: "notion_append_content";
      arguments: {
        block_id: string;
        items: SimpleContentItem[];
        position?: {
          type: "after_block";
          after_block: {
            id: string;
          };
        };
      };
    };

type PagePropertySummary = {
  name: string;
  id: string;
  type: string;
  value?: string | number | boolean | string[] | null;
};

type FetchBlockChildren = (
  blockId: string,
  startCursor?: string,
  pageSize?: number
) => Promise<ListResponse>;

type ReadState = {
  blockCount: number;
  truncated: boolean;
};

const DEFAULT_MAX_DEPTH = 2;
const DEFAULT_MAX_BLOCKS = 100;
const DEFAULT_PAGE_SIZE = 100;

export async function readPageBlockTree(
  fetchBlockChildren: FetchBlockChildren,
  pageId: string,
  options: ReadPageOptions = {}
): Promise<PageBlockTreeResult> {
  const maxDepth = normalizePositiveInteger(
    options.max_depth,
    DEFAULT_MAX_DEPTH
  );
  const maxBlocks = normalizePositiveInteger(
    options.max_blocks,
    DEFAULT_MAX_BLOCKS
  );
  const pageSize = Math.min(
    normalizePositiveInteger(options.page_size, DEFAULT_PAGE_SIZE),
    100
  );
  const state: ReadState = { blockCount: 0, truncated: false };
  const blocks = await readChildren(
    fetchBlockChildren,
    pageId,
    1,
    { maxDepth, maxBlocks, pageSize },
    state
  );

  return {
    blocks,
    block_count: state.blockCount,
    truncated: state.truncated,
  };
}

export function buildPageReadSummary(
  page: PageResponse,
  tree: PageBlockTreeResult,
  options: ReadPageOptions = {}
): PageReadSummary {
  const contentFormat = options.content_format || "outline";
  const maxDepth = normalizePositiveInteger(
    options.max_depth,
    DEFAULT_MAX_DEPTH
  );
  const summary: PageReadSummary = {
    object: "notion_page_read",
    page: {
      id: page.id,
      title: extractPageTitle(page) || "Untitled page",
      url: page.url,
      parent: page.parent,
      last_edited_time: page.last_edited_time,
      in_trash: page.in_trash,
    },
    content: {
      format: contentFormat,
      max_depth: maxDepth,
      block_count: tree.block_count,
      truncated: tree.truncated,
      outline: tree.blocks,
    },
    editing_hint: {
      append_tool: "notion_append_content",
      parent_block_id: page.id,
      note:
        "Use block IDs from content.outline when inserting after a specific block.",
    },
  };

  if (options.include_properties) {
    summary.page.properties = summarizePageProperties(page.properties);
  }

  if (contentFormat === "markdown") {
    summary.content.markdown = renderBlocksAsMarkdown(tree.blocks);
  }

  return summary;
}

export function buildPageEditPlan(
  page: PageResponse,
  tree: PageBlockTreeResult,
  options: PageEditPlanOptions = {}
): PageEditPlan {
  const blockById = indexBlocksById(tree.blocks);
  const updates = options.updates || [];
  const appends = options.appends || [];
  const operations: PageEditPlanOperation[] = [];
  const warnings: string[] = [];

  if (tree.truncated) {
    warnings.push(
      "Page outline was truncated; increase max_depth or max_blocks before planning edits to omitted blocks."
    );
  }

  if (updates.length > 0) {
    validatePlannedUpdates(updates, blockById);
    operations.push({
      type: "update_content_batch",
      tool: "notion_update_content_batch",
      arguments: {
        updates,
      },
    });
  }

  for (const append of appends) {
    const blockId = append.block_id || page.id;
    if (blockId !== page.id && !blockById.has(blockId)) {
      throw new Error(
        `Cannot append to unknown block '${blockId}'. Use notion_read_page with enough depth to include it.`
      );
    }

    const operation: PageEditPlanOperation = {
      type: "append_content",
      tool: "notion_append_content",
      arguments: {
        block_id: blockId,
        items: append.items,
      },
    };

    if (append.after_block_id) {
      if (!blockById.has(append.after_block_id)) {
        throw new Error(
          `Cannot insert after unknown block '${append.after_block_id}'. Use notion_read_page with enough depth to include it.`
        );
      }
      operation.arguments.position = {
        type: "after_block",
        after_block: {
          id: append.after_block_id,
        },
      };
    }

    operations.push(operation);
  }

  const plan: PageEditPlan = {
    object: "notion_page_edit_plan",
    page: {
      id: page.id,
      title: extractPageTitle(page) || "Untitled page",
      last_edited_time: page.last_edited_time,
    },
    valid: true,
    operation_count: operations.length,
    operations,
    warnings,
  };

  if (options.include_outline) {
    plan.outline = tree.blocks;
  }

  return plan;
}

async function readChildren(
  fetchBlockChildren: FetchBlockChildren,
  blockId: string,
  depth: number,
  limits: { maxDepth: number; maxBlocks: number; pageSize: number },
  state: ReadState
): Promise<PageBlockNode[]> {
  if (depth > limits.maxDepth || state.blockCount >= limits.maxBlocks) {
    state.truncated = true;
    return [];
  }

  const nodes: PageBlockNode[] = [];
  let cursor: string | undefined;

  do {
    const response = await fetchBlockChildren(blockId, cursor, limits.pageSize);
    const blocks = response.results.filter(isBlockResponse);

    for (const block of blocks) {
      if (state.blockCount >= limits.maxBlocks) {
        state.truncated = true;
        return nodes;
      }

      const node = summarizeBlock(block);
      state.blockCount += 1;

      if (block.has_children) {
        if (depth < limits.maxDepth && state.blockCount < limits.maxBlocks) {
          node.children = await readChildren(
            fetchBlockChildren,
            block.id,
            depth + 1,
            limits,
            state
          );
        } else {
          node.children_omitted =
            depth >= limits.maxDepth ? "max_depth" : "max_blocks";
          state.truncated = true;
        }
      }

      nodes.push(node);
    }

    cursor = response.next_cursor || undefined;
    if (response.has_more && state.blockCount >= limits.maxBlocks) {
      state.truncated = true;
      return nodes;
    }
  } while (cursor);

  return nodes;
}

function summarizeBlock(block: BlockResponse): PageBlockNode {
  return {
    id: block.id,
    type: block.type,
    text: extractBlockText(block),
    has_children: !!block.has_children,
    in_trash: block.in_trash,
  };
}

function validatePlannedUpdates(
  updates: SimpleContentUpdate[],
  blockById: Map<string, PageBlockNode>
): void {
  for (const update of updates) {
    const block = blockById.get(update.block_id);
    if (!block) {
      throw new Error(
        `Cannot update unknown block '${update.block_id}'. Use notion_read_page with enough depth to include it.`
      );
    }

    if (block.type !== update.item.type) {
      throw new Error(
        `Block type mismatch: block ${update.block_id} is ${block.type}, but item.type was ${update.item.type}`
      );
    }
  }
}

function indexBlocksById(blocks: PageBlockNode[]): Map<string, PageBlockNode> {
  const index = new Map<string, PageBlockNode>();
  for (const block of blocks) {
    index.set(block.id, block);
    if (block.children) {
      for (const [id, child] of indexBlocksById(block.children)) {
        index.set(id, child);
      }
    }
  }
  return index;
}

function renderBlocksAsMarkdown(blocks: PageBlockNode[], depth = 0): string {
  return blocks
    .map((block) => {
      const rendered = renderBlockAsMarkdown(block, depth);
      const children = block.children?.length
        ? renderBlocksAsMarkdown(block.children, depth + 1)
        : "";
      return [rendered, children].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function renderBlockAsMarkdown(block: PageBlockNode, depth: number): string {
  const indent = "  ".repeat(depth);

  switch (block.type) {
    case "heading_1":
      return `# ${block.text}`;
    case "heading_2":
      return `## ${block.text}`;
    case "heading_3":
      return `### ${block.text}`;
    case "bulleted_list_item":
      return `${indent}- ${block.text}`;
    case "numbered_list_item":
      return `${indent}1. ${block.text}`;
    case "to_do":
      return `${indent}- [ ] ${block.text}`;
    case "quote":
      return `${indent}> ${block.text}`;
    case "code":
      return `\`\`\`\n${block.text}\n\`\`\``;
    case "divider":
      return "---";
    default:
      return block.text;
  }
}

function extractBlockText(block: BlockResponse): string {
  const content = block[block.type] || {};

  switch (block.type) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "bulleted_list_item":
    case "numbered_list_item":
    case "to_do":
    case "toggle":
    case "quote":
    case "callout":
    case "code":
    case "meeting_notes":
      return extractRichText(content.rich_text || []);
    case "child_page":
    case "child_database":
      return content.title || "";
    case "bookmark":
    case "embed":
    case "link_preview":
      return content.url || "";
    case "divider":
      return "";
    case "image":
    case "file":
    case "pdf":
    case "video":
      return extractRichText(content.caption || []) || content.name || "";
    default:
      return extractRichText(content.rich_text || []);
  }
}

function summarizePageProperties(
  properties: Record<string, PageProperty>
): PagePropertySummary[] {
  return Object.entries(properties || {}).map(([name, property]) => ({
    name,
    id: property.id,
    type: property.type,
    value: summarizePagePropertyValue(property),
  }));
}

function summarizePagePropertyValue(
  property: PageProperty
): string | number | boolean | string[] | null {
  switch (property.type) {
    case "title":
      return extractRichText(property.title || []);
    case "rich_text":
      return extractRichText(property.rich_text || []);
    case "number":
      return property.number ?? null;
    case "checkbox":
      return property.checkbox ?? null;
    case "select":
      return property.select?.name || null;
    case "status":
      return property.status?.name || null;
    case "multi_select":
      return (property.multi_select || []).map((option: any) => option.name);
    case "date":
      return property.date?.end
        ? `${property.date.start}..${property.date.end}`
        : property.date?.start || null;
    case "url":
      return property.url || null;
    case "email":
      return property.email || null;
    case "phone_number":
      return property.phone_number || null;
    default:
      return null;
  }
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
  return (richTextArray || [])
    .map((item) => item.plain_text || item.text?.content || "")
    .join("");
}

function isBlockResponse(item: unknown): item is BlockResponse {
  return (
    !!item &&
    typeof item === "object" &&
    (item as { object?: string }).object === "block"
  );
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}
