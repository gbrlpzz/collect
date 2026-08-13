import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styleFiles = [
  "foundation.css",
  "native.css",
  "geometry.css",
  "device-link.css",
];
const styles = styleFiles
  .map((file) =>
    readFileSync(new URL(`../src/styles/${file}`, import.meta.url), "utf8"),
  )
  .join("\n");
const geometry = readFileSync(
  new URL("../src/styles/geometry.css", import.meta.url),
  "utf8",
);

function luminance(hex: string) {
  const channels = hex
    .match(/[a-f\d]{2}/gi)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("visual system contract", () => {
  it("defines every custom property that is used without a fallback", () => {
    const definitions = new Set(
      [...styles.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    );
    const missing = [
      ...new Set(
        [...styles.matchAll(/var\(\s*(--[\w-]+)(\s*,)?/g)]
          .filter((match) => !match[2] && !definitions.has(match[1]))
          .map((match) => match[1]),
      ),
    ].sort();

    expect(missing).toEqual([]);
  });

  it("keeps the shared touch, radius, type, and floating-material tokens", () => {
    expect(geometry).toContain("--control-height: 44px");
    expect(geometry).toContain("--control-radius: 999px");
    expect(geometry).toContain("--radius-small: 12px");
    expect(geometry).toContain("--radius-medium: 16px");
    expect(geometry).toContain("--group-radius: 20px");
    expect(geometry).toContain("--type-body: 1.0625rem");
    expect(geometry).toContain("--type-footnote: 0.8125rem");
    expect(geometry).toContain("--floating-shadow:");
  });

  it("keeps small semantic labels readable on every surface", () => {
    for (const background of ["#ffffff", "#f5f5f7"]) {
      expect(contrast("#636366", background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#707075", background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#aeaeb2", "#000000")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#8e8e93", "#000000")).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the compact admin tabs inside their segmented container", () => {
    expect(geometry).not.toMatch(
      /\.admin-tabs\s*\{[^}]*margin-(?:right|left):\s*calc\(-1/s,
    );
    expect(geometry).toMatch(
      /@media \(max-width: 680px\)[\s\S]*?\.admin-tabs\s*\{[^}]*width:\s*100%[^}]*padding:\s*var\(--space-1\)/,
    );
  });
});
