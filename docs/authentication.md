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
shows an empty project list, and the app stays usable offline.

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
  same list.

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

1. **Google.** Create an OAuth client (type: web) in Google Cloud. Add the
   authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`
   and the app origin as an authorized JavaScript origin. Keep the client ID
   and secret.
2. **Apple.** In the Apple Developer account, create an App ID with Sign in
   with Apple, a Services ID (this is the client ID), a private key (`.p8`)
   for Sign in with Apple, and note the Team ID and Key ID. Register the
   return URL `https://<project-ref>.supabase.co/auth/v1/callback` and the
   app domain. Apple does not accept `localhost`.
3. **Apply the configuration.**

   ```bash
   export SUPABASE_ACCESS_TOKEN=...      # Supabase Management API token
   export SUPABASE_PROJECT_REF=...
   export APP_URL=https://collect-tawny.vercel.app
   export BOOTSTRAP_ADMIN_EMAIL=you@example.org
   export SUPABASE_AUTH_GOOGLE_CLIENT_ID=... SUPABASE_AUTH_GOOGLE_SECRET=...
   export SUPABASE_AUTH_APPLE_CLIENT_ID=... SUPABASE_AUTH_APPLE_SECRET=...
   npm run provision -- --auth-only
   ```

   `--auth-only` changes the authentication configuration and nothing else.
   A provider is enabled only when both of its values are present, so
   re-running the script never disables one by accident.

4. **Optional: move the remaining auth emails to Resend.** Set `SMTP_HOST`,
   `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_SENDER_EMAIL` before
   running the script. Sign-in links and confirmations then leave through the
   project's own mail provider instead of the shared built-in mailer.

The Apple client secret is a JWT built from the Team ID, Key ID, Services ID,
and the `.p8` key. Supabase accepts the `.p8` contents in the dashboard and
computes it; when configuring through the Management API, supply the
generated JWT as `SUPABASE_AUTH_APPLE_SECRET`.

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
