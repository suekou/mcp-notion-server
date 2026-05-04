import { validateAppendPosition } from "../content/simple-content.js";
import type { ToolHandlerMap } from "../types.js";
import type {
  AppendBlockChildrenArgs,
  DeleteBlockArgs,
  RetrieveBlockArgs,
  RetrieveBlockChildrenArgs,
  UpdateBlockArgs,
} from "./types.js";

export const blockToolHandlers: ToolHandlerMap = {
  async notion_append_block_children(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as AppendBlockChildrenArgs;
    if (!args.block_id || !args.children) {
      throw new Error("Missing required arguments: block_id and children");
    }
    validateAppendPosition(args.position);
    return notionClient.appendBlockChildren(
      args.block_id,
      args.children,
      args.position,
    );
  },

  async notion_retrieve_block(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveBlockArgs;
    if (!args.block_id) {
      throw new Error("Missing required argument: block_id");
    }
    return notionClient.retrieveBlock(args.block_id);
  },

  async notion_retrieve_block_children(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveBlockChildrenArgs;
    if (!args.block_id) {
      throw new Error("Missing required argument: block_id");
    }
    return notionClient.retrieveBlockChildren(
      args.block_id,
      args.start_cursor,
      args.page_size,
    );
  },

  async notion_delete_block(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as DeleteBlockArgs;
    if (!args.block_id) {
      throw new Error("Missing required argument: block_id");
    }
    return notionClient.deleteBlock(args.block_id);
  },

  async notion_update_block(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as UpdateBlockArgs;
    if (!args.block_id || !args.block) {
      throw new Error("Missing required arguments: block_id and block");
    }
    return notionClient.updateBlock(args.block_id, args.block);
  },
};
