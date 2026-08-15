import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PUBLIC = new URL("../public/", import.meta.url);

function luminance(hex: string) {
  const channels = hex
    .match(/[a-f\d]{2}/gi)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("installable surface identity", () => {
  it("keeps the monochrome contributor controls legible", () => {
    expect(contrast("#000000", "#ffffff")).toBeGreaterThanOrEqual(7);
    expect(contrast("#000000", "#f5f5f7")).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ["manifest.webmanifest", "#f5f5f7", "icon"],
    ["manifest-admin.webmanifest", "#000000", "icon-admin"],
  ])("ships a complete %s icon set", (filename, theme, stem) => {
    // SAFETY: parsed manifest file matches webmanifest structure.
    const manifest = JSON.parse(
      readFileSync(new URL(filename, PUBLIC), "utf8"),
    ) as {
      theme_color: string;
      icons: Array<{ src: string; sizes: string }>;
    };

    expect(manifest.theme_color).toBe(theme);
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
      "any",
      "192x192",
      "512x512",
    ]);
    for (const icon of manifest.icons) {
      expect(existsSync(new URL(icon.src.slice(1), PUBLIC))).toBe(true);
    }
    expect(existsSync(new URL(`${stem}.svg`, PUBLIC))).toBe(true);
  });

  it("ships separate iOS Home Screen artwork for each surface", () => {
    expect(existsSync(new URL("apple-touch-icon.png", PUBLIC))).toBe(true);
    expect(existsSync(new URL("apple-touch-icon-admin.png", PUBLIC))).toBe(
      true,
    );
  });
});
