# Agent guidance for collect

`collect` is infrastructure for trustworthy field evidence, not a generic form builder. It belongs to a well-designed, source-available science stack: the interface should be calm and legible, and the data path should remain dependable when the network, browser lifecycle, or device storage is hostile.

## Product principles

- Preserve fieldwork. A saved local submission and its media must not be intentionally discarded before an explicit server finalization receipt.
- Keep the collection path free of AI transformation. Capture what the contributor entered or observed; downstream systems may analyze exports later.
- Prefer small, typed, portable data structures over clever UI abstractions.
- Keep published schemas immutable. Historical observations must retain their schema version.
- Treat `SYNCED` as a server fact, never a request-started or upload-completed guess.
- Never use `navigator.onLine` as proof of reachability.
- Never silently overwrite conflicts, finalized observations, media originals, or unsynced local records.
- Keep the contributor surface almost boring: few controls, clear text states, strong touch targets, native browser semantics.

## Required invariants when changing code

1. `Submit` must commit the structured payload, submission metadata, media metadata/blobs, and outbox operations before showing **Saved on this device**.
2. Submission and media IDs are generated before network work and remain stable across retries and restarts.
3. Synchronization remains metadata → each media object → finalization → durable receipt.
4. RLS and server-side authorization remain the source of truth. Never trust client role state or user metadata for access control.
5. Service-role credentials stay inside Edge Functions.
6. Recovery export must remain available for unsynced data.
7. Local migrations must be forward-compatible and must never initialize a blank database over existing data.

## UI baseline

Follow `docs/design.md` and the official Apple Human Interface Guidelines links there. Prefer system typography, native controls, semantic hierarchy, neutral surfaces, comfortable touch targets, visible text states, reduced motion, and progressive disclosure. Do not add dashboards, gradients, decorative cards, or settings that do not help the field operation.

## Safe workflow

- Read `README.md`, `docs/architecture.md`, and the relevant code before editing.
- Preserve unrelated user changes.
- For database changes, add an ordered migration and apply/test it against a Supabase project; do not patch production with ad hoc SQL only.
- For Edge Functions, authenticate with the shared helper and return explicit, non-sensitive errors.
- Do not log research payloads, free text, coordinates, media URLs, or credentials.
- Run `npm test`, `npm run build`, and `git diff --check` before publishing.
- Verify the deployed app from the login gate through the affected flow. A green build is not proof that sync or authorization works.
- Keep deployment notes honest: distinguish local receipts, server receipts, and what an offline device has not yet reported.
