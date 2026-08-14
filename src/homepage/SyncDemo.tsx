import { DocLinks } from "./DocLinks";

export function SyncDemo() {
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
      </div>

      <div className="hp-flow-visual">
        <div className="hp-sync-pipeline" aria-label="Sync pipeline stages">
          <div className="hp-sync-stage">
            <span className="hp-sync-stage-index">1</span>
            <div>
              <strong>Saved locally</strong>
              <p className="hp-sync-state-code">SAVED_LOCAL</p>
              <p>
                Payload, media blobs, and outbox entry commit to device storage.
              </p>
            </div>
          </div>

          <div className="hp-sync-stage">
            <span className="hp-sync-stage-index">2</span>
            <div>
              <strong>Syncing</strong>
              <p className="hp-sync-state-code">
                SYNCING_METADATA → SYNCING_MEDIA
              </p>
              <p>
                Active /health probe, cross-tab lock, and resumable TUS upload.
              </p>
            </div>
          </div>

          <div className="hp-sync-stage">
            <span className="hp-sync-stage-index">3</span>
            <div>
              <strong>Finalized & Synced</strong>
              <p className="hp-sync-state-code">FINALIZING → SYNCED</p>
              <p>
                Server writes to database and issues signed finalization
                receipt.
              </p>
            </div>
          </div>

          <div className="hp-sync-receipt">
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
