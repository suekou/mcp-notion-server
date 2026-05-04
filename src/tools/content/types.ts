import type { AppendBlockChildrenPosition } from "../blocks/types.js";
import type {
  SimpleContentItem,
  SimpleContentUpdate,
  SimpleEditableContentItem,
} from "./simple-content.js";

export interface AppendContentArgs {
  block_id: string;
  items: SimpleContentItem[];
  position?: AppendBlockChildrenPosition;
  format?: "json" | "markdown";
}

export interface AppendMarkdownArgs {
  block_id: string;
  markdown: string;
  position?: AppendBlockChildrenPosition;
  format?: "json" | "markdown";
}

export interface UpdateContentArgs {
  block_id: string;
  item: SimpleEditableContentItem;
  format?: "json" | "markdown";
}

export interface UpdateContentBatchArgs {
  updates: SimpleContentUpdate[];
  format?: "json" | "markdown";
}
