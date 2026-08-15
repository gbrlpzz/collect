#!/usr/bin/env node
/**
 * check-regola-headers.mjs
 *
 * CI guard for the vendored Regola design-system snapshot at src/regola.
 * Every vendored source file (.ts/.tsx/.css) must carry a provenance header
 * identifying it as a snapshot of the private @gbrlpzz/regola upstream,
 * licensed Apache-2.0 as part of collect. This keeps the open/closed split
 * honest: cloners of this public repo get a self-contained, clearly-labeled
 * design system with no private dependencies.
 *
 * Run via: npm run check:regola
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(import.meta.url), "..", "..");
const vendorDir = join(repoRoot, "src", "regola");
const MARKER = "Vendored snapshot from @gbrlpzz/regola";
const CHECKED_EXTS = new Set([".ts", ".tsx", ".css"]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (CHECKED_EXTS.has(extname(full))) out.push(full);
  }
  return out;
}

if (!statSync(vendorDir, { optional: true })) {
  console.error(
    `[check-regola-headers] ERROR: ${vendorDir} not found. Run regola-sync first.`,
  );
  process.exit(1);
}

const files = walk(vendorDir);
const missing = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  if (!text.includes(MARKER)) missing.push(f.replace(repoRoot + "/", ""));
}

if (missing.length) {
  console.error(
    "[check-regola-headers] FAIL: files missing Regola provenance header:",
  );
  for (const f of missing) console.error("  - " + f);
  console.error(
    "\nFix: run `regola-sync` from the regola repo, or restore the header:",
  );
  console.error(
    "  // Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).",
  );
  process.exit(1);
}

console.log(
  `[check-regola-headers] OK: ${files.length} vendored files carry the Regola provenance header.`,
);
