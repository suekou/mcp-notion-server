import type {
  DatabasePropertyConfig,
  DataSourceResponse,
} from "../../notion/types.js";

export type SimpleFilterOperator =
  | "equals"
  | "does_not_equal"
  | "contains"
  | "does_not_contain"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal_to"
  | "less_than_or_equal_to"
  | "before"
  | "after"
  | "on_or_before"
  | "on_or_after"
  | "is_empty"
  | "is_not_empty";

export type SimpleDataSourceFilter = {
  property: string;
  operator?: SimpleFilterOperator;
  value?: unknown;
};

export type SimpleDataSourceSort = {
  property: string;
  direction?: "ascending" | "descending";
};

export type SimpleDataSourceQuery = {
  filters?: SimpleDataSourceFilter[];
  match?: "all" | "any";
  sorts?: SimpleDataSourceSort[];
};

export type BuiltDataSourceQuery = {
  filter?: Record<string, unknown>;
  sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
};

export function buildDataSourceQueryFromSimpleFilters(
  dataSource: DataSourceResponse,
  query: SimpleDataSourceQuery,
): BuiltDataSourceQuery {
  validateSimpleDataSourceQueryInput(query);
  const filters = query.filters || [];
  const sorts = query.sorts || [];
  const output: BuiltDataSourceQuery = {};

  if (filters.length === 1) {
    output.filter = buildFilter(dataSource, filters[0]);
  } else if (filters.length > 1) {
    output.filter = {
      [query.match === "any" ? "or" : "and"]: filters.map((filter) =>
        buildFilter(dataSource, filter),
      ),
    };
  }

  if (sorts.length > 0) {
    output.sorts = sorts.map((sort) => {
      requirePropertySchema(dataSource, sort.property);
      return {
        property: sort.property,
        direction: sort.direction || "ascending",
      };
    });
  }

  return output;
}

export function validateSimpleDataSourceQueryInput(
  query: SimpleDataSourceQuery,
): void {
  const filters = query.filters || [];
  const sorts = query.sorts || [];

  if (
    query.match !== undefined &&
    query.match !== "all" &&
    query.match !== "any"
  ) {
    throw new Error("match must be either 'all' or 'any' when provided.");
  }

  if (!Array.isArray(filters)) {
    throw new Error("filters must be an array when provided.");
  }
  filters.forEach((filter, index) => {
    const path = `filters[${index}]`;
    if (!isRecord(filter)) {
      throw new Error(`${path} must be an object with a property field.`);
    }
    if (typeof filter.property !== "string" || filter.property.length === 0) {
      throw new Error(
        `${path}.property must be a non-empty property name string.`,
      );
    }
    if (
      filter.operator !== undefined &&
      !SIMPLE_FILTER_OPERATORS.includes(filter.operator)
    ) {
      throw new Error(
        `${path}.operator must be one of: ${SIMPLE_FILTER_OPERATORS.join(", ")}.`,
      );
    }
  });

  if (!Array.isArray(sorts)) {
    throw new Error("sorts must be an array when provided.");
  }
  sorts.forEach((sort, index) => {
    const path = `sorts[${index}]`;
    if (!isRecord(sort)) {
      throw new Error(`${path} must be an object with a property field.`);
    }
    if (typeof sort.property !== "string" || sort.property.length === 0) {
      throw new Error(
        `${path}.property must be a non-empty property name string.`,
      );
    }
    if (
      sort.direction !== undefined &&
      sort.direction !== "ascending" &&
      sort.direction !== "descending"
    ) {
      throw new Error(
        `${path}.direction must be either 'ascending' or 'descending'.`,
      );
    }
  });
}

function buildFilter(
  dataSource: DataSourceResponse,
  filter: SimpleDataSourceFilter,
): Record<string, unknown> {
  const schema = requirePropertySchema(dataSource, filter.property);
  const operator = filter.operator || defaultOperatorForType(schema.type);

  return {
    property: filter.property,
    [schema.type]: buildTypedCondition(
      filter.property,
      schema,
      operator,
      filter.value,
    ),
  };
}

function buildTypedCondition(
  propertyName: string,
  schema: DatabasePropertyConfig,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  switch (schema.type) {
    case "title":
    case "rich_text":
      return textCondition(propertyName, operator, value);
    case "number":
      return numberCondition(propertyName, operator, value);
    case "checkbox":
      return equalsCondition(operator, expectBoolean(propertyName, value));
    case "select":
    case "status":
      return optionCondition(propertyName, schema, operator, value);
    case "multi_select":
      return optionCondition(propertyName, schema, operator, value);
    case "date":
      return dateCondition(propertyName, operator, value);
    case "relation":
    case "people":
      return containsCondition(propertyName, operator, value);
    default:
      throw new Error(
        `Property '${propertyName}' has unsupported type '${schema.type}' for simple querying. Use notion_query_data_source with raw Notion filter JSON.`,
      );
  }
}

function textCondition(
  propertyName: string,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  if (isEmptyOperator(operator)) return { [operator]: true };
  if (
    !["equals", "does_not_equal", "contains", "does_not_contain"].includes(
      operator,
    )
  ) {
    throwUnsupportedOperator(propertyName, operator, [
      "equals",
      "does_not_equal",
      "contains",
      "does_not_contain",
      "is_empty",
      "is_not_empty",
    ]);
  }
  return { [operator]: expectString(propertyName, value) };
}

