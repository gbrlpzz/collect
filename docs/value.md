# Product value and fit

`collect` is offline-first infrastructure for field evidence. It is built for research and operations teams where lost, delayed, or corrupted observations have high costs.

---

## Core problem

Field operations frequently encounter unreliable mobile connectivity. Conventional web forms fail in several predictable ways:

| Failure mode                 | Risk in conventional forms                   | Solution in `collect`                                                     |
| :--------------------------- | :------------------------------------------- | :------------------------------------------------------------------------ |
| **Network dependency**       | Work entered offline is lost or delayed.     | Complete local capture, storage, and outbox in IndexedDB.                 |
| **Premature "Saved" status** | UI indicates success before durable storage. | **Saved on this device** displays only after atomic local commit.         |
| **Transient retry queues**   | Closing the browser clears pending uploads.  | Durable outbox survives restarts and browser closes.                      |
| **Schema mutation**          | Schema edits distort historical data.        | Published schema versions are immutable.                                  |
| **Orphaned media**           | Form rows upload while media files fail.     | Server validates media completeness before finalization.                  |
| **Incomplete exports**       | Exports lack schema history and provenance.  | Self-contained checkpoints include JSONL, schemas, and DataCite metadata. |

---

## The evidence contract

```mermaid
flowchart TD
  accTitle: Evidence Contract Comparison
  accDescr: Visual comparison contrasting conventional online web forms with the collect offline-first evidence contract.

  subgraph FragilePath["❌ Conventional Web Forms (Fragile Data Path)"]
    direction TB
    C1["User Enters Data in Browser"] --> C2{"Network Reachable?"}
    C2 -->|No| C3["Data Trapped in Volatile Memory<br/>(Lost on close, crash, or tab eviction)"]
    C2 -->|Yes| C4["POST Request Initiated<br/>(Optimistic 'Saving...' UI)"]
    C4 --> C5["Partial Upload Failure<br/>(Rows saved, media files orphaned)"]
    C5 --> C6["Schema Edited Later<br/>(Historical observations distorted)"]
  end

  subgraph CollectPath["✅ Collect Architecture (Evidence Contract)"]
    direction TB
    K1["User Enters Field Data (Offline / Online)"] --> K2["Atomic Commit to Scoped IndexedDB<br/>• Observation payload<br/>• Raw media blobs<br/>• Outbox queue entry"]
    K2 --> K3["Local Receipt: <b>Saved on this device</b><br/>(Durable across restarts and crashes)"]
    K3 --> K4["Single-Flight Sync Engine<br/>• GET /health reachability probe<br/>• TUS resumable media chunks<br/>• Atomic finalization POST"]
    K4 --> K5["Server Receipt: <b>Synced</b><br/>(Immutable database record + receipt token)"]
    K5 --> K6["FAIR Checkpoint Archive<br/>(Self-contained package with DataCite metadata)"]
  end
```

### 1. Saved means locally durable

The client commits the observation payload, media references, blobs, and outbox tasks to IndexedDB in a single transaction before displaying **Saved on this device**.

### 2. Synced means server-finalized

The client updates status to `SYNCED` only after the server finalizes metadata, verifies media completeness, and returns a matching signed receipt.

### 3. Preserved interpretation

Published schema versions are immutable. Every observation permanently references the exact schema version active when captured.

### 4. Portable FAIR exports

Checkpoints contain canonical JSONL, CSV, GeoJSON, raw original media, schema definitions, and DataCite 4.4 metadata. Data remains understandable without proprietary software.

---

## Target use cases

| Team type                                | Primary benefits                                                                                 |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Ecological & biodiversity monitoring** | Long offline transects, automated location provenance, original photos, repository-ready exports |
| **Infrastructure & building surveys**    | Multi-contributor field teams, typed schema enforcement, account isolation on shared devices     |
| **Humanitarian & disaster assessment**   | Poor connectivity resilience, local recovery export, clear sync status                           |
| **Citizen-science research**             | Simple guided mobile interface, invite-only access, centralized data curation                    |
| **Academic & institutional research**    | DataCite kernel metadata, SPDX licensing, FAIR compliance, self-hosted privacy                   |

---

## When to choose a different tool

`collect` is intentionally focused. A general-purpose survey tool or spreadsheet is a better fit for:

- Complex nested conditional branching with hundreds of question types.
- Direct spreadsheet table editing by field contributors.
- Real-time collaborative document editing.
- Unstructured, un-schemaed note taking.

---

## Key implementation references

| System layer                  | Implementation file                                    |
| :---------------------------- | :----------------------------------------------------- |
| **Local database primitives** | `src/lib/localDatabase.ts`                             |
| **Ledger, media, and outbox** | `src/lib/localStore.ts`                                |
| **Local submission boundary** | `src/app/submission.ts`                                |
| **Sync engine & protocol**    | `src/app/syncController.ts`, `src/lib/syncProtocol.ts` |
| **Ingestion Edge Function**   | `supabase/functions/sync-submission/index.ts`          |
| **Export Edge Function**      | `supabase/functions/export-checkpoint/index.ts`        |
| **Security migrations & RLS** | `supabase/migrations/`                                 |

---

## Related documentation

- [User and system flows](flows.md)
- [Architecture](architecture.md)
- [Privacy and data handling](privacy.md)
- [Background automation](background-automation.md)
- [Checkpoint export format](export-format.md)
