import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// base "./" keeps the build working both on GitHub Pages (under /<repo>/) and when opened from a folder.
export default defineConfig({
  base: "./",
  plugins: [preact()],
});
