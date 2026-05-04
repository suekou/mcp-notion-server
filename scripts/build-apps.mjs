import react from "@vitejs/plugin-react";
import { rmSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const outDir = "build/apps/assets";
const apps = [
  {
    name: "data-source-explorer",
    input: "src/apps/ui/data-source-explorer/index.html",
  },
  { name: "page-workbench", input: "src/apps/ui/page-workbench/index.html" },
];

rmSync(outDir, { recursive: true, force: true });

for (const app of apps) {
  await build({
    plugins: [react(), viteSingleFile()],
    build: {
      outDir,
      emptyOutDir: false,
      rollupOptions: {
        input: { [app.name]: resolve(app.input) },
      },
    },
  });
  renameSync(
    resolve(outDir, app.input),
    resolve(outDir, `${app.name}.html`),
  );
}

rmSync(resolve(outDir, "src"), { recursive: true, force: true });
