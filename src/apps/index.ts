import type {
  ReadResourceResult,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

export const notionAppResources: Resource[] = [
  {
    uri: "ui://notion/finder",
    name: "Notion Finder App",
    title: "Notion Finder",
    description:
      "Interactive target picker for Notion pages, databases, and data sources.",
    mimeType: MCP_APP_MIME_TYPE,
    _meta: {
      ui: {
        csp: {
          "default-src": ["'none'"],
          "script-src": ["'unsafe-inline'"],
          "style-src": ["'unsafe-inline'"],
          "connect-src": ["'none'"],
          "img-src": ["data:"],
        },
      },
    },
  },
  {
    uri: "ui://notion/data-source-explorer",
    name: "Notion Data Source Explorer App",
    title: "Notion Data Source Explorer",
    description:
      "Interactive schema, query, and item creation workbench for Notion data sources.",
    mimeType: MCP_APP_MIME_TYPE,
    _meta: {
      ui: {
        csp: {
          "default-src": ["'none'"],
          "script-src": ["'unsafe-inline'"],
          "style-src": ["'unsafe-inline'"],
          "connect-src": ["'none'"],
          "img-src": ["data:"],
        },
      },
    },
  },
  {
    uri: "ui://notion/page-workbench",
    name: "Notion Page Workbench App",
    title: "Notion Page Workbench",
    description:
      "Interactive page reader and simple block editing workbench for Notion pages.",
    mimeType: MCP_APP_MIME_TYPE,
    _meta: {
      ui: {
        csp: {
          "default-src": ["'none'"],
          "script-src": ["'unsafe-inline'"],
          "style-src": ["'unsafe-inline'"],
          "connect-src": ["'none'"],
          "img-src": ["data:"],
        },
      },
    },
  },
];

export function readNotionAppResource(uri: string): ReadResourceResult {
  const text = appHtmlByUri(uri);

  return {
    contents: [
      {
        uri,
        mimeType: MCP_APP_MIME_TYPE,
        text,
        _meta: notionAppResources.find((resource) => resource.uri === uri)
          ?._meta,
      },
    ],
  };
}

function appHtmlByUri(uri: string): string {
  switch (uri) {
    case "ui://notion/finder":
      return buildHtml("Notion Finder", finderBody(), finderScript());
    case "ui://notion/data-source-explorer":
      return buildHtml(
        "Notion Data Source Explorer",
        dataSourceExplorerBody(),
        dataSourceExplorerScript(),
      );
    case "ui://notion/page-workbench":
      return buildHtml(
        "Notion Page Workbench",
        pageWorkbenchBody(),
        pageWorkbenchScript(),
      );
    default:
      throw new Error(`Unknown MCP App resource URI: ${uri}`);
  }
}

function buildHtml(title: string, body: string, script: string): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${title}</title>`,
    "<style>",
    commonCss(),
    "</style>",
    "</head>",
    "<body>",
    body,
    "<script>",
    commonBridgeScript(),
    script,
    "</script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function commonCss(): string {
  return `
:root {
  color-scheme: light dark;
  --bg: var(--mcp-ui-background-color, #ffffff);
  --text: var(--mcp-ui-text-color, #171717);
  --muted: var(--mcp-ui-secondary-text-color, #666666);
  --border: var(--mcp-ui-border-color, #d9d9d9);
  --surface: var(--mcp-ui-card-background-color, #f7f7f7);
  --accent: var(--mcp-ui-accent-color, #0f766e);
  --danger: #b42318;
  font-family: var(--mcp-ui-font-family, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-size: 14px; }
main { display: grid; gap: 14px; padding: 14px; max-width: 1200px; margin: 0 auto; }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
h1 { margin: 0; font-size: 18px; line-height: 1.25; }
h2 { margin: 0 0 8px; font-size: 14px; line-height: 1.25; }
p { margin: 0; color: var(--muted); }
.grid { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); gap: 14px; align-items: start; }
.panel { border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 12px; min-width: 0; }
.stack { display: grid; gap: 10px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.toolbar { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }
input, select, textarea, button {
  font: inherit;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}
input, select, textarea { width: 100%; min-height: 34px; padding: 7px 8px; }
textarea { min-height: 92px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
button { min-height: 34px; padding: 7px 10px; cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: white; }
button.ghost { background: transparent; }
button:disabled { opacity: .55; cursor: not-allowed; }
.status { min-height: 20px; color: var(--muted); }
.error { color: var(--danger); }
.list { display: grid; gap: 8px; }
.item { border: 1px solid var(--border); border-radius: 8px; background: var(--bg); padding: 10px; display: grid; gap: 8px; }
.item-title { font-weight: 650; overflow-wrap: anywhere; }
.meta { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.badge { display: inline-flex; align-items: center; min-height: 22px; border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px; font-size: 12px; color: var(--muted); background: var(--bg); }
table { width: 100%; border-collapse: collapse; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: block; overflow-x: auto; }
thead, tbody, tr { width: 100%; }
th, td { border-bottom: 1px solid var(--border); padding: 8px; text-align: left; vertical-align: top; min-width: 140px; }
th { color: var(--muted); font-size: 12px; background: var(--surface); }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
.blocks { display: grid; gap: 6px; }
.block { border-left: 3px solid var(--border); padding: 6px 8px; background: var(--bg); border-radius: 0 6px 6px 0; }
.selected { outline: 2px solid var(--accent); }
@media (max-width: 760px) {
  main { padding: 10px; }
  .grid { grid-template-columns: 1fr; }
}
`;
}

function commonBridgeScript(): string {
  return `
const bridge = (() => {
  let nextId = 1;
  const pending = new Map();
  const handlers = new Map();

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message || message.jsonrpc !== "2.0") return;
    if (message.id !== undefined && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || String(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method && handlers.has(message.method)) {
      handlers.get(message.method).forEach((handler) => handler(message.params || {}));
    }
  });

  function request(method, params) {
    const id = nextId++;
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      window.setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        reject(new Error(method + " timed out"));
      }, 30000);
    });
  }

  function notify(method, params) {
    window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
  }

  function on(method, handler) {
    const list = handlers.get(method) || [];
    list.push(handler);
    handlers.set(method, list);
  }

  async function initialize(name) {
    try {
      await request("ui/initialize", {
        protocolVersion: "2026-01-26",
        appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
        clientInfo: { name, version: "1.0.0" }
      });
      notify("ui/notifications/initialized", {});
    } catch (error) {
      log("warning", "Host did not complete ui/initialize: " + error.message);
    }
  }

  function callTool(name, args) {
    return request("tools/call", { name, arguments: args || {} });
  }

  function updateContext(structuredContent, content) {
    return request("ui/update-model-context", {
      structuredContent,
      content: content || [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }]
    }).catch(() => undefined);
  }

  function log(level, data) {
    notify("notifications/message", { level, logger: "notion-mcp-app", data });
  }

  return { initialize, callTool, updateContext, log, on };
})();

function $(id) { return document.getElementById(id); }
function text(value) { return value === undefined || value === null ? "" : String(value); }
function asData(result) {
  if (!result) return {};
  if (result.structuredContent) return result.structuredContent;
  const content = Array.isArray(result.content) ? result.content.find((item) => item.type === "text") : undefined;
  if (!content || typeof content.text !== "string") return {};
  try { return JSON.parse(content.text); } catch { return { text: content.text }; }
}
function setStatus(message, isError) {
  const node = $("status");
  if (!node) return;
  node.textContent = message || "";
  node.className = isError ? "status error" : "status";
}
async function run(message, fn) {
  setStatus(message || "Working...", false);
  try {
    const value = await fn();
    setStatus("", false);
    return value;
  } catch (error) {
    setStatus(error.message || String(error), true);
    bridge.log("error", error.message || String(error));
    throw error;
  }
}
function renderJson(value) {
  return "<pre>" + escapeHtml(JSON.stringify(value, null, 2)) + "</pre>";
}
function escapeHtml(value) {
  return text(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function compactValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(compactValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.id) return value.id;
    if (value.plain_text) return value.plain_text;
  }
  return JSON.stringify(value);
}
function selectedOptionHtml(value, label, selected) {
  return '<option value="' + escapeHtml(value) + '"' + (selected ? " selected" : "") + ">" + escapeHtml(label) + "</option>";
}
`;
}

function finderBody(): string {
  return `
<main>
  <header>
    <div>
      <h1>Notion Finder</h1>
      <p>Find pages, databases, and data sources, then pin the target back to the conversation.</p>
    </div>
    <div id="status" class="status"></div>
  </header>
  <section class="grid">
    <div class="panel stack">
      <label>Search query<input id="query" placeholder="Project notes, Tasks, Roadmap"></label>
      <label>Type
        <select id="objectType">
          <option value="">Any</option>
          <option value="page">Page</option>
          <option value="data_source">Data source</option>
        </select>
      </label>
      <div class="row">
        <button id="search" class="primary">Search</button>
        <button id="recent">Recent</button>
      </div>
      <div id="selection" class="panel"></div>
    </div>
    <div class="panel">
      <div class="toolbar"><h2>Results</h2><span id="count" class="badge">0</span></div>
      <div id="results" class="list"></div>
    </div>
  </section>
</main>`;
}

function finderScript(): string {
  return `
let finderState = { query: "", object_type: "", selected: null };

bridge.on("ui/notifications/tool-input", (params) => {
  const args = params.arguments || {};
  if (args.query) $("query").value = args.query;
  if (args.object_type) $("objectType").value = args.object_type;
});
bridge.on("ui/notifications/tool-result", (params) => {
  const data = asData(params);
  if (data.query) $("query").value = data.query;
  if (data.object_type) $("objectType").value = data.object_type;
});

$("search").addEventListener("click", search);
$("recent").addEventListener("click", () => { $("query").value = ""; search(); });
$("query").addEventListener("keydown", (event) => { if (event.key === "Enter") search(); });

async function search() {
  await run("Searching Notion...", async () => {
    finderState.query = $("query").value.trim();
    finderState.object_type = $("objectType").value || undefined;
    const result = await bridge.callTool("notion_find", {
      query: finderState.query || undefined,
      object_type: finderState.object_type,
      page_size: 20,
      format: "json"
    });
    renderResults(asData(result));
  });
}

function renderResults(data) {
  const results = data.results || [];
  $("count").textContent = String(results.length);
  $("results").innerHTML = results.length ? results.map(renderResult).join("") : '<p>No targets found.</p>';
  document.querySelectorAll("[data-select]").forEach((button) => {
    button.addEventListener("click", () => selectResult(results[Number(button.dataset.select)]));
  });
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => openResult(results[Number(button.dataset.open)]));
  });
}

