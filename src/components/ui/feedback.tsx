import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Icon } from "../Icon";
import type { IconName } from "../Icon";
import { Button, ClearButton } from "./controls";

const FOCUSABLE_SELECTOR =
  "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

export function ModalSurface({
  children,
  onClose,
  labelledBy,
  describedBy,
  className = "",
  kind = "sheet",
  role = "dialog",
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  kind?: "sheet" | "dialog";
  role?: "dialog" | "alertdialog";
}) {
  const surfaceRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const previousFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const surface = surfaceRef.current;
      const preferred = surface?.querySelector<HTMLElement>(
        "[data-modal-autofocus]",
      );
      (
        preferred ?? surface?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      )?.focus();
    });
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      if (previousFocusRef.current?.isConnected)
        previousFocusRef.current.focus();
    };
  }, []);

  const keepFocusInside = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      surfaceRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ??
        [],
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

  return (
    <div
      className={kind === "sheet" ? "sheet-backdrop" : "dialog-backdrop"}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={surfaceRef}
        className={`${kind === "sheet" ? "bottom-sheet" : "confirmation-dialog"} ${className}`.trim()}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onKeyDown={keepFocusInside}
      >
        {children}
      </section>
    </div>
  );
}

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
    <ModalSurface
      kind="dialog"
      role="alertdialog"
      onClose={onCancel}
      labelledBy="confirmation-dialog-title"
      describedBy="confirmation-dialog-message"
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
        <Button variant="secondary" data-modal-autofocus onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </ModalSurface>
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
    <ModalSurface
      kind="dialog"
      onClose={onCancel}
      labelledBy="email-prompt-title"
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
              data-modal-autofocus
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
    </ModalSurface>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Divider() {
  return <div className="divider" aria-hidden="true" />;
}

/** Supporting context that stays out of the primary reading path until asked
 * for. Never use this for errors, required actions, or irreversible warnings. */
export function InfoDisclosure({
  title,
  children,
  icon = "info",
  className = "",
}: {
  title: string;
  children: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <details className={`info-disclosure ${className}`.trim()}>
      <summary>
        <Icon name={icon} size={16} />
        <span>{title}</span>
        <Icon
          className="info-disclosure-chevron"
          name="chevron-down"
          size={15}
        />
      </summary>
      <div className="info-disclosure-content">{children}</div>
    </details>
  );
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
