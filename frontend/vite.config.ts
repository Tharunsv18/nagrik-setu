import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), sites()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
