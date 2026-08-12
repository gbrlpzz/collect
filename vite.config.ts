import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Emits /precache-manifest.json with every hashed build asset so the service
 * worker can precache the exact production shell (index.html + JS/CSS/icons).
 */
function precacheManifest(): Plugin {
  return {
    name: "collect-precache-manifest",
    apply: "build",
    generateBundle(_options, bundle) {
      const urls = Object.values(bundle)
        .filter(
          (item) =>
            item.type === "chunk" ||
            (item.type === "asset" && item.fileName.endsWith(".css")) ||
            (item.type === "asset" && item.fileName.endsWith(".js")),
        )
        .map((item) => `/${item.fileName}`);
      const manifest = ["/index.html", ...new Set(urls)].sort();
      this.emitFile({
        type: "asset",
        fileName: "precache-manifest.json",
        source: JSON.stringify(manifest),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), precacheManifest()],
  build: {
    target: "es2020",
  },
  test: {
    globals: true,
    setupFiles: ["tests/setup.ts"],
  },
});
