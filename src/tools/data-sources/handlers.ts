import type { ToolHandlerMap } from "../types.js";
import {
  buildPagePropertiesFromSimpleValues,
  validateSimplePropertyValues,
} from "./properties.js";
import {
  buildDataSourceQueryFromSimpleFilters,
  validateSimpleDataSourceQueryInput,
} from "./query.js";
import type {
  CreateDatabaseArgs,
  CreateDataSourceArgs,
  CreateDataSourceItemArgs,
  CreateDataSourceItemFromValuesArgs,
  QueryDataSourceArgs,
  QueryDataSourceByValuesArgs,
  RetrieveDatabaseArgs,
  RetrieveDataSourceArgs,
  UpdateDataSourceArgs,
} from "./types.js";

export const dataSourceToolHandlers: ToolHandlerMap = {
  async notion_query_data_source(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as QueryDataSourceArgs;
    if (!args.data_source_id) {
      throw new Error("Missing required argument: data_source_id");
    }
    return notionClient.queryDataSource(
      args.data_source_id,
      args.filter,
      args.sorts,
      args.start_cursor,
      args.page_size,
    );
  },

  async notion_query_data_source_by_values(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as QueryDataSourceByValuesArgs;
    if (!args.data_source_id) {
      throw new Error("Missing required argument: data_source_id");
    }
    validateSimpleDataSourceQueryInput({
      filters: args.filters,
      match: args.match,
      sorts: args.sorts,
    });
    const dataSource = await notionClient.retrieveDataSource(
      args.data_source_id,
    );
    const query = buildDataSourceQueryFromSimpleFilters(dataSource, {
      filters: args.filters,
      match: args.match,
      sorts: args.sorts,
    });
    return notionClient.queryDataSource(
      args.data_source_id,
      query.filter,
      query.sorts,
      args.start_cursor,
      args.page_size,
    );
  },

  async notion_create_database(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as CreateDatabaseArgs;
    if (!args.parent || !args.initial_data_source?.properties) {
      throw new Error(
        "Missing required arguments: parent and initial_data_source.properties",
      );
    }
    return notionClient.createDatabase(args);
  },

  async notion_create_data_source(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as CreateDataSourceArgs;
    return notionClient.createDataSource(
      args.parent,
      args.properties,
      args.title,
    );
  },

  async notion_retrieve_database(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveDatabaseArgs;
    return notionClient.retrieveDatabase(args.database_id);
  },

  async notion_retrieve_data_source(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as RetrieveDataSourceArgs;
    return notionClient.retrieveDataSource(args.data_source_id);
  },

  async notion_update_data_source(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as UpdateDataSourceArgs;
    return notionClient.updateDataSource(
      args.data_source_id,
      args.title,
      args.description,
      args.properties,
    );
  },

  async notion_create_data_source_item(toolArguments, { notionClient }) {
    const args = toolArguments as unknown as CreateDataSourceItemArgs;
    return notionClient.createDataSourceItem(
      args.data_source_id,
      args.properties,
    );
  },

  async notion_create_data_source_item_from_values(
    toolArguments,
    { notionClient },
  ) {
    const args = toolArguments as unknown as CreateDataSourceItemFromValuesArgs;
    if (!args.data_source_id || !args.values) {
      throw new Error("Missing required arguments: data_source_id and values");
    }
    validateSimplePropertyValues(args.values);
    const dataSource = await notionClient.retrieveDataSource(
      args.data_source_id,
    );
    const properties = buildPagePropertiesFromSimpleValues(
      dataSource,
      args.values,
    );
    return notionClient.createDataSourceItem(args.data_source_id, properties);
  },
};
