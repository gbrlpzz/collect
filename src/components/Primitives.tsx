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

export function Button({
  variant = "secondary",
  icon,
  iconAfter,
  children,
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${variant}${fullWidth ? " button-full" : ""} ${className}`.trim()}
      {...props}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
      {iconAfter && <Icon name={iconAfter} size={17} />}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  onClick,
  className = "",
}: {
  label: string;
  icon: IconName;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`icon-button ${className}`.trim()} aria-label={label} onClick={onClick}>
      <Icon name={icon} size={19} />
    </button>
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