function renderResult(item, index) {
  const ds = (item.data_sources || []).map((source) => '<span class="badge">' + escapeHtml(source.name || source.id) + '</span>').join(" ");
  return '<article class="item">' +
    '<div class="row"><span class="badge">' + escapeHtml(item.object) + '</span><span class="item-title">' + escapeHtml(item.title || "Untitled") + '</span></div>' +
    '<div class="meta">' + escapeHtml(item.id) + '</div>' +
    (ds ? '<div class="row">' + ds + '</div>' : '') +
    '<div class="row"><button data-select="' + index + '" class="primary">Select</button><button data-open="' + index + '">Open related tool</button></div>' +
  '</article>';
}

async function selectResult(item) {
  finderState.selected = item;
  $("selection").innerHTML = '<h2>Selected</h2><div class="item-title">' + escapeHtml(item.title || "Untitled") + '</div><div class="meta">' + escapeHtml(item.id) + '</div>';
  await bridge.updateContext({ notion_target: item });
}

async function openResult(item) {
  await selectResult(item);
  if (item.object === "page") {
    await bridge.callTool("notion_open_page_workbench", { page_id: item.id, format: "json" });
  } else if (item.object === "data_source") {
    await bridge.callTool("notion_open_data_source_app", { data_source_id: item.id, format: "json" });
  } else if (item.object === "database" && item.data_sources && item.data_sources[0]) {
    await bridge.callTool("notion_open_data_source_app", { data_source_id: item.data_sources[0].id, format: "json" });
  }
}

