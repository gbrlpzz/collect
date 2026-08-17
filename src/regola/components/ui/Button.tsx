// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "quiet" | "destructive" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
  fullWidth?: boolean;
  busy?: boolean;
}

/**
 * Standard interactive action button following Apple HIG.
 * State changes are expressed with opacity adjustments rather than resizing geometry.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  children,
  fullWidth = false,
  className = "",
  type = "button",
  busy = false,
  disabled,
  ...props
}: ButtonProps) {
  const normalizedVariant = variant === "danger" ? "destructive" : variant;
  const sizeClass = size === "sm" ? "button-sm" : size === "lg" ? "button-lg" : "";

  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={`button button-${normalizedVariant}${sizeClass ? " " + sizeClass : ""}${fullWidth ? " button-full" : ""}${busy ? " button-busy" : ""} ${className}`.trim()}
      {...props}
    >
      {busy ? (
        <span className="button-spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={size === "sm" ? 14 : 18} />
      ) : null}
      <span>{children}</span>
      {!busy && iconAfter && <Icon name={iconAfter} size={size === "sm" ? 14 : 18} />}
    </button>
  );
}
