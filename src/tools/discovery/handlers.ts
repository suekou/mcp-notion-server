import type { ToolHandlerMap } from "../types.js";
import { summarizeDataSourceSchema, summarizeFindResults } from "./summary.js";
import type {
  CreateCommentArgs,
  FindArgs,
  InspectDataSourceArgs,
  ListAllUsersArgs,
  RetrieveCommentsArgs,
  RetrieveUserArgs,
  SearchArgs,
} from "./types.js";

export const discoveryToolHandlers: ToolHandlerMap = {
  async notion_list_all_users(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as ListAllUsersArgs;
    return notionClient.listAllUsers(args.start_cursor, args.page_size);
  },

  async notion_retrieve_user(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveUserArgs;
    if (!args.user_id) {
      throw new Error("Missing required argument: user_id");
    }
    return notionClient.retrieveUser(args.user_id);
  },

  async notion_retrieve_bot_user(_toolArguments, { notionClient }) {
    return notionClient.retrieveBotUser();
  },

  async notion_create_comment(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as CreateCommentArgs;
    if (!args.parent && !args.discussion_id) {
      throw new Error(
        "Either parent.page_id or discussion_id must be provided",
      );
    }
    return notionClient.createComment(
      args.parent,
      args.discussion_id,
      args.rich_text,
    );
  },

  async notion_retrieve_comments(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveCommentsArgs;
    if (!args.block_id) {
      throw new Error("Missing required argument: block_id");
    }
    return notionClient.retrieveComments(
      args.block_id,
      args.start_cursor,
      args.page_size,
    );
  },

  async notion_search(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as SearchArgs;
    return notionClient.search(
      args.query,
      args.filter,
      args.sort,
      args.start_cursor,
      args.page_size,
    );
  },

  async notion_find(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as FindArgs;
    const filter = args.object_type
      ? { property: "object", value: args.object_type }
      : undefined;
    const searchResponse = await notionClient.search(
      args.query,
      filter,
      undefined,
      args.start_cursor,
      args.page_size,
    );
    return summarizeFindResults(searchResponse, args.query);
  },

  async notion_inspect_data_source(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as InspectDataSourceArgs;
    if (!args.data_source_id) {
      throw new Error("Missing required argument: data_source_id");
    }
    const dataSource = await notionClient.retrieveDataSource(
      args.data_source_id,
    );
    return summarizeDataSourceSchema(dataSource);
  },
};
