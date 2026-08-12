#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const FUNCTIONS = [
  "health",
  "claim-invites",
  "device-status",
  "send-project-invite",
  "send-project-ping",
  "export-checkpoint",
  "sync-submission",
  "bootstrap-workspace",
];

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`collect provisioning

Required environment:
  SUPABASE_ACCESS_TOKEN       Supabase Management API / CLI token
  SUPABASE_PROJECT_REF        Supabase project ref
  APP_URL                     canonical deployed app origin
  BOOTSTRAP_ADMIN_EMAIL       first administrator email

Optional environment:
  SUPABASE_DB_PASSWORD        database password, if the CLI requests it
  SUPABASE_REDIRECT_URLS      comma-separated additional Auth redirect URLs
  VITE_SUPABASE_PUBLISHABLE_KEY (required with --issue-magic-link)
  VITE_SUPABASE_ANON_KEY      legacy fallback for the publishable key
  SUPABASE_CLI_COMMAND        CLI executable; defaults to supabase

Usage:
  npm run provision
  npm run provision -- --issue-magic-link

The optional flag requests one magic link for BOOTSTRAP_ADMIN_EMAIL after
provisioning. The token is never printed or stored by this script.`);
  process.exit(0);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Run with --help for the provisioning inputs.`);
  }
  return value;
}

function normalizeAppUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`APP_URL must be a valid URL: ${value}`);
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("APP_URL must use HTTPS outside localhost development.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("APP_URL must be the app origin without a path, query, or hash.");
  }

  return url.origin;
}

function emailLooksValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function runSupabase(cli, cliArgs, env) {
  const result = spawnSync(cli, cliArgs, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    throw new Error(
      `Supabase CLI not found. Install it from https://supabase.com/docs/guides/cli or set SUPABASE_CLI_COMMAND.`,
    );
  }

  if (result.status !== 0) {
    throw new Error(`Supabase CLI failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function updateAuthConfig({ projectRef, accessToken, appUrl, redirectUrls }) {
  const baseBody = {
    site_url: appUrl,
    uri_allow_list: redirectUrls.join(","),
    // Custom email templates require a paid plan (or a custom SMTP provider);
    // free-tier projects reject them with HTTP 400. Keep them optional so
    // provisioning still configures the URLs that make magic links work.
    mailer_subjects_magic_link: "Your collect sign-in link",
    mailer_templates_magic_link_content:
      '<h2>Sign in to collect</h2><p>Use the link below to open your fieldwork workspace. This link expires shortly and can only be used once.</p><p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Open collect</a></p><p>If you did not request this, you can ignore this email.</p>',
  };

  async function patch(body) {
    return fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  let response = await patch(baseBody);
  if (response.status === 400 && /template|smtp|provider/i.test(await response.text())) {
    // Free tier: retry without the custom mailer template.
    const { mailer_subjects_magic_link, mailer_templates_magic_link_content, ...urlsOnly } = baseBody;
    console.warn("Free tier: custom magic-link email template not applied (requires a paid plan or custom SMTP). URLs configured only.");
    response = await patch(urlsOnly);
  }

  if (!response.ok) {
    throw new Error(`Supabase Auth configuration failed with HTTP ${response.status}.`);
  }
}

async function issueMagicLink({ projectRef, publishableKey, appUrl, email }) {
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  const response = await fetch(`${supabaseUrl}/auth/v1/otp?redirect_to=${encodeURIComponent(appUrl)}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Magic-link request failed with HTTP ${response.status}.`);
  }
}

async function main() {
  const accessToken = required("SUPABASE_ACCESS_TOKEN");
  const projectRef = required("SUPABASE_PROJECT_REF");
  const appUrl = normalizeAppUrl(required("APP_URL"));
  const adminEmail = required("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();

  if (!emailLooksValid(adminEmail)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
  }

  const redirectUrls = [appUrl];
  const extraRedirectUrls = process.env.SUPABASE_REDIRECT_URLS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (extraRedirectUrls) {
    redirectUrls.push(...extraRedirectUrls);
  }

  const cli = process.env.SUPABASE_CLI_COMMAND?.trim() || "supabase";
  const cliEnv = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: accessToken,
  };

  console.log(`Configuring Supabase Auth for ${appUrl}…`);
  await updateAuthConfig({ projectRef, accessToken, appUrl, redirectUrls });
  console.log("Auth URL, redirect allow-list, and magic-link template configured.");

  console.log("Linking the local Supabase directory to the target project…");
  runSupabase(cli, ["link", "--project-ref", projectRef], cliEnv);

  const dbPushArgs = ["db", "push", "--linked", "--yes"];
  console.log("Applying ordered database migrations…");
  runSupabase(cli, dbPushArgs, cliEnv);

  console.log("Setting server-side bootstrap configuration…");
  runSupabase(
    cli,
    [
      "secrets",
      "set",
      "--project-ref",
      projectRef,
      `APP_URL=${appUrl}`,
      `BOOTSTRAP_ADMIN_EMAIL=${adminEmail}`,
    ],
    cliEnv,
  );

  for (const functionName of FUNCTIONS) {
    console.log(`Deploying Edge Function ${functionName}…`);
    runSupabase(cli, ["functions", "deploy", functionName, "--project-ref", projectRef], cliEnv);
  }

  if (args.has("--issue-magic-link")) {
    const publishableKey =
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!publishableKey) {
      throw new Error("--issue-magic-link requires VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).");
    }

    console.log(`Requesting a magic link for ${adminEmail}…`);
    await issueMagicLink({ projectRef, publishableKey, appUrl, email: adminEmail });
    console.log("Magic link requested. Check the inbox for the newest message; the token was not printed or stored.");
  }

  console.log(`Provisioning complete. App: ${appUrl}`);
}

main().catch((error) => {
  console.error(`Provisioning stopped: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
