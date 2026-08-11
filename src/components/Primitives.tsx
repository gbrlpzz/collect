import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function StatusDot({ tone = "neutral" }: { tone?: "neutral" | "dark" | "soft" }) {
  return <span className={`status-dot status-dot-${tone}`} aria-hidden="true" />;
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

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "quiet" | "destructive";
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
  fullWidth?: boolean;
  busy?: boolean;
}

/**
 * The shared action primitive. Native buttons have an explicit type so an
 * action never submits an unrelated form by accident. Keeping the primitive
 * small also makes contributor and admin actions feel like one system.
 */
export function Button({
  variant = "secondary",
  icon,
  iconAfter,
  children,
  fullWidth = false,
  className = "",
  type = "button",
  busy = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      className={`button button-${variant}${fullWidth ? " button-full" : ""}${busy ? " button-busy" : ""} ${className}`.trim()}
      {...props}
    >
      {busy ? <span className="button-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={17} /> : null}
      <span>{children}</span>
      {!busy && iconAfter && <Icon name={iconAfter} size={17} />}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  label: string;
  icon: IconName;
}

export function IconButton({
  label,
  icon,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button type={type} className={`icon-button ${className}`.trim()} aria-label={label} {...props}>
      <Icon name={icon} size={19} />
    </button>
  );
}

/** A native-style clear affordance for editable text. */
export function ClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="clear-button" aria-label={label} onClick={onClick}>
      <Icon name="x" size={16} />
    </button>
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
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" aria-describedby="confirmation-dialog-message">
        <div className="dialog-copy">
          <h2 id="confirmation-dialog-title">{title}</h2>
          <p id="confirmation-dialog-message">{message}</p>
        </div>
        <div className="dialog-actions">
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
          <Button variant="secondary" autoFocus onClick={onCancel}>{cancelLabel}</Button>
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
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="email-prompt-title">
        <div className="dialog-copy">
          <h2 id="email-prompt-title">{title}</h2>
          {message && <p>{message}</p>}
          <label className="auth-label" htmlFor="email-prompt-input">Email address</label>
          <div className="input-with-clear">
            <input id="email-prompt-input" className="field-input" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            {email && <ClearButton label="Clear email address" onClick={() => setEmail("")} />}
          </div>
        </div>
        <form className="dialog-actions" onSubmit={(event) => { event.preventDefault(); const address = email.trim(); if (address) onSubmit(address); }}>
          <Button type="submit" variant="primary" disabled={!email.trim()}>{confirmLabel}</Button>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        </form>
      </section>
    </div>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
}

/** A compact, accessible choice among a small set of mutually exclusive values. */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
  describedBy,
  required = false,
  invalid = false,
}: {
  options: SegmentOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  describedBy?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className={`segmented-control ${className ?? ""}`.trim()} role="group" aria-label={label} aria-describedby={describedBy || undefined} aria-required={required || undefined} aria-invalid={invalid || undefined}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            className={selected ? "segmented-control-selected" : ""}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Divider() {
  return <div className="divider" aria-hidden="true" />;
}

export function Avatar({ initials, muted = false }: { initials: string; muted?: boolean }) {
  return <span className={`avatar${muted ? " avatar-muted" : ""}`}>{initials}</span>;
}
