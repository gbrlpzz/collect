import { loadEnv, type HtmlTagDescriptor } from "vite";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

const SOCIAL_TITLE = "collect — fieldwork, ready offline";
const SOCIAL_DESCRIPTION =
  "Offline-first field data collection with durable local receipts, resumable synchronization, and portable research exports.";

/**
 * Emits crawler-readable social metadata at build time. VITE_APP_URL produces
 * an absolute image URL in deployments; local builds retain a valid root URL.
 */
function socialMetadata(appUrl: string | undefined): Plugin {
  const origin = appUrl?.trim().replace(/\/+$/, "");
  const image = origin
    ? `${origin}/collect-preview.png`
    : "/collect-preview.png";
  const tags: HtmlTagDescriptor[] = [
    { tag: "meta", attrs: { property: "og:type", content: "website" } },
    { tag: "meta", attrs: { property: "og:site_name", content: "collect" } },
    { tag: "meta", attrs: { property: "og:title", content: SOCIAL_TITLE } },
    {
      tag: "meta",
      attrs: { property: "og:description", content: SOCIAL_DESCRIPTION },
    },
    { tag: "meta", attrs: { property: "og:image", content: image } },
    {
      tag: "meta",
      attrs: {
        property: "og:image:alt",
        content:
          "Collect administrator form editor and contributor attention-check interfaces",
      },
    },
    { tag: "meta", attrs: { property: "og:image:width", content: "2400" } },
    { tag: "meta", attrs: { property: "og:image:height", content: "1260" } },
    {
      tag: "meta",
      attrs: { name: "twitter:card", content: "summary_large_image" },
    },
    { tag: "meta", attrs: { name: "twitter:title", content: SOCIAL_TITLE } },
    {
      tag: "meta",
      attrs: { name: "twitter:description", content: SOCIAL_DESCRIPTION },
    },
    { tag: "meta", attrs: { name: "twitter:image", content: image } },
  ];
  if (origin) {
    tags.push(
      { tag: "meta", attrs: { property: "og:url", content: origin } },
      { tag: "link", attrs: { rel: "canonical", href: origin } },
    );
  }
  return {
    name: "collect-social-metadata",
    transformIndexHtml: { order: "pre", handler: () => tags },
  };
}

/**
 * Emits /precache-manifest.json with every hashed build asset so the service
 * worker can precache the exact production shell (index.html + JS/CSS/icons).
 * The homepage entry (homepage.html + its chunks) is a separate surface and
 * is deliberately excluded from the app shell's precache.
 */
function precacheManifest(): Plugin {
  return {
    name: "collect-precache-manifest",
    apply: "build",
    generateBundle(_options, bundle) {
      const urls = Object.values(bundle)
        .filter((item) => {
          if (
            item.type !== "chunk" &&
            !(
              item.type === "asset" &&
              (item.fileName.endsWith(".css") || item.fileName.endsWith(".js"))
            )
          )
            return false;
          return !item.fileName.includes("homepage");
        })
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react(), socialMetadata(env.VITE_APP_URL), precacheManifest()],
    build: {
      target: "es2020",
      rollupOptions: {
        input: {
          // The app shell (index.html) and the marketing homepage
          // (homepage.html) share one bundle; the homepage imports the app's
          // real components so frontend changes mirror into its live demo.
          // Relative inputs resolve from the project root — no node imports.
          app: "index.html",
          homepage: "homepage.html",
        },
      },
    },
    test: {
      globals: true,
      setupFiles: ["tests/setup.ts"],
    },
  };
});
