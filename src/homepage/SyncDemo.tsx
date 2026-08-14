import { DocLinks } from "./DocLinks";

const SYNC_STEPS = [
  {
    title: "Saved locally",
    code: "SAVED_LOCAL",
    body: "Payload, media blobs, and the outbox entry commit to device storage before any network work.",
  },
  {
    title: "Syncing",
    code: "SYNCING_METADATA → SYNCING_MEDIA",
    body: "An active /health probe, cross-tab lock, and resumable TUS upload carry the record across flaky links.",
  },
  {
    title: "Finalized & Synced",
    code: "FINALIZING → SYNCED",
    body: "The server writes to the database and issues a signed finalization receipt.",
  },
] as const;

export function SyncDemo({ active }: { active: number }) {
  const step = SYNC_STEPS[active];

  return (
    <div className="hp-flow-layout">
      <div className="hp-flow-copy">
        <div className="section-heading">
          <p className="eyebrow">Synchronization</p>
          <h2 id="sync-title">
            Sync that survives dead zones, captive portals, and battery drops.
          </h2>
          <p>
            Flaky cellular links shouldn't jeopardize weeks of fieldwork.
            Submissions commit to device storage first, media transfers resume
            in chunks, and records mark synced only upon signed server receipt.
          </p>
          <DocLinks files={["background-automation.md", "architecture.md"]} />
        </div>

        <div className="hp-story" aria-live="polite">
          <h3>{step.title}</h3>
          <p className="hp-sync-state-code">{step.code}</p>
          <p>{step.body}</p>
        </div>
      </div>

      <div className="hp-flow-visual">
        <div className="hp-sync-pipeline" aria-label="Sync pipeline stages">
          {SYNC_STEPS.map((s, i) => (
            <div
              key={s.code}
              className="hp-sync-stage"
              data-active={active === i}
            >
              <span className="hp-sync-stage-index">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <p className="hp-sync-state-code">{s.code}</p>
              </div>
            </div>
          ))}

          <div className="hp-sync-receipt" data-active={active === 2}>
            <span className="hp-sync-receipt-label">
              Durable Server Receipt
            </span>
            <pre>
              <code>{`{
  "submission_id": "obs-4f2a9c",
  "received_at": "2026-08-14T09:32:01.204Z",
  "finalized_at": "2026-08-14T09:32:02.118Z",
  "status": "COMPLETE"
}`}</code>
            </pre>
            <p>
              A record marks <code>SYNCED</code> only when the server receipt
              confirms the exact submission ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
