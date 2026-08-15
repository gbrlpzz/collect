# Authentication

collect admits people through identity providers first, and keeps every
earlier method as a backup. The goal is simple: admitting a contributor must
never depend on an email quota, and email must stay the identifier that
memberships, invitations, and the administrator allow-list are keyed on.

---

## Who can sign in

| Question                         | Answer                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Who may create an account?       | Anyone. A first Google or Apple sign-in creates the account.                                                     |
| What does a new account see?     | Nothing. Projects appear only where a membership exists.                                                         |
| How does a person get a project? | An administrator invites the email address, or adds it to a project. The membership is granted at first sign-in. |
| Who becomes an administrator?    | Only an address on the administrator allow-list.                                                                 |
| What identifies an account?      | The email address. Providers, links, codes, and passwords all resolve to the same address.                       |

An account with no membership is not an error state. The contributor surface
says **No assigned project**, and the app stays usable offline. Such an
account is not asked to accept the collection consent either: there is
nothing to collect yet. The server still refuses any submission from an
account without a granted consent.

---

## Sign-in methods

| Method               | Sends email?          | Who uses it                                                                 |
| -------------------- | --------------------- | --------------------------------------------------------------------------- |
| Continue with Google | No                    | Anyone. First choice.                                                       |
| Continue with Apple  | No                    | Anyone. First choice on Apple devices.                                      |
| Email sign-in link   | Yes (provider mailer) | People with an account and no provider.                                     |
| Email and password   | No                    | Any device, after a password is set.                                        |
| 8-character code     | Yes, through Resend   | Administrator-issued, self-service, or moving a session between containers. |

The screen shows only the methods this deployment offers. It asks the
deployment which providers are enabled (`/auth/v1/settings`), so turning
Google or Apple on needs no front-end release.

The email link path never creates an account (`shouldCreateUser: false`). A
stranger therefore cannot spend the mail allowance from the sign-in screen.

---

## Invitations

An invitation is a plain email. It carries no credential and no token:

1. The administrator invites an email address to a project (or as an
   administrator).
2. The server records the invitation and sends a short message through
   Resend. The message names the project and links to the sign-in screen.
3. The person signs in with any method, using that address.
4. `claim-invites` turns the pending invitation into a membership, and the
   project appears.

Nothing in this path uses the authentication provider's mailer, so
invitations never compete with its allowance.

If the invited address has no account and no provider, the sign-in screen can
still let them in: **Request a new code by email** creates the account for an
invited address only, and sends an 8-character code through Resend.

---

## Administrator rights

Administrator rights follow the allow-list, never the sign-in method.

- The list lives in `private.allowed_admin_patterns` (rows) or in the
  `ALLOWED_EMAIL_PATTERNS` secret, which takes precedence. An entry is an
  exact address (`person@example.org`) or a domain suffix (`@example.org`).
- `claim-invites` grants organization administrator rights at sign-in to an
  allow-listed address with a verified email.
- Inviting an administrator adds the address to the list and sends the plain
  invitation email. When the list is still empty, the inviting
  administrator's own address is added too, so nobody is locked out.
- A deployment with an empty list grants nobody. Open contributor sign-up can
  never turn into an unexpected administrator.
- `bootstrap-workspace` (first workspace on an empty deployment) applies the
  same list. The `BOOTSTRAP_ADMIN_EMAIL` secret, when set, is an explicit
  override: only that address may create the first workspace.
- Rate limiting for sign-in codes and sign-in links is keyed on the IP the
  platform gateway reports (the last `x-forwarded-for` hop), which the client
  cannot forge by prepending entries.

---

## What the client does

- One module tree, `src/lib/auth/`: `config` (coordinates and the single
  return URL), `client` (the Supabase client), `session` (sign-in returns and
  callback errors), `providers` (Google and Apple), `email` (link and
  password), `codes` (device-link and administrator codes).
  `src/lib/supabaseClient.ts` re-exports them as the one import path.
- Provider sign-in uses the PKCE flow. The browser returns to the app entry
  URL with an authorization code, the client exchanges it for a session, and
  the address bar is cleaned immediately.
- An installed iOS app and Safari are separate storage containers. A provider
  sheet opens in the browser; if the session lands there instead of in the
  installed app, the person signs in once in the browser and moves the
  session with a device code. The sign-in screen says so in the installed
  app.

---

## Interface rules

The sign-in screen follows the Apple Human Interface Guidelines:

- [Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple):
  approved title (_Continue with Apple_), logo and title in one colour
  (black on the light contributor surface, white on the dark administrator
  surface), never smaller than the other sign-in buttons, and reachable
  without scrolling.
