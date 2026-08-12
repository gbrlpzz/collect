import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { Button, ClearButton } from "./controls";

export function StatusDot({
  tone = "neutral",
}: {
  tone?: "neutral" | "dark" | "soft";
}) {
  return (
    <span className={`status-dot status-dot-${tone}`} aria-hidden="true" />
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "dark" | "soft";
}) {
  return (
    <span className={`status-badge status-badge-${tone}`}>
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

export interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A small, accessible confirmation surface instead of a browser confirm(). */
export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-message"
      >
        <div className="dialog-copy">
          <h2 id="confirmation-dialog-title">{title}</h2>
          <p id="confirmation-dialog-message">{message}</p>
        </div>
        <div className="dialog-actions">
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" autoFocus onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}

export interface EmailPromptProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}

/** A small form dialog for collecting a single email address. */
export function EmailPrompt({
  title,
  message,
  confirmLabel = "Add",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: EmailPromptProps) {
  const [email, setEmail] = useState("");

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-prompt-title"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const address = email.trim();
            if (address) onSubmit(address);
          }}
        >
          <div className="dialog-copy">
            <h2 id="email-prompt-title">{title}</h2>
            {message && <p>{message}</p>}
            <label className="auth-label" htmlFor="email-prompt-input">
              Email address
            </label>
            <div className="input-with-clear">
              <input
                id="email-prompt-input"
                className="field-input"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              {email && (
                <ClearButton
                  label="Clear email address"
                  onClick={() => setEmail("")}
                />
              )}
            </div>
          </div>
          <div className="dialog-actions">
            <Button type="submit" variant="primary" disabled={!email.trim()}>
              {confirmLabel}
            </Button>
            <Button variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Divider() {
  return <div className="divider" aria-hidden="true" />;
}

export function Avatar({
  initials,
  muted = false,
}: {
  initials: string;
  muted?: boolean;
}) {
  return (
    <span className={`avatar${muted ? " avatar-muted" : ""}`}>{initials}</span>
  );
}

/** A compact, accessible score indicator. Color reinforces the numeric value
 * but never carries meaning by itself. */
export function AttentionScoreRing({
  score,
  total,
  size = 44,
}: {
  score: number | null;
  total: number | null;
  size?: number;
}) {
  const available = score !== null && total !== null && total > 0;
  const rounded = available ? Math.round(score) : null;
  const tone =
    rounded === null
      ? "empty"
      : rounded >= 75
        ? "high"
        : rounded >= 50
          ? "medium"
          : "low";
  const radius = 18;
  const progress = rounded ?? 0;
  const label =
    rounded === null
      ? "Attention score unavailable; no checks completed"
      : `Attention score ${rounded} out of 100, based on ${total} checks`;

  return (
    <span
      className={`score-ring score-ring-${tone}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="score-ring-track" cx="22" cy="22" r={radius} />
        <circle
          className="score-ring-value"
          cx="22"
          cy="22"
          r={radius}
          pathLength={100}
          strokeDasharray={`${progress} 100`}
        />
      </svg>
      <strong>{rounded ?? "–"}</strong>
    </span>
  );
}
