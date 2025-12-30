import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Optional lovable-tagger (dev-only). Use sync require so the Vite config stays synchronous.
const require = createRequire(import.meta.url);
let componentTagger: null | (() => any) = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  componentTagger = require("lovable-tagger").componentTagger;
} catch {
  componentTagger = null;
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    jsxLocPlugin(),
    vitePluginManusRuntime(),
    mode === "development" && componentTagger ? componentTagger() : null,
  ].filter(Boolean),
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(__dirname),
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 8080,
    strictPort: false,
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
