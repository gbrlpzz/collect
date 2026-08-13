import { useEffect, useState } from "react";

import type { Observation, SyncProgressEntry } from "../types";
import {
  estimateLocalStorage,
  getOutboxOperations,
  type OutboxOperation,
} from "../lib/localStore";
import { formatExactTime, formatRelativeTime } from "../lib/formatTime";
import { Icon } from "./Icon";
import { Button, IconButton, ModalSurface } from "./ui";

interface SyncSheetProps {
  observations: Observation[];
  lastSyncAt: string | null;
  isSyncing: boolean;
  progress: Record<string, SyncProgressEntry>;
  onClose: () => void;
  onSync: () => void;
  onRecoveryExport: () => void;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function SyncSheet({
  observations,
  lastSyncAt,
  isSyncing,
  progress,
  onClose,
  onSync,
  onRecoveryExport,
}: SyncSheetProps) {
  const pending = observations.filter((item) => item.status !== "SYNCED");
  const hasPending = pending.length > 0;
  const needsAttention = pending.filter(
    (item) =>
      item.status === "ACTION_REQUIRED" || item.status === "RETRYABLE_ERROR",
  );
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [storage, setStorage] = useState<{
    usage: number | null;
    quota: number | null;
    persisted: boolean | null;
  } | null>(null);
  const [operations, setOperations] = useState<OutboxOperation[] | null>(null);

  useEffect(() => {
    if (!technicalOpen && needsAttention.length === 0) return;
    let active = true;
    void Promise.all([estimateLocalStorage(), getOutboxOperations()])
      .then(([storageValue, operationValue]) => {
        if (!active) return;
        setStorage(storageValue);
        setOperations(operationValue);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [needsAttention.length, technicalOpen]);

  const activeProgress = pending
    .map((item) => ({ observation: item, entry: progress[item.id] }))
    .filter(
      (row): row is { observation: Observation; entry: SyncProgressEntry } =>
        Boolean(row.entry),
    );
  const errored = operations?.filter((operation) => operation.lastError) ?? [];
  const lastSyncTitle = formatExactTime(lastSyncAt);

  return (
    <ModalSurface
      onClose={onClose}
      labelledBy="sync-sheet-title"
      describedBy="sync-sheet-copy"
    >
      <div className="sheet-handle" />
      <div className="sheet-heading">
        <div>
          <span className="sheet-kicker">Sync</span>
          <h2 id="sync-sheet-title">
            {isSyncing
              ? "Sending observations…"
              : needsAttention.length
                ? "Sync needs attention"
                : hasPending
                  ? `${pending.length} waiting to send`
                  : "Everything is up to date"}
          </h2>
        </div>
        <IconButton
          label="Close sync status"
          icon="x"
          data-modal-autofocus
          onClick={onClose}
        />
      </div>

      <p className="sheet-copy" id="sync-sheet-copy">
        {needsAttention.length
          ? "Your observations remain saved on this device. Collect will keep retrying automatically."
          : hasPending
            ? "They are safely stored here and will send automatically when the server is reachable."
            : "The server has acknowledged every complete observation on this device."}
      </p>

      {activeProgress.length > 0 && (
        <div className="sync-operation-list" aria-label="Current sync progress">
          {activeProgress.map(({ observation, entry }) => (
            <div className="sync-operation-row" key={observation.id}>
              <div className="sync-operation-copy">
                <strong>
                  {String(observation.values.site_code ?? "New observation")}
                </strong>
                <span>
                  {entry.phase === "SYNCING_MEDIA"
                    ? "Uploading media"
                    : entry.phase === "FINALIZING"
                      ? "Confirming server receipt"
                      : "Sending record"}
                </span>
                {entry.phase === "SYNCING_MEDIA" &&
                  Object.entries(entry.media).map(([mediaId, percent]) => (
                    <span className="media-progress" key={mediaId}>
                      <span
                        className="media-progress-track"
                        role="progressbar"
                        aria-label={`Media upload ${percent}% complete`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                      >
                        <span style={{ width: `${percent}%` }} />
                      </span>
                      <span>{percent}%</span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {needsAttention.length > 0 && !isSyncing && (
        <div className="sync-attention-note" role="status">
          <Icon name="info" size={17} />
          <span>
            {needsAttention.length}{" "}
            {needsAttention.length === 1 ? "record" : "records"} will retry.
            Export a recovery copy below only if you need to move the data off
            this device.
          </span>
        </div>
      )}

      <div className="sync-last-success">
        <span>Last server receipt</span>
        <strong title={lastSyncTitle}>
          {lastSyncAt
            ? formatRelativeTime(lastSyncAt)
            : "None on this device yet"}
        </strong>
      </div>

      {hasPending ? (
        <Button
          variant="primary"
          fullWidth
          icon="refresh"
          onClick={onSync}
          disabled={isSyncing}
          busy={isSyncing}
        >
          {isSyncing ? "Sending…" : "Try now"}
        </Button>
      ) : (
        <Button variant="primary" fullWidth onClick={onClose}>
          Done
        </Button>
      )}

      <details
        className="sync-details sync-recovery-disclosure"
        onToggle={(event) => setTechnicalOpen(event.currentTarget.open)}
      >
        <summary>
          <Icon name="shield" size={15} /> Data recovery and device details
        </summary>
        <div className="sync-facts">
          <div>
            <span>Device storage</span>
            <strong>
              {storage
                ? `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)}`
                : "Checking…"}
            </strong>
          </div>
          <div>
            <span>Storage protection</span>
            <strong>
              {storage
                ? storage.persisted
                  ? "Persistent"
                  : "Browser managed"
                : "Checking…"}
            </strong>
          </div>
        </div>
        {errored.length > 0 && (
          <ul className="sync-details-list" aria-label="Technical sync errors">
            {errored.slice(0, 6).map((operation) => (
              <li key={operation.id}>
                <strong>{operation.id}</strong>
                <span>{operation.lastError}</span>
              </li>
            ))}
          </ul>
        )}
        <button className="recovery-button" onClick={onRecoveryExport}>
          <Icon name="download" size={15} /> Export local recovery copy
        </button>
        <p className="sheet-footnote">
          Use this only to preserve locally saved records and media outside
          collect. It does not remove anything from this device.
        </p>
      </details>
    </ModalSurface>
  );
}
