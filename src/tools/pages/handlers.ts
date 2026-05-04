import type { ToolHandlerMap } from "../types.js";
import { buildPageReadSummary, readPageBlockTree } from "./reader.js";
import type {
  ReadPageArgs,
  RetrievePageArgs,
  UpdatePagePropertiesArgs,
} from "./types.js";

export const pageToolHandlers: ToolHandlerMap = {
  async notion_retrieve_page(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrievePageArgs;
    if (!args.page_id) {
      throw new Error("Missing required argument: page_id");
    }
    return notionClient.retrievePage(args.page_id);
  },

  async notion_read_page(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as ReadPageArgs;
    if (!args.page_id) {
      throw new Error("Missing required argument: page_id");
    }
    const page = await notionClient.retrievePage(args.page_id);
    const tree = await readPageBlockTree(
      notionClient.retrieveBlockChildren.bind(notionClient),
      args.page_id,
      args,
    );
    return buildPageReadSummary(page, tree, args);
  },

  async notion_update_page_properties(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as UpdatePagePropertiesArgs;
    if (!args.page_id || !args.properties) {
      throw new Error("Missing required arguments: page_id and properties");
    }
    return notionClient.updatePageProperties(args.page_id, args.properties);
  },
};
