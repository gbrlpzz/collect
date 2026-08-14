import { useState } from "react";
import { Icon } from "../components/Icon";
import { DocLinks } from "./DocLinks";

type SyncStepKey = "saved" | "probe" | "media" | "synced" | "conflict";

interface SyncStep {
  key: SyncStepKey;
  stepNumber: string;
  stateCode: string;
  title: string;
  subtitle: string;
  description: string;
  invariant: string;
  codeHeading: string;
  code: string;
}

const SYNC_STEPS: SyncStep[] = [
  {
    key: "saved",
    stepNumber: "1",
    stateCode: "SAVED_LOCAL",
    title: "Local IndexedDB Commit",
    subtitle: "Durable receipt on-device before any network attempt",
    description:
      "Structured payload, non-fingerprinting device telemetry, and original media blobs write directly to the account-scoped IndexedDB ledger. An outbox operation is queued.",
    invariant:
      "Zero network traffic required · Survives power loss and browser restarts",
    codeHeading: "IndexedDB: collect-local-v1-usr_8f2a / outbox",
    code: `{
  "id": "obs-4f2a9c-val-023",
  "project_id": "valpuesta-fieldwork",
  "status": "SAVED_LOCAL",
  "client_created_at": "2026-08-14T09:32:00.102Z",
  "payload": {
    "site_code": "VA-023",
    "building_type": "house",
    "building_occupancy": "yes"
  },
  "media_blobs": [
    { "id": "med-01", "sha256": "8f4e2c…", "byte_size": 2490368 }
  ],
  "outbox_operation": {
    "key": "submit:obs-4f2a9c-val-023",
    "attempts": 0,
    "next_attempt_at": "2026-08-14T09:32:00.110Z"
  }
}`,
  },
  {
    key: "probe",
    stepNumber: "2",
    stateCode: "PROBE_AND_LEASE",
    title: "Reachability & Mutex Election",
    subtitle: "Active /health probe and cross-tab single-flight lease",
    description:
      "Ignores navigator.onLine (which misreports captive portals and zero-byte links) and sends an active GET /health probe. Acquires a cross-tab mutex lease via Web Locks and BroadcastChannel so background tabs never race.",
    invariant:
      "Single-flight worker guarantee · Deceptive browser online signals ignored",
    codeHeading: "Sync Engine: Health Probe & Mutex Lease",
    code: `// 1. Active Reachability Probe (timeout: 4000ms)
GET https://lrqlrufwrytpwhgclmyo.supabase.co/functions/v1/health
HTTP/1.1 200 OK
Content-Type: application/json
{ "status": "ok", "time": "2026-08-14T09:32:00.312Z" }

// 2. Cross-Tab Mutex Lease Acquired
{
  "lease_id": "lease-9a2f-tab-1",
  "owner_tab_id": "tab-c7d2-4401",
  "acquired_at": "2026-08-14T09:32:00.320Z",
  "ttl_ms": 30000,
  "queue_depth": 1
}`,
  },
  {
    key: "media",
    stepNumber: "3",
    stateCode: "SYNCING_MEDIA",
    title: "Resumable TUS Chunk Upload",
    subtitle: "Pre-flight HEAD check and SHA-256 verified streaming",
    description:
      "Sends a HEAD request to skip already-uploaded files. Transfers missing chunks over open-standard TUS protocol with chunk offset tracking and SHA-256 checksum verification. Never recompresses or downsamples originals.",
    invariant:
      "Byte-for-byte uncompressed originals · Interrupted transfers resume where they stopped",
    codeHeading: "TUS Protocol: Resumable Chunked Transfer",
    code: `// Pre-flight HEAD Check
HEAD /storage/v1/object/collect-media/valpuesta/med-01.jpg HTTP/1.1
HTTP/1.1 404 Not Found (Upload required)

// Resumable Chunked Transfer
PATCH /storage/v1/upload/resumable/9a2f… HTTP/1.1
Tus-Resumable: 1.0.0
Upload-Offset: 1572864
Content-Type: application/offset+octet-stream
Content-Length: 917504
X-SHA256-Checksum: 8f4e2c918a3e0b20dc823297a7e80112…

HTTP/1.1 204 No Content
Upload-Offset: 2490368
Tus-Resumable: 1.0.0`,
  },
  {
    key: "synced",
    stepNumber: "4",
    stateCode: "FINALIZING → SYNCED",
    title: "Atomic Server Finalization",
    subtitle: "Durable signed receipt flips local record to SYNCED",
    description:
      "POST /sync-submission verifies granted contributor consent, matches SHA-256 media hashes, commits observation to PostgreSQL, and returns a durable receipt naming the exact submission ID.",
    invariant:
      "SYNCED is a verified server receipt · Never a client-side guess",
    codeHeading: "Signed Finalization Receipt: POST /sync-submission",
    code: `POST /functions/v1/sync-submission HTTP/1.1
Authorization: Bearer <authenticated-session>
Content-Type: application/json

HTTP/1.1 200 OK
Content-Type: application/json
{
  "submission_id": "obs-4f2a9c-val-023",
  "project_id": "valpuesta-fieldwork",
  "schema_version": 1,
  "received_at": "2026-08-14T09:32:01.204Z",
  "finalized_at": "2026-08-14T09:32:02.118Z",
  "media_attached": 1,
  "status": "COMPLETE",
  "receipt_signature": "sig_ed25519_9f81a2…"
}`,
  },
  {
    key: "conflict",
    stepNumber: "!",
    stateCode: "ACTION_REQUIRED",
    title: "Conflict & Error Isolation",
    subtitle: "Permanent failures isolate without stalling the outbox queue",
    description:
      "If a submission encounters a 4xx permanent error (such as revoked consent or an archived project), the engine flags it as ACTION_REQUIRED and removes it from the active queue so remaining observations continue syncing uninterrupted.",
    invariant:
      "Unsynced data is preserved on-device · Recovery export remains available",
    codeHeading: "Isolated Record State: ACTION_REQUIRED",
    code: `HTTP/1.1 403 Forbidden
{
  "error": "consent_revoked",
  "message": "Contributor consent was revoked on 2026-08-12."
}

// Engine isolates the record locally:
{
  "submission_id": "obs-4f2a9c-val-023",
  "status": "ACTION_REQUIRED",
  "action_reason": "consent_revoked",
  "isolated_from_queue": true,
  "local_export_available": true
}`,
  },
];

