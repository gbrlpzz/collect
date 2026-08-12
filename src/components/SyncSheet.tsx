import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { Observation, SubmissionState, SyncProgressEntry } from "../types";
import {
  estimateLocalStorage,
  getOutboxOperations,
  type OutboxOperation,
} from "../lib/localStore";
import { Icon } from "./Icon";
import { Button, IconButton } from "./ui";

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
  const [storage, setStorage] = useState<{
    usage: number | null;
    quota: number | null;
    persisted: boolean | null;
  } | null>(null);
  const [operations, setOperations] = useState<OutboxOperation[] | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    void estimateLocalStorage()
      .then((value) => {
        if (active) setStorage(value);
      })
      .catch(() => undefined);
    void getOutboxOperations()
      .then((value) => {
        if (active) setOperations(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (previousFocusRef.current?.isConnected)
        previousFocusRef.current.focus();
    };
  }, []);

  const keepFocusInside = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const activeProgress = pending
    .map((item) => ({ observation: item, entry: progress[item.id] }))
    .filter((row) => row.entry);
  const syncingCount = activeProgress.length;
  const statusLabel = (status: SubmissionState): string =>
    status === "ACTION_REQUIRED"
      ? "Needs attention"
      : status === "RETRYABLE_ERROR"
        ? "Will retry"
        : "Queued";
  const errored = operations?.filter((operation) => operation.lastError) ?? [];

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={sheetRef}
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-sheet-title"
        aria-describedby="sync-sheet-copy"
        onKeyDown={keepFocusInside}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <span className="sheet-kicker">Sync</span>
            <h2 id="sync-sheet-title">
              {isSyncing && syncingCount
                ? `Syncing ${syncingCount} of ${pending.length}…`
                : hasPending
                  ? `${pending.length} waiting`
                  : "Up to date"}
            </h2>
          </div>
          <IconButton
            label="Close sync status"
            icon="x"
            autoFocus
            onClick={onClose}
          />
        </div>

        <p className="sheet-copy" id="sync-sheet-copy">
          {hasPending
            ? "Saved on this device. Sync will continue when the server is reachable."
            : "The server has acknowledged every complete observation."}
        </p>

        {activeProgress.length > 0 && (
          <div className="sync-operation-list">
            {activeProgress.map(({ observation, entry }) => (
              <div className="sync-operation-row" key={observation.id}>
                <span className="operation-number">
                  {pending.findIndex((item) => item.id === observation.id) + 1}
                </span>
                <div className="sync-operation-copy">
                  <strong>
                    {String(observation.values.site_code ?? "New observation")}
                  </strong>
                  <span>
                    {entry.phase === "SYNCING_MEDIA"
                      ? "Uploading media…"
                      : entry.phase === "FINALIZING"
                        ? "Finalizing on server…"
                        : "Sending metadata…"}
                  </span>
                  {entry.phase === "SYNCING_MEDIA" &&
                    Object.entries(entry.media).map(([mediaId, percent]) => (
                      <span
                        className="media-progress"
                        key={mediaId}
                        aria-live="polite"
                      >
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
                        <span>
                          {percent < 100 ? `${percent}%` : "uploaded"}
                        </span>
                      </span>
                    ))}
                </div>
                <span className="operation-status">Syncing</span>
              </div>
            ))}
          </div>
        )}
        {hasPending && activeProgress.length === 0 && (
          <div className="sync-operation-list">
            {pending.slice(0, 4).map((observation, index) => (
              <div className="sync-operation-row" key={observation.id}>
                <span className="operation-number">{index + 1}</span>
                <div>
                  <strong>
                    {String(observation.values.site_code ?? "New observation")}
                  </strong>
                  <span>Structured data · media queued</span>
                </div>
                <span className="operation-status">
                  {statusLabel(observation.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="sync-facts">
          <div>
            <span>Last successful sync</span>
            <strong>
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleString()
                : "Not yet on this device"}
            </strong>
          </div>
          <div>
            <span>Device storage</span>
            <strong>
              {storage
                ? `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)} · ${storage.persisted ? "persistent" : "not persistent"}`
                : "Checking…"}
            </strong>
          </div>
        </div>

        {errored.length > 0 && (
          <details className="sync-details">
            <summary>
              <Icon name="info" size={15} /> Details
            </summary>
            <ul className="sync-details-list">
              {errored.slice(0, 6).map((operation) => (
                <li key={operation.id}>
                  <strong>{operation.id}</strong>
                  <span>{operation.lastError}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <Button
          variant="primary"
          fullWidth
          icon="refresh"
          onClick={onSync}
          disabled={isSyncing || !hasPending}
          busy={isSyncing}
        >
          {isSyncing ? "Syncing…" : hasPending ? "Sync now" : "Up to date"}
        </Button>
        <button className="recovery-button" onClick={onRecoveryExport}>
          <Icon name="download" size={15} /> Export unsynced recovery package
        </button>
        <p className="sheet-footnote">
          A recovery package contains locally saved records and their media if
          the hosted service cannot be reached.
        </p>
      </section>
    </div>
  );
}
