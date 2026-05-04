import "../shared/tailwind.css";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { asData, bridge, toRecord } from "../shared/bridge";
import { protectEditingFocus } from "../shared/focusGuard";
import {
  coerceInputValue,
  compactValue,
  toStringValue,
} from "../shared/format";
import {
  Button,
  EmptyState,
  Field,
  Pill,
  SidebarSection,
  Status,
  Tabs,
  useRunner,
} from "../shared/ui";

type View = "schema" | "query" | "create";
type PropertySummary = {
  name: string;
  id: string;
  type: string;
  options?: string[];
};
type SchemaSummary = {
  id: string;
  title: string;
  properties: PropertySummary[];
};
type Row = {
  id: string;
  title?: string;
  properties?: Record<string, unknown>;
};
type QuerySummary = {
  results?: Row[];
};

const operators = [
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

const readonlyPropertyTypes = new Set([
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
  "rollup",
  "formula",
  "unique_id",
]);

function App() {
  const [dataSourceId, setDataSourceId] = useState("");
  const [schema, setSchema] = useState<SchemaSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [view, setView] = useState<View>("schema");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterOperator, setFilterOperator] = useState("equals");
  const [filterValue, setFilterValue] = useState("");
  const [createValues, setCreateValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const run = useRunner(setStatus, setError);

  const properties = schema?.properties || [];
  const writableProperties = useMemo(
    () =>
      properties.filter(
        (property) => !readonlyPropertyTypes.has(property.type),
      ),
    [properties],
  );

  useEffect(() => {
    const releaseEditingFocus = protectEditingFocus();
    const releaseToolInput = bridge.on(
      "ui/notifications/tool-input",
      (params) => {
        const args = toRecord(params.arguments);
        setDataSourceId(toStringValue(args.data_source_id));
      },
    );
    bridge.initialize("Notion Data Source Explorer");
    return () => {
      releaseEditingFocus();
      releaseToolInput();
    };
  }, []);

  async function inspect() {
    await run("Inspecting schema...", async () => {
      if (!dataSourceId.trim()) throw new Error("Enter a data_source_id.");
      const data = parseSchemaSummary(
        asData<unknown>(
          await bridge.callTool("notion_inspect_data_source", {
            data_source_id: dataSourceId.trim(),
            format: "json",
          }),
        ),
      );
      setSchema(data);
      setView("schema");
      await bridge.updateContext({ notion_data_source_schema: data });
    });
  }

  async function queryRows() {
    await run("Querying rows...", async () => {
      if (!dataSourceId.trim()) throw new Error("Enter a data_source_id.");
      const filters: Array<Record<string, unknown>> = [];
      if (filterProperty) {
        const filter: Record<string, unknown> = {
          property: filterProperty,
          operator: filterOperator,
        };
        if (
          !["is_empty", "is_not_empty"].includes(filterOperator) &&
          filterValue
        ) {
          filter.value = coerceInputValue(filterValue);
        }
        filters.push(filter);
      }
      const data = parseQuerySummary(
        asData<unknown>(
          await bridge.callTool("notion_query_data_source_by_values", {
            data_source_id: dataSourceId.trim(),
            filters: filters.length ? filters : undefined,
            page_size: 25,
            response_mode: "compact",
            format: "json",
          }),
        ),
      );
      const nextRows = data.results || [];
      setRows(nextRows);
      setView("query");
      await bridge.updateContext({
        notion_data_source_query: {
          data_source_id: dataSourceId.trim(),
          filters,
          result_count: nextRows.length,
          rows: nextRows,
        },
      });
    });
  }

  async function createItem() {
    await run("Creating item...", async () => {
      if (!dataSourceId.trim()) throw new Error("Enter a data_source_id.");
      const values = buildCreatePayload(writableProperties, createValues);
      if (!Object.keys(values).length) {
        throw new Error("Enter at least one property value.");
      }
      const created = asData(
        await bridge.callTool("notion_create_data_source_item_from_values", {
          data_source_id: dataSourceId.trim(),
          values,
          format: "json",
        }),
      );
      await bridge.updateContext({ notion_created_data_source_item: created });
      setCreateValues({});
      setView("query");
    });
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <SidebarSection title="1. Select source">
          <Field label="Data source ID">
            <input
              className="input"
              value={dataSourceId}
              onChange={(event) => setDataSourceId(event.target.value)}
            />
          </Field>
          <div className="row">
            <Button primary onClick={inspect}>
              Inspect schema
            </Button>
          </div>
        </SidebarSection>
        <SidebarSection title="2. Query items">
          <Field label="Property">
            <select
              className="input"
              disabled={!schema}
              value={filterProperty}
              onChange={(event) => setFilterProperty(event.target.value)}
            >
              <option value="">No filter</option>
              {properties.map((property) => (
                <option key={property.id} value={property.name}>
                  {property.name} ({property.type})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Operator">
            <select
              className="input"
              disabled={!schema}
              value={filterOperator}
              onChange={(event) => setFilterOperator(event.target.value)}
            >
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Value">
            <input
              className="input"
              disabled={!schema}
              placeholder="Done, AI, 2026-05-04"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
            />
          </Field>
          <Button disabled={!schema} primary onClick={queryRows}>
            Query
          </Button>
        </SidebarSection>
      </aside>
      <section className="page">
        <div className="page-header">
          <div>
            <h1 className="title">Data Source Explorer</h1>
            <p className="subtitle">
              Inspect fields, build a filter, query items, then create new rows
              from the same schema.
            </p>
          </div>
          <Status error={error} message={status} />
        </div>
        <Tabs
          value={view}
          tabs={[
            { value: "schema", label: `Schema (${properties.length})` },
            {
              value: "query",
              label: `Query (${rows.length})`,
              disabled: !schema,
            },
            { value: "create", label: "Create", disabled: !schema },
          ]}
          onChange={setView}
        />
        {view === "schema" && <SchemaView properties={properties} />}
        {view === "query" && <RowsView rows={rows} />}
        {view === "create" && (
          <CreateView
            properties={writableProperties}
            values={createValues}
            onChange={setCreateValues}
            onSubmit={createItem}
          />
        )}
      </section>
    </main>
  );
}

function SchemaView({ properties }: { properties: PropertySummary[] }) {
  if (!properties.length) {
    return (
      <EmptyState>Inspect a data source to see its properties.</EmptyState>
    );
  }
  return (
    <div className="list">
      {properties.map((property) => (
        <article className="item" key={property.id}>
          <div className="row">
            <span className="item-title">{property.name}</span>
            <Pill>{property.type}</Pill>
          </div>
          {!!property.options?.length && (
            <div className="row">
              {property.options.map((option) => (
                <Pill key={option}>{option}</Pill>
              ))}
            </div>
          )}
          <div className="meta">{property.id}</div>
        </article>
      ))}
    </div>
  );
}

function RowsView({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <EmptyState>
        Run a query to inspect matching data source items.
      </EmptyState>
    );
  }
  const keys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.properties || {}))),
  ).slice(0, 8);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-notion-line border-t bg-notion-page text-left">
        <thead>
          <tr>
            <th className="border-notion-line border-b p-2 text-xs font-semibold text-notion-muted">
              Title
            </th>
            {keys.map((key) => (
              <th
                className="min-w-36 border-notion-line border-b p-2 text-xs font-semibold text-notion-muted"
                key={key}
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border-notion-line border-b p-2 align-top">
                {row.title || "Untitled"}
              </td>
              {keys.map((key) => (
                <td
                  className="border-notion-line border-b p-2 align-top"
                  key={key}
                >
                  {compactValue(row.properties?.[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateView({
  properties,
  values,
  onChange,
  onSubmit,
}: {
  properties: PropertySummary[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onSubmit: () => void;
}) {
  if (!properties.length) {
    return (
      <EmptyState>This data source has no writable simple fields.</EmptyState>
    );
  }
  return (
    <div className="max-w-xl">
      <div className="mb-4 grid gap-3">
        {properties.map((property) => (
          <Field
            key={property.id}
            label={`${property.name} (${property.type})`}
          >
            {property.options?.length ? (
              <select
                className="input"
                value={values[property.name] || ""}
                onChange={(event) =>
                  onChange({ ...values, [property.name]: event.target.value })
                }
              >
                <option value="">Skip</option>
                {property.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                placeholder={placeholderFor(property.type)}
                value={values[property.name] || ""}
                onChange={(event) =>
                  onChange({ ...values, [property.name]: event.target.value })
                }
              />
            )}
          </Field>
        ))}
      </div>
      <Button primary onClick={onSubmit}>
        Create item
      </Button>
    </div>
  );
}

function buildCreatePayload(
  properties: PropertySummary[],
  values: Record<string, string>,
) {
  const payload: Record<string, unknown> = {};
  for (const property of properties) {
    const raw = values[property.name]?.trim();
    if (!raw) continue;
    payload[property.name] =
      property.type === "multi_select"
        ? raw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : coerceInputValue(raw);
  }
  return payload;
}

function placeholderFor(type: string): string {
  if (type === "checkbox") return "true or false";
  if (type === "date") return "2026-05-04";
  if (type === "number") return "3";
  if (type === "multi_select") return "Option A, Option B";
  return "";
}

function parseSchemaSummary(value: unknown): SchemaSummary {
  const record = toRecord(value);
  return {
    id: typeof record.id === "string" ? record.id : "",
    title: typeof record.title === "string" ? record.title : "",
    properties: Array.isArray(record.properties)
      ? record.properties.filter(isPropertySummary)
      : [],
  };
}

function isPropertySummary(value: unknown): value is PropertySummary {
  const record = toRecord(value);
  return (
    typeof record.name === "string" &&
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    (record.options === undefined ||
      (Array.isArray(record.options) &&
        record.options.every((option) => typeof option === "string")))
  );
}

function parseQuerySummary(value: unknown): QuerySummary {
  const record = toRecord(value);
  return {
    results: Array.isArray(record.results) ? record.results.filter(isRow) : [],
  };
}

function isRow(value: unknown): value is Row {
  const record = toRecord(value);
  return (
    typeof record.id === "string" &&
    (record.title === undefined || typeof record.title === "string") &&
    (record.properties === undefined ||
      (typeof record.properties === "object" &&
        record.properties !== null &&
        !Array.isArray(record.properties)))
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
