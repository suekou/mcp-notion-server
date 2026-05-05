import { existsSync, readFileSync } from "node:fs";
import type {
  ReadResourceResult,
  Resource,
} from "@modelcontextprotocol/sdk/types.js";

export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

type NotionAppResource = Resource & {
  uri: `ui://notion/${string}`;
  asset: string;
};

const APP_CSP = {
  "default-src": ["'none'"],
  "script-src": ["'unsafe-inline'"],
  "style-src": ["'unsafe-inline'"],
  "connect-src": ["'none'"],
  "img-src": ["data:"],
};

export const notionAppResources: NotionAppResource[] = [
  {
    uri: "ui://notion/data-source-explorer",
    asset: "data-source-explorer.html",
    name: "Notion Data Source Explorer App",
    title: "Notion Data Source Explorer",
    description:
      "Interactive schema, query, and item creation workbench for Notion data sources.",
    mimeType: MCP_APP_MIME_TYPE,
    _meta: { ui: { csp: APP_CSP } },
  },
  {
    uri: "ui://notion/page-workbench",
    asset: "page-workbench.html",
    name: "Notion Page Workbench App",
    title: "Notion Page Workbench",
    description:
      "Interactive page reader and simple block editing workbench for Notion pages.",
    mimeType: MCP_APP_MIME_TYPE,
    _meta: { ui: { csp: APP_CSP } },
  },
];

export function readNotionAppResource(uri: string): ReadResourceResult {
  const resource = notionAppResources.find((item) => item.uri === uri);
  if (!resource) {
    throw new Error(`Unknown MCP App resource URI: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: MCP_APP_MIME_TYPE,
        text: readAppAsset(resource.asset),
        _meta: resource._meta,
      },
    ],
  };
}

function readAppAsset(assetName: string): string {
  for (const url of appAssetCandidates(assetName)) {
    if (existsSync(url)) return readFileSync(url, "utf8");
  }

  throw new Error(`Missing MCP App asset: ${assetName}`);
}

function appAssetCandidates(assetName: string): URL[] {
  const appName = assetName.replace(/\.html$/, "");

  return [
    new URL(`./assets/${assetName}`, import.meta.url),
    new URL(`../../build/apps/assets/${assetName}`, import.meta.url),
    new URL(`./ui/${appName}/index.html`, import.meta.url),
  ];
}