bridge.initialize("Notion Finder").then(search);
`;
}

function dataSourceExplorerBody(): string {
  return `
<main>
  <header>
    <div>
      <h1>Notion Data Source Explorer</h1>
      <p>Inspect schema, build filters, query rows, and create new items from simple values.</p>
    </div>
    <div id="status" class="status"></div>
  </header>
  <section class="grid">
    <div class="panel stack">
      <label>Data source ID<input id="dataSourceId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label>
      <div class="row">
        <button id="inspect" class="primary">Inspect</button>
        <button id="query">Query</button>
      </div>
      <div class="panel stack">
        <h2>Filter</h2>
        <label>Property<select id="filterProperty"></select></label>
        <label>Operator<select id="filterOperator"></select></label>
        <label>Value<input id="filterValue" placeholder="Done, AI, 2026-05-04"></label>
      </div>
      <div class="panel stack">
        <h2>Create Item</h2>
        <div id="createFields" class="stack"></div>
        <button id="createItem" class="primary">Create</button>
      </div>
    </div>
    <div class="stack">
      <div class="panel">
        <div class="toolbar"><h2>Schema</h2><span id="schemaCount" class="badge">0 properties</span></div>
        <div id="schema" class="list"></div>
      </div>
      <div class="panel">
        <div class="toolbar"><h2>Rows</h2><span id="rowCount" class="badge">0</span></div>
        <div id="rows"></div>
      </div>
    </div>
  </section>
