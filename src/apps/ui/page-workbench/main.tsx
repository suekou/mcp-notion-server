import "../shared/tailwind.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { asData, bridge, toRecord } from "../shared/bridge";
import { protectEditingFocus } from "../shared/focusGuard";
import { toStringValue } from "../shared/format";
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

type View = "read" | "edit" | "append";
type BlockNode = {
  id: string;
  type: string;
  text?: string;
  markdown?: string;
  children?: BlockNode[];
};
type PageRead = {
  page?: { id: string; title: string };
  content?: {
    block_count?: number;
    outline?: BlockNode[];
    markdown?: string;
  };
};

const editableTypes = [
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "callout",
  "code",
];

function App() {
  const [pageId, setPageId] = useState("");
  const [pageRead, setPageRead] = useState<PageRead | null>(null);
  const [blocks, setBlocks] = useState<BlockNode[]>([]);
  const [selected, setSelected] = useState<BlockNode | null>(null);
  const [view, setView] = useState<View>("read");
  const [blockType, setBlockType] = useState("paragraph");
  const [blockText, setBlockText] = useState("");
  const [appendMarkdownText, setAppendMarkdownText] = useState("");
  const [markdownMode, setMarkdownMode] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const run = useRunner(setStatus, setError);

  useEffect(() => {
    const releaseEditingFocus = protectEditingFocus();
    const releaseToolInput = bridge.on(
      "ui/notifications/tool-input",
      (params) => {
        const args = toRecord(params.arguments);
        setPageId(toStringValue(args.page_id));
      },
    );
    bridge.initialize("Notion Page Workbench");
    return () => {
      releaseEditingFocus();
      releaseToolInput();
    };
  }, []);

  async function readPage(nextMarkdownMode = markdownMode) {
    await run("Reading page...", async () => {
      if (!pageId.trim()) throw new Error("Enter a page_id.");
      const data = parsePageRead(
        asData<unknown>(
          await bridge.callTool("notion_read_page", {
            page_id: pageId.trim(),
            content_format: nextMarkdownMode ? "markdown" : "outline",
            max_depth: 3,
            max_blocks: 120,
            include_properties: true,
            format: "json",
          }),
        ),
      );
      setPageRead(data);
      setBlocks(data.content?.outline || []);
      setView("read");
      await bridge.updateContext({
        notion_page_read: {
          page: data.page,
          block_count: data.content?.block_count,
        },
      });
    });
  }

  function selectBlock(block: BlockNode) {
    setSelected(block);
    setBlockType(editableTypes.includes(block.type) ? block.type : "paragraph");
    setBlockText(block.text || "");
    setView("edit");
    bridge.updateContext({ notion_selected_block: block });
  }

  async function updateSelectedBlock() {
    await run("Updating block...", async () => {
      if (!selected) throw new Error("Select a block first.");
      const item = { type: blockType, text: blockText };
      const result = asData(
        await bridge.callTool("notion_update_content", {
          block_id: selected.id,
          item,
          format: "json",
        }),
      );
      await bridge.updateContext({
        notion_updated_block: { block_id: selected.id, item, result },
      });
      await readPage(false);
    });
  }

  async function appendMarkdown() {
    await run("Appending Markdown...", async () => {
      if (!pageId.trim()) throw new Error("Enter a page_id.");
      if (!appendMarkdownText.trim())
        throw new Error("Enter Markdown to append.");
      const result = asData(
        await bridge.callTool("notion_append_markdown", {
          block_id: pageId.trim(),
          markdown: appendMarkdownText,
          format: "json",
        }),
      );
      setAppendMarkdownText("");
      await bridge.updateContext({ notion_appended_markdown: result });
      await readPage(false);
    });
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <SidebarSection title="1. Read page">
          <Field label="Page ID">
            <input
              className="input"
              value={pageId}
              onChange={(event) => setPageId(event.target.value)}
            />
          </Field>
          <div className="row">
            <Button primary onClick={() => readPage()}>
              Read
            </Button>
            <Button
              onClick={() => {
                const next = !markdownMode;
                setMarkdownMode(next);
                readPage(next);
              }}
            >
              {markdownMode ? "Outline" : "Markdown"}
            </Button>
          </div>
        </SidebarSection>
        <SidebarSection title="2. Edit selected block">
          {selected ? (
            <div className="grid gap-2">
              <div className="meta">{selected.id}</div>
              <Field label="Type">
                <select
                  className="input"
                  value={blockType}
                  onChange={(event) => setBlockType(event.target.value)}
                >
                  {editableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Text">
                <textarea
                  className="textarea"
                  value={blockText}
                  onChange={(event) => setBlockText(event.target.value)}
                />
              </Field>
              <Button primary onClick={updateSelectedBlock}>
                Update block
              </Button>
            </div>
          ) : (
            <p className="subtitle">
              Select a simple text block from the outline.
            </p>
          )}
        </SidebarSection>
      </aside>
      <section className="page">
        <div className="page-header">
          <div>
            <h1 className="title">
              {pageRead?.page?.title || "Page Workbench"}
            </h1>
            <p className="subtitle">
              Read page content, select block IDs visually, edit simple blocks,
              or append Markdown.
            </p>
          </div>
          <Status error={error} message={status} />
        </div>
        <Tabs
          value={view}
          tabs={[
            {
              value: "read",
              label: `Read (${pageRead?.content?.block_count || 0})`,
            },
            { value: "edit", label: "Edit block", disabled: !selected },
            { value: "append", label: "Append" },
          ]}
          onChange={setView}
        />
        {view === "read" && (
          <ReadView
            blocks={blocks}
            markdown={markdownMode ? pageRead?.content?.markdown : undefined}
            selected={selected}
            onSelect={selectBlock}
          />
        )}
        {view === "edit" && selected && (
          <div className="max-w-xl">
            <h2 className="section-label">Selected block</h2>
            <p className="meta mb-3">{selected.id}</p>
            <Field label="Type">
              <select
                className="input"
                value={blockType}
                onChange={(event) => setBlockType(event.target.value)}
              >
                {editableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Text">
              <textarea
                className="textarea"
                value={blockText}
                onChange={(event) => setBlockText(event.target.value)}
              />
            </Field>
            <Button primary onClick={updateSelectedBlock}>
              Update block
            </Button>
          </div>
        )}
        {view === "append" && (
          <div className="max-w-2xl">
            <Field label="Markdown">
              <textarea
                className="textarea min-h-48"
                placeholder={"# Heading\n\n- Item"}
                value={appendMarkdownText}
                onChange={(event) => setAppendMarkdownText(event.target.value)}
              />
            </Field>
            <Button primary onClick={appendMarkdown}>
              Append Markdown
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

function ReadView({
  blocks,
  markdown,
  selected,
  onSelect,
}: {
  blocks: BlockNode[];
  markdown?: string;
  selected: BlockNode | null;
  onSelect: (block: BlockNode) => void;
}) {
  if (markdown) {
    return (
      <pre className="whitespace-pre-wrap leading-relaxed">{markdown}</pre>
    );
  }
  if (!blocks.length) {
    return (
      <EmptyState>Read a Notion page to inspect its block outline.</EmptyState>
    );
  }
  return (
    <div className="list">
      {blocks.map((block) => (
        <BlockItem
          block={block}
          depth={0}
          key={block.id}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function BlockItem({
  block,
  depth,
  selected,
  onSelect,
}: {
  block: BlockNode;
  depth: number;
  selected: BlockNode | null;
  onSelect: (block: BlockNode) => void;
}) {
  return (
    <div>
      <button
        className={`item item-hover w-full cursor-pointer text-left ${
          selected?.id === block.id ? "bg-[#edeae4]" : ""
        }`}
        style={{ paddingLeft: `${4 + Math.min(depth * 16, 64)}px` }}
        type="button"
        onClick={() => onSelect(block)}
      >
        <div className="row">
          <Pill>{block.type}</Pill>
          <span className="meta">{block.id}</span>
        </div>
        <div className="overflow-anywhere leading-relaxed">
          {block.text || block.markdown || ""}
        </div>
      </button>
      {block.children?.map((child) => (
        <BlockItem
          block={child}
          depth={depth + 1}
          key={child.id}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function parsePageRead(value: unknown): PageRead {
  const record = toRecord(value);
  const page = toRecord(record.page);
  const content = toRecord(record.content);

  return {
    page:
      typeof page.id === "string" && typeof page.title === "string"
        ? { id: page.id, title: page.title }
        : undefined,
    content: {
      block_count:
        typeof content.block_count === "number"
          ? content.block_count
          : undefined,
      outline: Array.isArray(content.outline)
        ? content.outline.filter(isBlockNode)
        : undefined,
      markdown:
        typeof content.markdown === "string" ? content.markdown : undefined,
    },
  };
}

function isBlockNode(value: unknown): value is BlockNode {
  const record = toRecord(value);
  return (
    typeof record.id === "string" &&
    typeof record.type === "string" &&
    (record.text === undefined || typeof record.text === "string") &&
    (record.markdown === undefined || typeof record.markdown === "string") &&
    (record.children === undefined ||
      (Array.isArray(record.children) && record.children.every(isBlockNode)))
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
