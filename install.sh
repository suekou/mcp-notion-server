#!/usr/bin/env bash
set -euo pipefail

# install.sh — Quick install for mcp-notion-server
#
# Usage:
#   ./install.sh                  # interactive — prompts for token
#   NOTION_API_TOKEN=ntn_xxx ./install.sh   # non-interactive

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== mcp-notion-server installer ==="
echo ""

# ── 1. Check prerequisites ──────────────────────────────────────────────────
for cmd in node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is not installed. Please install Node.js (>=18) first."
    exit 1
  fi
done

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js >= 18 required (found v$(node -v))."
  exit 1
fi

echo "Node.js $(node -v) detected."

# ── 2. Install dependencies & build ─────────────────────────────────────────
echo ""
echo "Installing dependencies..."
cd "$REPO_DIR"
npm install --no-audit --no-fund 2>&1 | tail -1

echo "Building..."
npm run build 2>&1 | tail -1
echo "Build complete: $REPO_DIR/build/index.js"

# ── 3. Notion API token ─────────────────────────────────────────────────────
if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo ""
  echo "To connect to Notion you need an integration token."
  echo "Create one at: https://www.notion.so/profile/integrations"
  echo ""
  read -rp "Paste your NOTION_API_TOKEN (or press Enter to skip): " NOTION_API_TOKEN
fi

if [ -z "${NOTION_API_TOKEN:-}" ]; then
  echo ""
  echo "No token provided. You can set it later via the NOTION_API_TOKEN env var."
fi

# ── 4. Print config snippet ─────────────────────────────────────────────────
ENTRY="$REPO_DIR/build/index.js"

echo ""
echo "=== Done! ==="
echo ""
echo "Add this to your claude_desktop_config.json (or MCP client config):"
echo ""
cat <<JSONEOF
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["$ENTRY"],
      "env": {
        "NOTION_API_TOKEN": "${NOTION_API_TOKEN:-YOUR_TOKEN_HERE}",
        "NOTION_MARKDOWN_CONVERSION": "true"
      }
    }
  }
}
JSONEOF

echo ""
echo "Or run directly:"
echo ""
echo "  NOTION_API_TOKEN=${NOTION_API_TOKEN:-YOUR_TOKEN_HERE} node $ENTRY"
echo ""

# ── 5. Optional: run tests ──────────────────────────────────────────────────
read -rp "Run tests to verify the install? [y/N] " RUN_TESTS
if [[ "${RUN_TESTS:-n}" =~ ^[Yy]$ ]]; then
  npm test
fi

echo ""
echo "Installation complete."
