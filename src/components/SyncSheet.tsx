import type { Observation } from "../types";
import { Icon } from "./Icon";
import { Button, Divider, IconButton, StatusBadge } from "./Primitives";

interface SyncSheetProps {
  observations: Observation[];
  lastSyncAt: string | null;
  isSyncing: boolean;
  onClose: () => void;
  onSync: () => void;
  onRecoveryExport: () => void;
}

export function SyncSheet({ observations, lastSyncAt, isSyncing, onClose, onSync, onRecoveryExport }: SyncSheetProps) {
  const pending = observations.filter((item) => item.status !== "SYNCED");
  const hasPending = pending.length > 0;

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="sync-sheet-title">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <span className="sheet-kicker">Project sync</span>
            <h2 id="sync-sheet-title">Your fieldwork is safe here.</h2>
          </div>
          <IconButton label="Close sync status" icon="x" onClick={onClose} />
        </div>

        <div className={`sync-hero ${hasPending ? "sync-hero-pending" : "sync-hero-complete"}`}>
          <div className="sync-hero-icon"><Icon name={hasPending ? "cloud" : "check"} size={24} /></div>
          <div><strong>{hasPending ? `${pending.length} observation${pending.length === 1 ? "" : "s"} waiting` : "Everything is synced"}</strong><span>{hasPending ? "Saved on this device. Waiting for a usable connection." : "The server has acknowledged every complete submission."}</span></div>
        </div>

        {hasPending && (
          <div className="sync-operation-list">
            {pending.slice(0, 4).map((observation, index) => (
              <div className="sync-operation-row" key={observation.id}>
                <span className="operation-number">{index + 1}</span>
                <div><strong>{String(observation.values.site_code ?? "New observation")}</strong><span>Structured data · media queued</span></div>
                <span className="operation-status">{observation.status === "ACTION_REQUIRED" ? "Needs attention" : observation.status === "RETRYABLE_ERROR" ? "Will retry" : "Queued"}</span>
              </div>
            ))}
          </div>
        )}

        <Divider />
        <div className="sync-facts">
          <div><span>Last successful sync</span><strong>{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Not yet on this device"}</strong></div>
          <div><span>Storage</span><strong>Protected locally</strong></div>
        </div>

        <Button variant="primary" fullWidth icon="refresh" onClick={onSync} disabled={isSyncing || !hasPending}>
          {isSyncing ? "Syncing…" : hasPending ? "Sync now" : "Up to date"}
        </Button>
        <button className="recovery-button" onClick={onRecoveryExport}><Icon name="download" size={15} /> Export unsynced recovery package</button>
        <p className="sheet-footnote">A recovery package contains locally saved records and their media if the hosted service cannot be reached.</p>
      </section>
    </div>
  );
}