</main>`;
}

function dataSourceExplorerScript(): string {
  return `
let dsState = { schema: null, rows: [] };
const operators = ["equals", "does_not_equal", "contains", "does_not_contain", "greater_than", "less_than", "greater_than_or_equal_to", "less_than_or_equal_to", "before", "after", "on_or_before", "on_or_after", "is_empty", "is_not_empty"];

bridge.on("ui/notifications/tool-input", (params) => {
  const args = params.arguments || {};
  if (args.data_source_id) $("dataSourceId").value = args.data_source_id;
});
bridge.on("ui/notifications/tool-result", (params) => {
  const data = asData(params);
  if (data.data_source_id) $("dataSourceId").value = data.data_source_id;
});

$("inspect").addEventListener("click", inspect);
$("query").addEventListener("click", queryRows);
$("createItem").addEventListener("click", createItem);
$("filterOperator").innerHTML = operators.map((op) => selectedOptionHtml(op, op, op === "equals")).join("");

async function inspect() {
  await run("Inspecting schema...", async () => {
    const id = $("dataSourceId").value.trim();
    if (!id) throw new Error("Enter a data_source_id.");
    const result = await bridge.callTool("notion_inspect_data_source", { data_source_id: id, format: "json" });
    dsState.schema = asData(result);
    renderSchema();
    await bridge.updateContext({ notion_data_source_schema: dsState.schema });
  });
}

function renderSchema() {
  const properties = dsState.schema && dsState.schema.properties ? dsState.schema.properties : [];
  $("schemaCount").textContent = properties.length + " properties";
  $("filterProperty").innerHTML = properties.map((property) => selectedOptionHtml(property.name, property.name + " (" + property.type + ")", false)).join("");
  $("schema").innerHTML = properties.map((property) =>
    '<div class="item"><div class="row"><span class="item-title">' + escapeHtml(property.name) + '</span><span class="badge">' + escapeHtml(property.type) + '</span></div>' +
    (property.options ? '<div class="meta">Options: ' + escapeHtml(property.options.join(", ")) + '</div>' : '') +
    '<div class="meta">' + escapeHtml(property.id) + '</div></div>'
  ).join("");
  $("createFields").innerHTML = properties
    .filter((property) => !["created_time", "created_by", "last_edited_time", "last_edited_by", "rollup", "formula", "unique_id"].includes(property.type))
    .map(renderCreateField)
    .join("");
}

function renderCreateField(property) {
  const id = "create_" + property.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (property.options && property.options.length) {
    return '<label>' + escapeHtml(property.name) + ' <span class="badge">' + escapeHtml(property.type) + '</span><select data-create-name="' + escapeHtml(property.name) + '" data-create-type="' + escapeHtml(property.type) + '"><option value="">Skip</option>' + property.options.map((option) => selectedOptionHtml(option, option, false)).join("") + '</select></label>';
  }
  const placeholder = property.type === "checkbox" ? "true or false" : property.type === "date" ? "2026-05-04" : property.type === "number" ? "3" : "";
  return '<label>' + escapeHtml(property.name) + ' <span class="badge">' + escapeHtml(property.type) + '</span><input id="' + escapeHtml(id) + '" data-create-name="' + escapeHtml(property.name) + '" data-create-type="' + escapeHtml(property.type) + '" placeholder="' + escapeHtml(placeholder) + '"></label>';
}

