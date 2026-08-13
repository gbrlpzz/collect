#!/usr/bin/env node
// Bundle an edge function into a single index.ts by inlining ../_shared modules.
// The Supabase Management API deploy path flattens file trees, so shared modules
// must be inlined. Canonical source keeps ../_shared imports for supabase CLI
// deploys; this script produces the MCP/REST deploy artifact.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const functionsRoot = resolve(import.meta.dirname, "../supabase/functions");
const outRoot = resolve(import.meta.dirname, "../.deploy");
const sharedImportRe =
  /import \{[^}]*\} from "\.\.\/_shared\/([a-zA-Z0-9_./-]+)";/g;
const leftoverSharedRe = /import .* from "\.\.\/_shared\/[^"]+";/g;
const stripImportsRe = /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+"[^"]*"\s*;/gs;

function bundle(fn) {
  let index = readFileSync(join(functionsRoot, fn, "index.ts"), "utf8");
  const sharedTexts = {};
  index = index.replace(sharedImportRe, (_m, name) => {
    sharedTexts[name] = readFileSync(
      join(functionsRoot, "_shared", name),
      "utf8",
    );
    return `/* __SHARED_${name}__ */`;
  });
  index = index.replace(leftoverSharedRe, "");

  const head = index.split("/* __SHARED_")[0];
  const preamble = [];
  const auth = sharedTexts["auth.ts"] ?? "";
  if (auth.includes("createClient") && !head.includes("createClient"))
    preamble.push(
      'import { createClient } from "npm:@supabase/supabase-js@2";',
    );
  if (auth.includes("User") && !head.includes("User"))
    preamble.push('import type { User } from "npm:@supabase/supabase-js@2";');
  if (auth.includes("SupabaseClient") && !head.includes("SupabaseClient"))
    preamble.push(
      'import type { SupabaseClient } from "npm:@supabase/supabase-js@2";',
    );

  for (const [name, text] of Object.entries(sharedTexts)) {
    const cleaned = text.replace(stripImportsRe, "").trim();
    index = index.replace(`/* __SHARED_${name}__ */`, cleaned);
  }
  return [...preamble, index].join("\n");
}

const fns = process.argv.slice(2);
if (!fns.length)
  throw new Error("usage: node bundle-functions.mjs <function>...");
mkdirSync(outRoot, { recursive: true });
for (const fn of fns) {
  const out = bundle(fn);
  const target = join(outRoot, `${fn}.ts`);
  writeFileSync(target, out);
  console.log(`bundled ${fn} -> ${target}`);
}
