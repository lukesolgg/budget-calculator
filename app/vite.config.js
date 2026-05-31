import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the built assets load from a relative path, so it works
// whether served from a domain root or a GitHub Pages subpath.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