function numberCondition(
  propertyName: string,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  if (isEmptyOperator(operator)) return { [operator]: true };
  if (
    ![
      "equals",
      "does_not_equal",
      "greater_than",
      "less_than",
      "greater_than_or_equal_to",
      "less_than_or_equal_to",
    ].includes(operator)
  ) {
    throwUnsupportedOperator(propertyName, operator, [
      "equals",
      "does_not_equal",
      "greater_than",
      "less_than",
      "greater_than_or_equal_to",
      "less_than_or_equal_to",
      "is_empty",
      "is_not_empty",
    ]);
  }
  return { [operator]: expectNumber(propertyName, value) };
}

function equalsCondition(
  operator: SimpleFilterOperator,
  value: boolean,
): Record<string, unknown> {
  if (!["equals", "does_not_equal"].includes(operator)) {
    throw new Error(
      `Checkbox filters only support equals or does_not_equal, got '${operator}'.`,
    );
  }
  return { [operator]: value };
}

function optionCondition(
  propertyName: string,
  schema: DatabasePropertyConfig,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  if (isEmptyOperator(operator)) return { [operator]: true };

  const allowed =
    schema.type === "multi_select"
      ? ["contains", "does_not_contain"]
      : ["equals", "does_not_equal"];
  if (!allowed.includes(operator)) {
    throwUnsupportedOperator(propertyName, operator, [
      ...allowed,
      "is_empty",
      "is_not_empty",
    ]);
  }

  return {
    [operator]: expectKnownOption(
      propertyName,
      schema,
      expectString(propertyName, value),
    ),
  };
}

function dateCondition(
  propertyName: string,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  if (isEmptyOperator(operator)) return { [operator]: true };
  if (
    !["equals", "before", "after", "on_or_before", "on_or_after"].includes(
      operator,
    )
  ) {
    throwUnsupportedOperator(propertyName, operator, [
      "equals",
      "before",
      "after",
      "on_or_before",
      "on_or_after",
      "is_empty",
      "is_not_empty",
    ]);
  }
  return { [operator]: expectString(propertyName, value) };
}

function containsCondition(
  propertyName: string,
  operator: SimpleFilterOperator,
  value: unknown,
): Record<string, unknown> {
  if (isEmptyOperator(operator)) return { [operator]: true };
  if (!["contains", "does_not_contain"].includes(operator)) {
    throw new Error(
      `Relation and people filters only support contains or does_not_contain, got '${operator}'.`,
    );
  }
  return { [operator]: expectString(propertyName, value) };
}

function requirePropertySchema(
  dataSource: DataSourceResponse,
  propertyName: string,
): DatabasePropertyConfig {
  const schema = dataSource.properties[propertyName];
  if (!schema) {
    throw new Error(
      `Unknown property '${propertyName}'. Use notion_inspect_data_source to list valid properties.`,
    );
  }
  return schema;
}

function defaultOperatorForType(type: string): SimpleFilterOperator {
  switch (type) {
    case "title":
    case "rich_text":
      return "contains";
    case "multi_select":
    case "relation":
    case "people":
      return "contains";
    default:
      return "equals";
  }
}

function isEmptyOperator(operator: SimpleFilterOperator): boolean {
  return operator === "is_empty" || operator === "is_not_empty";
}

const SIMPLE_FILTER_OPERATORS: SimpleFilterOperator[] = [
  "equals",
  "does_not_equal",
  "contains",
  "does_not_contain",
  "greater_than",
  "less_than",
  "greater_than_or_equal_to",
  "less_than_or_equal_to",
  "before",
  "after",
  "on_or_before",
  "on_or_after",
  "is_empty",
  "is_not_empty",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function expectKnownOption(
  propertyName: string,
  schema: DatabasePropertyConfig,
  optionName: string,
): string {
  const options = getOptionNames(schema);
  if (options.length === 0 || options.includes(optionName)) {
    return optionName;
  }

  const suggestion = options.find(
    (option) => option.toLocaleLowerCase() === optionName.toLocaleLowerCase(),
  );
  throw new Error(
    [
      `Property '${propertyName}' does not have option '${optionName}'.`,
      `Valid options: ${options.join(", ")}.`,
      suggestion ? `Did you mean '${suggestion}'?` : undefined,
      "Use notion_inspect_data_source to confirm current options.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getOptionNames(schema: DatabasePropertyConfig): string[] {
  const config = schema[schema.type] as
    | { options?: Array<{ name?: unknown }> }
    | undefined;

  return (config?.options || [])
    .map((option) => option.name)
    .filter((name): name is string => typeof name === "string");
}

function expectString(propertyName: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`Property '${propertyName}' must be a string.`);
  }
  return value;
}

function expectNumber(propertyName: string, value: unknown): number {
  if (typeof value !== "number") {
    throw new Error(`Property '${propertyName}' must be a number.`);
  }
  return value;
}

function expectBoolean(propertyName: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Property '${propertyName}' must be a boolean.`);
  }
  return value;
}

function throwUnsupportedOperator(
  propertyName: string,
  operator: string,
  allowed: string[],
): never {
  throw new Error(
    `Property '${propertyName}' does not support operator '${operator}'. Allowed operators: ${allowed.join(", ")}.`,
  );
}