- [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts):
  every action names its authentication method, only available methods are
  offered, and a provider account is never asked to invent a password.
- [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons):
  44pt hit regions, one coherent set of equally sized primary choices, and a
  visible press state.

The Google button uses the unmodified four-colour mark.

---

## Setting it up

`supabase/config.toml` pins the session and credential posture explicitly
instead of inheriting platform defaults: passwords for the email backup path
require at least 10 characters, access tokens expire after one hour, refresh
tokens rotate on every use, and a rotated token stays valid for ten seconds
so two open tabs do not sign each other out. CAPTCHA stays off for a calm
first-run sign-in surface; a deployment that sees account or mail farming
should enable it (see `docs/deployment.md`) — open sign-up plus free
transactional email is the exposure. Apply configuration changes with the
auth push flow described in the deployment guide; never leave a provider
enabled without its credentials.

**Google (enabled on this deployment).** Create an OAuth client of type _Web
application_ in Google Cloud, then add exactly one authorized redirect URI:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

That is the only value the flow uses. The browser goes app → Supabase →
Google → back to that callback → back to the app, so Google never sees the
app's own address. Authorized JavaScript origins are unused here; adding the
served origins is harmless.

**Apple (prepared, off until its credentials exist).** In the Apple Developer
account create an App ID with Sign in with Apple, a Services ID (this is the
client ID), and a private key (`.p8`); note the Team ID and Key ID. Register
the domain `<project-ref>.supabase.co` and the same return URL. Apple does not
accept `localhost`.

Apple issues no static secret. Build it from the key:

```bash
node scripts/apple-client-secret.mjs \
  --team-id ABCDE12345 --key-id FGHIJ67890 \
  --services-id org.example.collect.web \
  --key ./AuthKey_FGHIJ67890.p8
```

The value is valid for at most six months; renewing it is a recurring task,
not a one-time step.

**Applying the configuration.** Two equivalent paths:

```bash
# With the Supabase CLI logged in and the project linked
export SUPABASE_AUTH_GOOGLE_CLIENT_ID=... SUPABASE_AUTH_GOOGLE_SECRET=...
node scripts/push-auth-config.mjs
```

```bash
# With a Management API token instead
export SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=...
export APP_URL=https://collect.gbrlpzz.com BOOTSTRAP_ADMIN_EMAIL=you@example.org
export SUPABASE_AUTH_GOOGLE_CLIENT_ID=... SUPABASE_AUTH_GOOGLE_SECRET=...
npm run provision -- --auth-only
```

`scripts/push-auth-config.mjs` publishes `supabase/config.toml` and refuses to
push a provider that is enabled without its credentials, because the CLI would
otherwise publish the literal placeholder. On a plan that rejects custom email
templates it retries without them. `--auth-only` changes the authentication
configuration and nothing else; a provider is enabled only when both of its
values are present, so re-running never disables one by accident.

**Optional: move the remaining auth emails to Resend.** Set `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_SENDER_EMAIL` before running
the provisioning script. Sign-in links and confirmations then leave through
the project's own mail provider instead of the shared built-in mailer.

---

## Several addresses, one deployment

The app answers on a canonical domain and on the platform address that still
hosts installed apps. Sign-in respects that:

- A sign-in returns to the origin the person is actually using. A session
  belongs to the origin that started it, so returning someone to the other
  address would leave them signed out where they were working.
- Both origins are on the Supabase redirect allow-list, with a path wildcard
  so the return reaches `/app`.
- Edge Functions echo the caller's origin when it is `APP_URL` or one of
  `APP_ALT_ORIGINS`; everything else is refused.
- Emails sent by the server (invitations, sign-in codes) always link to
  `APP_URL`, the canonical address.

---

## Notes

- Open sign-up means the public sign-up endpoint accepts email and password
  registrations. Those consume the mail allowance, so a deployment that
  expects abuse should configure custom SMTP (above) and may turn on the
  Supabase CAPTCHA protection.
- Apple can hide a real address behind a private relay
  (`@privaterelay.appleid.com`). That relay address becomes the account
  identifier. Invite the address a person actually signs in with, and expect
  a relay address in the roster.
- Nothing in this path changes what a submission carries. Authentication
  identifies the account; the payload stays exactly what the contributor
  entered.

---

## Related documentation

- [Architecture](architecture.md)
- [User and system flows](flows.md)
- [Deployment](deployment.md)
- [Privacy and data handling](privacy.md)
