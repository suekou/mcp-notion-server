export type ToolResult = {
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
};

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string };
};

type Handler = (params: Record<string, unknown>) => void;

class McpAppBridge {
  private nextId = 1;
  private readonly targetOrigin = parentOrigin();
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private readonly handlers = new Map<string, Handler[]>();

  constructor() {
    window.addEventListener(
      "message",
      (event: MessageEvent<JsonRpcMessage>) => {
        if (event.source !== window.parent) return;
        if (this.targetOrigin !== "*" && event.origin !== this.targetOrigin) {
          return;
        }

        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;

        if (message.id !== undefined && this.pending.has(message.id)) {
          const callbacks = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (!callbacks) return;
          if (message.error) {
            callbacks.reject(
              new Error(message.error.message || "MCP App request failed"),
            );
          } else {
            callbacks.resolve(message.result);
          }
          return;
        }

        if (message.method) {
          for (const handler of this.handlers.get(message.method) || []) {
            handler(toRecord(message.params));
          }
        }
      },
    );
  }

  on(method: string, handler: Handler) {
    this.handlers.set(method, [...(this.handlers.get(method) || []), handler]);
    return () => {
      const nextHandlers = (this.handlers.get(method) || []).filter(
        (candidate) => candidate !== handler,
      );
      if (nextHandlers.length) {
        this.handlers.set(method, nextHandlers);
      } else {
        this.handlers.delete(method);
      }
    };
  }

  async initialize(name: string) {
    try {
      await this.request("ui/initialize", {
        protocolVersion: "2026-01-26",
        appCapabilities: { availableDisplayModes: ["inline", "fullscreen"] },
        clientInfo: { name, version: "1.0.0" },
      });
      window.parent.postMessage(
        { jsonrpc: "2.0", method: "ui/notifications/initialized", params: {} },
        this.targetOrigin,
      );
    } catch {
      // Some hosts still render the app without completing ui/initialize.
    }
  }

  callTool(name: string, args: Record<string, unknown> = {}) {
    return this.request("tools/call", {
      name,
      arguments: stripUndefined(args),
    }) as Promise<ToolResult>;
  }

  updateContext(structuredContent: unknown) {
    return this.request("ui/update-model-context", {
      structuredContent,
      content: [
        { type: "text", text: JSON.stringify(structuredContent, null, 2) },
      ],
    }).catch(() => undefined);
  }

  private request(method: string, params: unknown) {
    const id = this.nextId++;
    window.parent.postMessage(
      { jsonrpc: "2.0", id, method, params: stripUndefined(params) },
      this.targetOrigin,
    );

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      window.setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 30000);
    });
  }
}

export const bridge = new McpAppBridge();

function parentOrigin(): string {
  if (!document.referrer) return "*";

  try {
    return new URL(document.referrer).origin;
  } catch {
    return "*";
  }
}

export function asData<T = Record<string, unknown>>(result: ToolResult): T {
  if (result.structuredContent) return result.structuredContent as T;

  const text = result.content?.find((item) => item.type === "text")?.text;
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return { text } as T;
  }
}

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([entryKey, entryValue]) => [entryKey, stripUndefined(entryValue)]),
  );
}
