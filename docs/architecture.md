# collect architecture notes

## Code boundaries

The client is organized by responsibility rather than by the order in which
features were added:

- `src/App.tsx` is the composition shell. It renders surfaces and wires their
  callbacks; it does not own persistence or sync protocol details.
- `src/app/useAppController.ts` owns session, workspace, and UI orchestration.
  The local submission boundary, recovery export, storage persistence request,
  and sync engine live in their own modules under `src/app/`.
- `src/components/` contains feature surfaces. Shared controls and feedback
  primitives live under `src/components/ui/` and are exposed from its index.
- `src/data/` contains demo fixtures; `src/lib/schema.ts` contains schema
  editing rules. Fixtures do not own editor behavior.
- `src/styles.css` is only the stylesheet entrypoint. The ordered layers in
  `src/styles/` are foundation, native interaction language, and final
  responsive geometry.

The boundary is intentional: new features should add a domain module or a
feature component without growing the application shell or app-wide CSS
override chain.

## Local receipt boundary

The contributor-facing promise is implemented around one boundary:

```text
form change → draft in IndexedDB
submit      → submission + media + outbox in one transaction
receipt     → “Saved on this device”
sync        → metadata → media → finalization → server receipt
```

The no-credentials build uses an explicit local demo adapter for the last line. With Supabase configured, the adapter runs the real metadata → TUS media → finalization protocol without exposing backend calls in view components.

## Stable identity

Every submission and media record gets a UUID before network work begins. Future remote object paths should be deterministic:

```text
projects/{project_id}/submissions/{submission_id}/{media_id}
```

The server must enforce unique IDs and reject same-ID/different-content conflicts rather than overwriting evidence.

## Schema history

Published schema versions are immutable. Observations carry the schema version used at collection time. Future schema edits must clone a draft and publish a new version; historical records must never be silently reinterpreted.

## Backend contract

The Supabase migration enables RLS on every exposed table. Contributor authorization is derived from `organization_members` and `project_members`, never from client-controlled metadata. Published schemas are immutable through a database trigger. The ingestion Edge Function rejects same-ID/different-content requests and preserves observations collected after a remote project close with an explicit provenance flag.

The storage protocol is:

```text
create_submission → confirm/upload each deterministic object path → finalize_submission
```

The client preflights media acknowledgement so an interruption after a completed TUS upload does not create a second object. Finalization verifies the expected media count and every media row before returning the durable receipt.

## Web vs installed app storage (iOS)

On iOS, an installed PWA runs in its own storage container: Safari and the
home-screen app do **not** share cookies, localStorage, or IndexedDB. The
same is true for the service worker cache. Android and desktop Chrome share
storage with the browser, so this section only matters on iOS.

Consequences and behavior:

- A session created in Safari is invisible to the installed app, and vice
  versa. Each container keeps its own persisted session after its own
  sign-in; there is no cross-container storage API on iOS.
- Local drafts, media, and the outbox are per-container. The **server is the
  shared source of truth**: once submissions sync, every container sees the
  same cloud data, and idempotent client IDs make duplication impossible.
- Sign-in bridges the containers through the mailbox: the magic link and the
  six-digit email code both work from any container. The code is recommended
  inside an installed app because it does not depend on where the email link
  opens.
- `isStandalonePwa()` (src/lib/supabaseClient.ts) lets the UI adapt copy and
  offer the code path when running installed.

## What the browser cannot promise

The browser cannot guarantee survival after physical device destruction, manual site-data clearing, or browser removal. Persistent storage is requested and quota is monitored, but it remains under browser control. The contributor recovery ZIP is the explicit escape hatch for unsynced data.
