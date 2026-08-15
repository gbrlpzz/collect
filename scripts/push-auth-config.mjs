#!/usr/bin/env node
// Push supabase/config.toml's auth section to the linked project.
//
// Two things make the plain `supabase config push` awkward here:
//
// 1. A provider whose credentials are missing from the environment is pushed
//    with the literal "env(...)" placeholder, which silently breaks sign-in.
//    This script refuses to push in that case.
// 2. On the free plan with the built-in mailer, Supabase rejects custom email
//    templates and fails the whole request. When that happens, this script
//    retries once with the template blocks removed, so the rest of the
//    configuration still lands. The templates apply as soon as the project
//    has custom SMTP or a paid plan.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const configPath = resolve(import.meta.dirname, "../supabase/config.toml");
const original = readFileSync(configPath, "utf8");

const providerVariables = {
  google: ["SUPABASE_AUTH_GOOGLE_CLIENT_ID", "SUPABASE_AUTH_GOOGLE_SECRET"],
  apple: ["SUPABASE_AUTH_APPLE_CLIENT_ID", "SUPABASE_AUTH_APPLE_SECRET"],
};

for (const [provider, variables] of Object.entries(providerVariables)) {
  const section = original.split(`[auth.external.${provider}]`)[1] ?? "";
  const enabled = /^\s*enabled\s*=\s*true/m.test(section.split("\n[")[0]);
  if (!enabled) continue;
  const missing = variables.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    console.error(
      `${provider} is enabled in config.toml but ${missing.join(" and ")} ` +
        `${missing.length > 1 ? "are" : "is"} not set. Export the credentials ` +
        `before pushing, or the placeholder would be published as the value.`,
    );
    process.exit(1);
  }
}

function push() {
  return spawnSync("supabase", ["config", "push", "--yes"], {
    cwd: resolve(import.meta.dirname, ".."),
    encoding: "utf8",
  });
}

let result = push();
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
if (result.status !== 0 && /Email template modification/i.test(output)) {
  console.warn(
    "This project cannot accept custom email templates yet (free plan with the built-in mailer). Pushing everything else.",
  );
  const templateStart = original.indexOf("[auth.email.template.");
  if (templateStart === -1) {
    console.error(output);
    process.exit(1);
  }
  try {
    writeFileSync(
      configPath,
      `${original.slice(0, templateStart).trimEnd()}\n`,
    );
    result = push();
  } finally {
    writeFileSync(configPath, original);
  }
}

process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
process.exit(result.status ?? 1);