async function queryRows() {
  await run("Querying rows...", async () => {
    const id = $("dataSourceId").value.trim();
    if (!id) throw new Error("Enter a data_source_id.");
    const filters = [];
    const property = $("filterProperty").value;
    const operator = $("filterOperator").value;
    const value = $("filterValue").value.trim();
    if (property) {
      const filter = { property, operator };
      if (!["is_empty", "is_not_empty"].includes(operator) && value) filter.value = coerceValue(value);
      filters.push(filter);
    }
    const result = await bridge.callTool("notion_query_data_source_by_values", {
      data_source_id: id,
      filters: filters.length ? filters : undefined,
      page_size: 25,
      response_mode: "compact",
      format: "json"
    });
    const data = asData(result);
    dsState.rows = data.results || [];
    renderRows(data);
    await bridge.updateContext({ notion_data_source_query: { data_source_id: id, filters, result_count: dsState.rows.length, rows: dsState.rows } });
  });
}

function renderRows(data) {
  const rows = data.results || [];
  $("rowCount").textContent = String(rows.length);
  if (!rows.length) {
    $("rows").innerHTML = "<p>No rows.</p>";
    return;
  }
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.properties || {})))).slice(0, 8);
  $("rows").innerHTML = '<table><thead><tr><th>Title</th>' + keys.map((key) => '<th>' + escapeHtml(key) + '</th>').join("") + '<th>ID</th></tr></thead><tbody>' +
    rows.map((row) => '<tr><td>' + escapeHtml(row.title || "Untitled") + '</td>' + keys.map((key) => '<td>' + escapeHtml(compactValue((row.properties || {})[key])) + '</td>').join("") + '<td><button data-row="' + escapeHtml(row.id) + '">Select</button></td></tr>').join("") +
    '</tbody></table>';
  document.querySelectorAll("[data-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = rows.find((item) => item.id === button.dataset.row);
      bridge.updateContext({ notion_data_source_row: row });
    });
  });
}

async function createItem() {
  await run("Creating item...", async () => {
    const id = $("dataSourceId").value.trim();
    if (!id) throw new Error("Enter a data_source_id.");
    const values = {};
    document.querySelectorAll("[data-create-name]").forEach((node) => {
      const raw = node.value.trim();
      if (!raw) return;
      const type = node.dataset.createType;
      values[node.dataset.createName] = type === "number" ? Number(raw) : type === "checkbox" ? raw === "true" : type === "multi_select" ? raw.split(",").map((part) => part.trim()).filter(Boolean) : raw;
    });
    if (!Object.keys(values).length) throw new Error("Enter at least one property value.");
    const result = await bridge.callTool("notion_create_data_source_item_from_values", { data_source_id: id, values, format: "json" });
    const data = asData(result);
    await bridge.updateContext({ notion_created_data_source_item: data });
    $("rows").innerHTML = '<div class="item"><div class="item-title">Created item</div>' + renderJson(data) + '</div>';
  });
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\\d+(\\.\\d+)?$/.test(value)) return Number(value);
  return value;
}

bridge.initialize("Notion Data Source Explorer").then(() => {
  if ($("dataSourceId").value.trim()) inspect();
});
`;
}

function pageWorkbenchBody(): string {
  return `
<main>
  <header>
    <div>
      <h1>Notion Page Workbench</h1>
      <p>Read a page, select simple blocks, update text, or append Markdown.</p>
    </div>
    <div id="status" class="status"></div>
  </header>
  <section class="grid">
    <div class="panel stack">
      <label>Page ID<input id="pageId" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label>
      <div class="row">
        <button id="read" class="primary">Read</button>
        <button id="markdownMode">Markdown</button>
      </div>
      <div class="panel stack">
        <h2>Selected Block</h2>
        <div id="selectedBlock" class="meta">No block selected.</div>
        <label>Type<select id="blockType"></select></label>
        <label>Text<textarea id="blockText"></textarea></label>
        <button id="updateBlock" class="primary">Update Block</button>
      </div>
      <div class="panel stack">
        <h2>Append Markdown</h2>
        <label>Markdown<textarea id="appendMarkdown" placeholder="# Heading\\n\\n- Item"></textarea></label>
        <button id="append" class="primary">Append</button>
      </div>
    </div>
    <div class="panel">
      <div class="toolbar"><h2 id="pageTitle">Page</h2><span id="blockCount" class="badge">0 blocks</span></div>
      <div id="content" class="blocks"></div>
    </div>
  </section>
</main>`;
}

function pageWorkbenchScript(): string {
  return `
let pageState = { page: null, blocks: [], selected: null, markdownMode: false };
const editableTypes = ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "quote", "callout", "code"];
$("blockType").innerHTML = editableTypes.map((type) => selectedOptionHtml(type, type, false)).join("");

