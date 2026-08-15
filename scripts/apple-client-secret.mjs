#!/usr/bin/env node
// Build the "Sign in with Apple" client secret.
//
// Apple does not issue a static secret. The secret is a short-lived ES256 JWT
// signed with the private key (.p8) of a Sign in with Apple key. It expires
// after at most six months, so this script is run again before each expiry
// and the new value is applied with `npm run provision -- --auth-only`.
//
// Usage:
//   node scripts/apple-client-secret.mjs \
//     --team-id ABCDE12345 \
//     --key-id FGHIJ67890 \
//     --services-id org.example.collect.web \
//     --key ./AuthKey_FGHIJ67890.p8 \
//     [--months 6]
//
// The private key is never printed, stored, or sent anywhere by this script.
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import process from "node:process";

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** DER ECDSA signature (r,s as INTEGERs) to the fixed 64-byte JOSE form. */
function derToJose(signature) {
  let offset = 2;
  if (signature[1] & 0x80) offset += signature[1] & 0x7f;
  const readInteger = () => {
    offset += 1; // 0x02 tag
    const length = signature[offset];
    offset += 1;
    let value = signature.subarray(offset, offset + length);
    offset += length;
    while (value.length > 32) value = value.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - value.length), value]);
  };
  return Buffer.concat([readInteger(), readInteger()]);
}

const teamId = argument("team-id");
const keyId = argument("key-id");
const servicesId = argument("services-id");
const keyPath = argument("key");
const months = Number(argument("months") ?? 6);

if (!teamId || !keyId || !servicesId || !keyPath) {
  console.error(
    "Usage: node scripts/apple-client-secret.mjs --team-id <id> --key-id <id> --services-id <id> --key <AuthKey.p8> [--months 6]",
  );
  process.exit(1);
}
if (!(months > 0 && months <= 6)) {
  console.error("Apple refuses a secret valid for more than six months.");
  process.exit(1);
}

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + Math.round(months * 30 * 24 * 60 * 60);
const header = base64url(
  JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }),
);
const payload = base64url(
  JSON.stringify({
    iss: teamId,
    iat: issuedAt,
    exp: expiresAt,
    aud: "https://appleid.apple.com",
    sub: servicesId,
  }),
);

const signer = createSign("SHA256");
signer.update(`${header}.${payload}`);
signer.end();
const signature = derToJose(
  signer.sign({ key: readFileSync(keyPath, "utf8"), dsaEncoding: "der" }),
);

console.log(`${header}.${payload}.${base64url(signature)}`);
console.error(
  `Valid until ${new Date(expiresAt * 1000).toISOString()}. Set it as SUPABASE_AUTH_APPLE_SECRET and run: npm run provision -- --auth-only`,
);
