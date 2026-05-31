import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built assets load from a relative path, so it works
// whether served from a domain root or a GitHub Pages subpath.
export default defineConfig({
  plugins: [react()],
  base: "./",
  // Build straight into ../docs so GitHub Pages can serve it from the
  // master branch /docs folder — no CI runner required.
  build: { outDir: "../docs", emptyOutDir: true },
});
