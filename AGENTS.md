# Agent guidance for collect

`collect` is infrastructure for trustworthy field evidence, not a generic form builder. The interface should be calm and legible, and the data path should remain dependable when the network, browser lifecycle, or device storage is hostile. Authorized contributors complete an explicit, versioned consent step. The application automates routine provenance and transfer, keeps healthy technical detail quiet, and surfaces a problem only when a person can act on it.

## Product principles

- Preserve fieldwork. A saved local submission and its media must not be intentionally discarded before an explicit server finalization receipt.
- Keep the collection path free of AI transformation. Capture what the contributor entered or observed; downstream systems may analyze exports later.
- Prefer small, typed, portable data structures over clever UI abstractions.
- Keep published schemas immutable. Historical observations must retain their schema version.
- Treat `SYNCED` as a server fact, never a request-started or upload-completed guess.
- Never use `navigator.onLine` as proof of reachability.
- Never silently overwrite conflicts, finalized observations, media originals, or unsynced local records.
- Keep the contributor surface almost boring: few controls, clear text states, strong touch targets, and native browser semantics. Location and device provenance remain background context; the configured Quick check appears as one ordinary guided-flow step and is explained in Profile.
- On iOS, an installed PWA is a separate storage container from Safari: sessions and local data never cross containers. The server is the shared source of truth; passwords and device-link codes bridge sign-in.
- Treat the software keyboard as part of the mobile viewport. Keep the primary action reachable, do not autofocus empty optional fields, and never require keyboard dismissal before Skip or Continue.

## Required invariants when changing code

1. `Submit` must commit the structured payload, submission metadata, media metadata/blobs, and outbox operations before showing **Saved on this device**.
2. Submission and media IDs are generated before network work and remain stable across retries and restarts.
3. Synchronization remains metadata → each media object → finalization → durable receipt.
4. RLS and server-side authorization remain the source of truth. Never trust client role state or user metadata for access control.
5. Service-role credentials stay inside Edge Functions.
6. Recovery export must remain available for unsynced data.
7. Local migrations must be forward-compatible and must never initialize a blank database over existing data.
8. Accounts are invite-only: the generic sign-in screen must never create accounts, and administrator invitations honor the allow-list (env secret or `private.allowed_admin_patterns`).
9. Collection consent is enforced server-side: `sync-submission` rejects submissions from profiles without a granted (and not revoked) consent.
10. The attention check is provenance, not research data: its question never enters the payload or the database (only a stable check key, the selected value, and the binary `attention_failed` flag), and its answer must be stripped from submitted values before commit.
11. Every account reads and writes its own IndexedDB database (`collect-local-v1-<userId>`); set the local scope before any local read and never let cached data leak across accounts.
12. Location and environment provenance are captured automatically whenever the platform allows; a failed optional capture must never block the durable local receipt.

## Interface baseline

Follow `docs/design.md` and the official Apple Human Interface Guidelines links there. Prefer system typography, native controls, semantic hierarchy, neutral surfaces, comfortable touch targets, visible text states, reduced motion, and progressive disclosure. Commands use the shared capsule/circle system; floating material is reserved for mobile commands and navigation, never research content. The contributor surface uses a light monochrome identity and the administrator surface uses its dark inverse. Do not add dashboards, gradients, decorative cards, custom display faces, or settings that do not help the field operation.

## Safe workflow

- Read `README.md`, `docs/architecture.md`, and the relevant code before editing.
- Preserve unrelated user changes and coordinate on shared files (`src/App.tsx`, `src/app/useAppController.ts`, `src/lib/localStore.ts`) when other agents work in the same tree.
- For database changes, add an ordered migration (a new file with a new timestamp) and apply/test it against a Supabase project; never re-apply an edited migration under the same name (it is skipped and the live DB silently drifts). Do not patch production with ad hoc SQL only.
- For Edge Functions, authenticate with the shared helper and return explicit, non-sensitive errors. Use try/catch around `service.from(...)` chains — `.catch()` is not available on the filter builder.
- Do not log research payloads, free text, coordinates, media URLs, or credentials.
- Run `npm run check` (format + tests + typecheck + build) and `git diff --check` before publishing.
- Verify the deployed app from the login gate through the affected flow. A green build is not proof that sync or authorization works.
- Keep deployment notes honest: distinguish local receipts, server receipts, and what an offline device has not yet reported.
