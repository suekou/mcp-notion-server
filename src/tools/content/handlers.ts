import type { ToolHandlerMap } from "../types.js";
import { parseMarkdownToSimpleContent } from "./markdown-input.js";
import {
  buildBlocksFromSimpleContent,
  buildBlockUpdateFromSimpleContent,
  validateAppendPosition,
  validateSimpleContentItems,
  validateSimpleContentUpdates,
  validateSimpleContentUpdatesAgainstBlocks,
  validateSimpleEditableContentItem,
} from "./simple-content.js";
import type {
  AppendContentArgs,
  AppendMarkdownArgs,
  UpdateContentArgs,
  UpdateContentBatchArgs,
} from "./types.js";

export const contentToolHandlers: ToolHandlerMap = {
  async notion_append_content(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as AppendContentArgs;
    if (!args.block_id || !args.items) {
      throw new Error("Missing required arguments: block_id and items");
    }
    validateAppendPosition(args.position);
    validateSimpleContentItems(args.items);
    return notionClient.appendBlockChildren(
      args.block_id,
      buildBlocksFromSimpleContent(args.items),
      args.position,
    );
  },

  async notion_append_markdown(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as AppendMarkdownArgs;
    if (!args.block_id || !args.markdown) {
      throw new Error("Missing required arguments: block_id and markdown");
    }
    validateAppendPosition(args.position);
    const items = parseMarkdownToSimpleContent(args.markdown);
    if (items.length === 0) {
      throw new Error("Markdown did not contain appendable content");
    }
    return notionClient.appendBlockChildren(
      args.block_id,
      buildBlocksFromSimpleContent(items),
      args.position,
    );
  },

  async notion_update_content(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as UpdateContentArgs;
    if (!args.block_id || !args.item) {
      throw new Error("Missing required arguments: block_id and item");
    }
    validateSimpleEditableContentItem(args.item);
    const existingBlock = await notionClient.retrieveBlock(args.block_id);
    if (existingBlock.type !== args.item.type) {
      throw new Error(
        `Block type mismatch: block ${args.block_id} is ${existingBlock.type}, but item.type was ${args.item.type}`,
      );
    }
    return notionClient.updateBlock(
      args.block_id,
      buildBlockUpdateFromSimpleContent(args.item),
    );
  },

  async notion_update_content_batch(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as UpdateContentBatchArgs;
    if (!args.updates || args.updates.length === 0) {
      throw new Error("Missing required argument: updates");
    }
    validateSimpleContentUpdates(args.updates);

    const existingBlocks = await Promise.all(
      args.updates.map((update) => notionClient.retrieveBlock(update.block_id)),
    );
    validateSimpleContentUpdatesAgainstBlocks(args.updates, existingBlocks);

    const results = [];
    for (const update of args.updates) {
      results.push(
        await notionClient.updateBlock(
          update.block_id,
          buildBlockUpdateFromSimpleContent(update.item),
        ),
      );
    }

    return {
      object: "notion_content_batch_update",
      updated_count: results.length,
      results,
    };
  },
};
