import { DocLinks } from "./DocLinks";
import { useScrollFocus } from "./useScrollFocus";

const SYNC_STEPS = [
  {
    kicker: "Stage 1 · Commit",
    title: "Saved locally",
    code: "SAVED_LOCAL",
    body: "Payload, media blobs, and the outbox entry commit to device storage before any network work.",
  },
  {
    kicker: "Stage 2 · Transfer",
    title: "Syncing",
    code: "SYNCING_METADATA → SYNCING_MEDIA",
    body: "An active /health probe, cross-tab lock, and resumable TUS upload carry the record across flaky links.",
  },
  {
    kicker: "Stage 3 · Receipt",
    title: "Finalized & Synced",
    code: "FINALIZING → SYNCED",
    body: "The server writes to the database and issues a signed finalization receipt.",
  },
] as const;

export function SyncDemo() {
  const { ref, active, activate } = useScrollFocus<HTMLDivElement>(".hp-step");

  return (
    <div className="hp-flow-layout" ref={ref}>
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

        {SYNC_STEPS.map((s, i) => (
          <div
            key={s.code}
            className="hp-step"
            data-active={active === i}
            aria-current={active === i ? "step" : undefined}
            role="button"
            tabIndex={0}
            onClick={() => activate(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate(i);
              }
            }}
          >
            <p className="hp-step-kicker">{s.kicker}</p>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      <div className="hp-flow-visual">
        <div className="hp-sync-pipeline" aria-label="Sync pipeline stages">
          {SYNC_STEPS.map((s, i) => (
            <button
              key={s.code}
              type="button"
              className="hp-sync-stage hp-sync-stage-btn"
              data-active={active === i}
              aria-pressed={active === i}
              onClick={() => activate(i)}
            >
              <span className="hp-sync-stage-index">{i + 1}</span>
              <span className="hp-sync-stage-body">
                <strong>{s.title}</strong>
                <span className="hp-sync-state-code">{s.code}</span>
              </span>
            </button>
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
