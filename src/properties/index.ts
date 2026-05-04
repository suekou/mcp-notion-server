import { DataSourceResponse, RichTextItemResponse } from "../types/index.js";

export type SimplePropertyValues = Record<string, unknown>;

export function buildPagePropertiesFromSimpleValues(
  dataSource: DataSourceResponse,
  values: SimplePropertyValues
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const [propertyName, value] of Object.entries(values)) {
    const schema = dataSource.properties[propertyName];
    if (!schema) {
      throw new Error(
        `Unknown property '${propertyName}'. Use notion_inspect_data_source to list valid properties.`
      );
    }

    properties[propertyName] = buildPropertyValue(propertyName, schema.type, value);
  }

  return properties;
}

function buildPropertyValue(
  propertyName: string,
  propertyType: string,
  value: unknown
): Record<string, unknown> {
  switch (propertyType) {
    case "title":
      return { title: stringToRichText(propertyName, value) };
    case "rich_text":
      return { rich_text: stringToRichText(propertyName, value) };
    case "number":
      return { number: expectNumber(propertyName, value) };
    case "checkbox":
      return { checkbox: expectBoolean(propertyName, value) };
    case "select":
      return { select: { name: expectString(propertyName, value) } };
    case "status":
      return { status: { name: expectString(propertyName, value) } };
    case "multi_select":
      return {
        multi_select: expectStringArray(propertyName, value).map((name) => ({
          name,
        })),
      };
    case "date":
      return { date: buildDateValue(propertyName, value) };
    case "url":
      return { url: nullableString(propertyName, value) };
    case "email":
      return { email: nullableString(propertyName, value) };
    case "phone_number":
      return { phone_number: nullableString(propertyName, value) };
    case "relation":
      return {
        relation: expectStringArray(propertyName, value).map((id) => ({ id })),
      };
    case "people":
      return {
        people: expectStringArray(propertyName, value).map((id) => ({ id })),
      };
    default:
      throw new Error(
        `Property '${propertyName}' has unsupported type '${propertyType}' for simple value creation. Use notion_create_data_source_item with raw Notion properties.`
      );
  }
}

function stringToRichText(
  propertyName: string,
  value: unknown
): RichTextItemResponse[] {
  const content = expectString(propertyName, value);
  return [
    {
      type: "text",
      text: { content },
      plain_text: content,
    },
  ];
}

function buildDateValue(
  propertyName: string,
  value: unknown
): Record<string, unknown> {
  if (typeof value === "string") {
    return { start: value };
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const dateValue = value as Record<string, unknown>;
    if (typeof dateValue.start !== "string") {
      throw new Error(`Property '${propertyName}' date value requires a string start.`);
    }
    return {
      start: dateValue.start,
      ...(typeof dateValue.end === "string" ? { end: dateValue.end } : {}),
      ...(typeof dateValue.time_zone === "string"
        ? { time_zone: dateValue.time_zone }
        : {}),
    };
  }

  throw new Error(
    `Property '${propertyName}' must be an ISO date string or { start, end?, time_zone? }.`
  );
}

function expectString(propertyName: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`Property '${propertyName}' must be a string.`);
  }
  return value;
}

function nullableString(propertyName: string, value: unknown): string | null {
  if (value === null) return null;
  return expectString(propertyName, value);
}

function expectStringArray(propertyName: string, value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  throw new Error(
    `Property '${propertyName}' must be a string or an array of strings.`
  );
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