bridge.on("ui/notifications/tool-input", (params) => {
  const args = params.arguments || {};
  if (args.page_id) $("pageId").value = args.page_id;
});
bridge.on("ui/notifications/tool-result", (params) => {
  const data = asData(params);
  if (data.page_id) $("pageId").value = data.page_id;
});

$("read").addEventListener("click", readPage);
$("markdownMode").addEventListener("click", () => { pageState.markdownMode = !pageState.markdownMode; readPage(); });
$("updateBlock").addEventListener("click", updateSelectedBlock);
$("append").addEventListener("click", appendMarkdown);

async function readPage() {
  await run("Reading page...", async () => {
    const pageId = $("pageId").value.trim();
    if (!pageId) throw new Error("Enter a page_id.");
    const result = await bridge.callTool("notion_read_page", {
      page_id: pageId,
      content_format: pageState.markdownMode ? "markdown" : "outline",
      max_depth: 3,
      max_blocks: 120,
      include_properties: true,
      format: "json"
    });
    const data = asData(result);
    pageState.page = data.page;
    pageState.blocks = data.content && data.content.outline ? data.content.outline : [];
    renderPage(data);
    await bridge.updateContext({ notion_page_read: { page: data.page, block_count: data.content && data.content.block_count } });
  });
}

function renderPage(data) {
  $("pageTitle").textContent = data.page ? data.page.title : "Page";
  $("blockCount").textContent = ((data.content && data.content.block_count) || 0) + " blocks";
  if (pageState.markdownMode && data.content && data.content.markdown) {
    $("content").innerHTML = '<pre>' + escapeHtml(data.content.markdown) + '</pre>';
    return;
  }
  $("content").innerHTML = renderBlocks(pageState.blocks, 0);
  document.querySelectorAll("[data-block-id]").forEach((node) => {
    node.addEventListener("click", () => selectBlock(findBlock(pageState.blocks, node.dataset.blockId)));
  });
}

function renderBlocks(blocks, depth) {
  return (blocks || []).map((block) => {
    const children = block.children ? renderBlocks(block.children, depth + 1) : "";
    return '<div class="block" style="margin-left:' + Math.min(depth * 14, 56) + 'px" data-block-id="' + escapeHtml(block.id) + '">' +
      '<div class="row"><span class="badge">' + escapeHtml(block.type) + '</span><span class="meta">' + escapeHtml(block.id) + '</span></div>' +
      '<div>' + escapeHtml(block.text || block.markdown || "") + '</div>' +
      children +
    '</div>';
  }).join("");
}

function findBlock(blocks, id) {
  for (const block of blocks || []) {
    if (block.id === id) return block;
    const child = findBlock(block.children || [], id);
    if (child) return child;
  }
}

function selectBlock(block) {
  if (!block) return;
  pageState.selected = block;
  $("selectedBlock").textContent = block.id;
  $("blockType").value = editableTypes.includes(block.type) ? block.type : "paragraph";
  $("blockText").value = block.text || "";
  document.querySelectorAll(".block").forEach((node) => node.classList.toggle("selected", node.dataset.blockId === block.id));
  bridge.updateContext({ notion_selected_block: block });
}

async function updateSelectedBlock() {
  await run("Updating block...", async () => {
    if (!pageState.selected) throw new Error("Select a block first.");
    const item = { type: $("blockType").value, text: $("blockText").value };
    const result = await bridge.callTool("notion_update_content", {
      block_id: pageState.selected.id,
      item,
      format: "json"
    });
    await bridge.updateContext({ notion_updated_block: { block_id: pageState.selected.id, item, result: asData(result) } });
    await readPage();
  });
}

async function appendMarkdown() {
  await run("Appending Markdown...", async () => {
    const pageId = $("pageId").value.trim();
    const markdown = $("appendMarkdown").value;
    if (!pageId) throw new Error("Enter a page_id.");
    if (!markdown.trim()) throw new Error("Enter Markdown to append.");
    const result = await bridge.callTool("notion_append_markdown", { block_id: pageId, markdown, format: "json" });
    await bridge.updateContext({ notion_appended_markdown: asData(result) });
    $("appendMarkdown").value = "";
    await readPage();
  });
}

bridge.initialize("Notion Page Workbench").then(() => {
  if ($("pageId").value.trim()) readPage();
});
`;
}
