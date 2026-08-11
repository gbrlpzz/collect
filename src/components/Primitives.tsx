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
  variant?: "primary" | "secondary" | "tertiary" | "quiet";
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
  fullWidth?: boolean;
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
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`button button-${variant}${fullWidth ? " button-full" : ""} ${className}`.trim()}
      {...props}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
      {iconAfter && <Icon name={iconAfter} size={17} />}
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
}: {
  options: SegmentOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={`segmented-control ${className ?? ""}`.trim()} role="group" aria-label={label}>
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
