import type { BlockResponse } from "../../notion/types.js";

export type NotionJsonObject = Record<string, unknown>;
export type ResponseMode = "auto" | "compact" | "full";

export type AppendBlockChildrenPosition =
  | {
      type: "after_block";
      after_block: {
        id: string;
      };
    }
  | {
      type: "start";
    }
  | {
      type: "end";
    };
export interface AppendBlockChildrenArgs {
  block_id: string;
  children: Partial<BlockResponse>[];
  position?: AppendBlockChildrenPosition;
  format?: "json" | "markdown";
}
export interface RetrieveBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface RetrieveBlockChildrenArgs {
  block_id: string;
  start_cursor?: string;
  page_size?: number;
  response_mode?: ResponseMode;
  format?: "json" | "markdown";
}

export interface DeleteBlockArgs {
  block_id: string;
  format?: "json" | "markdown";
}

export interface UpdateBlockArgs {
  block_id: string;
  block: Partial<BlockResponse>;
  format?: "json" | "markdown";
}
