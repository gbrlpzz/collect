import * as fs from "node:fs";
import * as crypto from "node:crypto";
import { loadEnv, type HtmlTagDescriptor } from "vite";
import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";

declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
}
declare module "node:crypto" {
  export function createHash(algo: string): {
    update(data: Uint8Array): { digest(enc: "hex"): string };
  };
}

const SOCIAL_TITLE = "Offline Field Data Collection App — collect";
const SOCIAL_DESCRIPTION =
  "Offline-first field data collection for research teams. Capture observations, photos, audio, and GPS with no signal, then sync and export FAIR datasets.";

function previewImageHash(): string {
  try {
    const data = fs.readFileSync("public/collect-preview.png");
    return crypto.createHash("sha256").update(data).digest("hex").slice(0, 8);
  } catch {
    return "v1";
  }
}

/**
 * Emits crawler-readable social metadata and structured data at build time.
 * VITE_APP_URL produces absolute URLs in deployments; local builds retain a
 * valid root image URL and omit origin-dependent tags.
 */
function socialMetadata(appUrl: string | undefined): Plugin {
  const origin = appUrl?.trim().replace(/\/+$/, "");
  const version = previewImageHash();
  const image = origin
    ? `${origin}/collect-preview.png?v=${version}`
    : `/collect-preview.png?v=${version}`;
  const tags: HtmlTagDescriptor[] = [
    { tag: "meta", attrs: { property: "og:type", content: "website" } },
    { tag: "meta", attrs: { property: "og:site_name", content: "collect" } },
    { tag: "meta", attrs: { property: "og:locale", content: "en_US" } },
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
    { tag: "meta", attrs: { property: "og:image:type", content: "image/png" } },
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

  const homepageJsonLd = (): HtmlTagDescriptor[] => {
    if (!origin) return [];
    const graph = [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: "collect",
        description: SOCIAL_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "collect",
        url: `${origin}/`,
        logo: { "@type": "ImageObject", url: `${origin}/icon-512.png` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: "collect",
        url: `${origin}/`,
        description: SOCIAL_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        image,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [
          "Offline-first field capture",
          "Resumable synchronization",
          "Immutable published schemas",
          "FAIR checkpoint exports",
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${origin}/#webpage`,
        url: `${origin}/`,
        name: SOCIAL_TITLE,
        description: SOCIAL_DESCRIPTION,
        isPartOf: { "@id": `${origin}/#website` },
        about: { "@id": `${origin}/#software` },
      },
    ];
    return [
      {
        tag: "script",
        attrs: { type: "application/ld+json" },
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      },
    ];
  };

  const robotsIndex = {
    tag: "meta",
    attrs: {
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1",
    },
  };
  const robotsNoindex = {
    tag: "meta",
    attrs: { name: "robots", content: "noindex, nofollow" },
  };
  return {
    name: "collect-social-metadata",
    transformIndexHtml: {
      order: "pre",
      handler: (_html, ctx) =>
        ctx.filename.endsWith("index.html")
          ? [...tags, robotsIndex, ...homepageJsonLd()]
          : [...tags, robotsNoindex],
    },
    generateBundle() {
      if (!origin) return;
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url><loc>${origin}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n` +
          `</urlset>\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source:
          `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /app/*\n\n` +
          `Sitemap: ${origin}/sitemap.xml\n`,
      });
    },
  };
}

/**
 * Emits /precache-manifest.json with every hashed build asset so the service
 * worker can precache the exact production shell (app.html + JS/CSS/icons).
 * The homepage entry (index.html + its chunks) is a separate surface and
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
      const manifest = ["/app.html", ...new Set(urls)].sort();
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
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const appUrl = env.VITE_APP_URL || process.env.VITE_APP_URL;

  // A production deploy built without Supabase coordinates silently ships
  // the demo adapter, which marks observations "synced" with no server
  // behind them. Refuse that build on hosting platforms (Vercel, Netlify,
  // Cloudflare Pages); local demo builds and CI verification without
  // environment variables stay possible.
  if (
    mode === "production" &&
    (process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES)
  ) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
    if (!supabaseKey) {
      missing.push("VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY)");
    }
    if (missing.length > 0) {
      throw new Error(
        `Refusing production build: missing ${missing.join(", ")}. ` +
          "An unconfigured build would ship the demo adapter and mark " +
          'observations "synced" with no server behind them.',
      );
    }
  }
  return {
    plugins: [react(), socialMetadata(appUrl), precacheManifest()],
    build: {
      target: "es2020",
      rollupOptions: {
        input: {
          // The app shell (app.html, served at /app) and the marketing
          // homepage (index.html, served at /) share one bundle; the homepage
          // imports the app's real components so frontend changes mirror into
          // its live demo. Relative inputs resolve from the project root — no
          // node imports.
          app: "app.html",
          homepage: "index.html",
        },
      },
    },
    test: {
      globals: true,
      setupFiles: ["tests/setup.ts"],
    },
  };
});
