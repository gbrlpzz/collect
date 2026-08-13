#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ROOT_DOCUMENTS = ["README.md", "CONTRIBUTING.md", "AGENTS.md"];

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return extname(entry.name) === ".md" ? [path] : [];
  });
}

const documents = [
  ...ROOT_DOCUMENTS.map((path) => resolve(ROOT, path)).filter(existsSync),
  ...markdownFiles(resolve(ROOT, "docs")),
];
const failures = [];
const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;

for (const document of documents) {
  const source = readFileSync(document, "utf8");
  for (const match of source.matchAll(markdownLink)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^(?:https?:|mailto:|data:)/i.test(rawTarget)
    ) {
      continue;
    }

    const pathTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
    const absoluteTarget = resolve(dirname(document), pathTarget);
    if (!existsSync(absoluteTarget)) {
      failures.push(
        `${document.slice(ROOT.length + 1)} → ${rawTarget} (missing)`,
      );
      continue;
    }

    if (pathTarget.endsWith("/") && !statSync(absoluteTarget).isDirectory()) {
      failures.push(
        `${document.slice(ROOT.length + 1)} → ${rawTarget} (not a directory)`,
      );
    }
  }
}

if (failures.length) {
  console.error("Documentation link check failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Checked relative links in ${documents.length} Markdown files.`);
}
