import type { NotionClientWrapper } from "../notion/client.js";

export type ToolHandlerContext = {
  notionClient: NotionClientWrapper;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolHandlerContext,
) => Promise<unknown>;
export type ToolHandlerMap = Record<string, ToolHandler>;