export function SyncDemo() {
  const [activeKey, setActiveKey] = useState<SyncStepKey>("saved");
  const activeStep =
    SYNC_STEPS.find((step) => step.key === activeKey) ?? SYNC_STEPS[0];

  return (
    <div className="hp-sync-section-inner">
      <div className="section-heading">
        <p className="eyebrow">Synchronization</p>
        <h2 id="sync-title">Deterministic sync state machine.</h2>
        <p>
          Submissions transition through verifiable states. Records commit
          locally before network dispatch, chunked media uploads resume across
          drops, and local records mark synced only upon signed server receipt.
        </p>
        <DocLinks
          docs={[
            {
              file: "background-automation.md",
              label: "Background automation",
            },
            { file: "architecture.md", label: "Sync architecture" },
          ]}
        />
      </div>

      <div className="hp-sync-explorer">
        {/* Left: Step navigation selector */}
        <div
          className="hp-sync-nav"
          role="tablist"
          aria-label="Sync state machine steps"
        >
          {SYNC_STEPS.map((step) => {
            const isActive = step.key === activeKey;
            const isConflict = step.key === "conflict";
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                key={step.key}
                className={`hp-sync-nav-btn ${isActive ? "hp-sync-nav-btn-active" : ""} ${isConflict ? "hp-sync-nav-btn-conflict" : ""}`}
                onClick={() => setActiveKey(step.key)}
              >
                <span
                  className={`hp-sync-step-badge ${isConflict ? "badge-conflict" : ""}`}
                >
                  {step.stepNumber}
                </span>
                <div className="hp-sync-nav-text">
                  <div className="hp-sync-nav-top">
                    <strong>{step.title}</strong>
                    <span className="hp-sync-nav-code">{step.stateCode}</span>
                  </div>
                  <p>{step.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: State detail & live code inspection */}
        <div className="hp-sync-detail-pane">
          <div className="hp-sync-detail-header">
            <div className="hp-sync-detail-title-group">
              <span className="hp-sync-state-pill">{activeStep.stateCode}</span>
              <h3>{activeStep.title}</h3>
            </div>
            <span className="hp-sync-invariant-badge">
              <Icon name="shield" size={14} />
              {activeStep.invariant}
            </span>
          </div>

          <p className="hp-sync-detail-desc">{activeStep.description}</p>

          <div className="hp-sync-code-box">
            <div className="hp-sync-code-header">
              <span>{activeStep.codeHeading}</span>
            </div>
            <pre className="hp-sync-code">
              <code>{activeStep.code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* 4 Core Architectural Safeguards from docs/background-automation.md */}
      <div className="hp-sync-safeguards-grid">
        <div className="hp-sync-safeguard-card">
          <div className="hp-sync-safeguard-header">
            <Icon name="signal" size={16} />
            <strong>Active /health Probing</strong>
          </div>
          <p>
            Bypasses deceptive <code>navigator.onLine</code> events by probing
            the server health endpoint with exponential backoff and jitter.
          </p>
        </div>

        <div className="hp-sync-safeguard-card">
          <div className="hp-sync-safeguard-header">
            <Icon name="lock" size={16} />
            <strong>Single-Flight Mutex Lease</strong>
          </div>
          <p>
            Cross-tab lock election via Web Locks ensures only one worker
            processes uploads at a time, preventing duplicate queue runs.
          </p>
        </div>

        <div className="hp-sync-safeguard-card">
          <div className="hp-sync-safeguard-header">
            <Icon name="cloud" size={16} />
            <strong>Resumable TUS Streaming</strong>
          </div>
          <p>
            Media transfers in verified binary chunks with SHA-256 checksums,
            resuming seamlessly without re-uploading completed chunks.
          </p>
        </div>

        <div className="hp-sync-safeguard-card">
          <div className="hp-sync-safeguard-header">
            <Icon name="shield" size={16} />
            <strong>Fault & Conflict Isolation</strong>
          </div>
          <p>
            Permanent 4xx errors isolate into <code>ACTION_REQUIRED</code>{" "}
            without blocking the outbox queue or stalling remaining fieldwork.
          </p>
        </div>
      </div>
    </div>
  );
}
