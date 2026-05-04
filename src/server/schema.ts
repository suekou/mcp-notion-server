import * as z from "zod/v4";
import type { PromptArgument, Tool } from "@modelcontextprotocol/sdk/types.js";

type JsonSchema = {
  type?: string;
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
};

type JsonLiteral = string | number | boolean | null;

export function toolInputSchema(tool: Tool): z.ZodType {
  return objectSchemaToZod(tool.inputSchema as JsonSchema | undefined);
}

export function promptArgsShape(
  args: PromptArgument[] | undefined
): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {};

  for (const arg of args ?? []) {
    const value = withDescription(z.string(), arg.description);
    shape[arg.name] = arg.required ? value : value.optional();
  }

  return shape;
}

function schemaToZod(schema: JsonSchema | undefined): z.ZodType {
  if (!schema) {
    return z.unknown();
  }

  if (schema.enum && schema.enum.length > 0) {
    return withDescription(enumToZod(schema.enum), schema.description);
  }

  switch (schema.type) {
    case "string":
      return withDescription(z.string(), schema.description);
    case "number":
    case "integer":
      return withDescription(z.number(), schema.description);
    case "boolean":
      return withDescription(z.boolean(), schema.description);
    case "array":
      return withDescription(
        z.array(schemaToZod(schema.items)),
        schema.description
      );
    case "object":
      return withDescription(objectSchemaToZod(schema), schema.description);
    default:
      return withDescription(z.unknown(), schema.description);
  }
}

function objectSchemaToZod(
  schema: JsonSchema | undefined
): z.ZodType {
  const shape: Record<string, z.ZodType> = {};
  const required = new Set(schema?.required ?? []);

  for (const [name, propertySchema] of Object.entries(
    schema?.properties ?? {}
  )) {
    const property = schemaToZod(propertySchema);
    shape[name] = required.has(name) ? property : property.optional();
  }

  // Existing JSON schemas do not set additionalProperties: false, so preserve
  // the current permissive behavior and let tool handlers validate semantics.
  return z.looseObject(shape);
}

function enumToZod(values: unknown[]): z.ZodType {
  if (values.every((value) => typeof value === "string")) {
    const [first, ...rest] = values as [string, ...string[]];
    return z.enum([first, ...rest]);
  }

  return z.literal(values as [JsonLiteral, ...JsonLiteral[]]);
}

function withDescription<T extends z.ZodType>(
  schema: T,
  description: string | undefined
): T {
  return description ? (schema.describe(description) as T) : schema;
}
