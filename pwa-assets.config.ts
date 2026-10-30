import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates the PNG app icons from public/icon.svg during the build.
export default defineConfig({
  preset: minimal2023Preset,
  images: ["public/icon.svg"],
});
