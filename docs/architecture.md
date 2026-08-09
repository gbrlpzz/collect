# collect architecture notes

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

## What the browser cannot promise

The browser cannot guarantee survival after physical device destruction, manual site-data clearing, or browser removal. Persistent storage is requested and quota is monitored, but it remains under browser control. The contributor recovery ZIP is the explicit escape hatch for unsynced data.
