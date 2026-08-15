// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../icons/Icon";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  label: string;
  icon: IconName;
  size?: number;
}

/**
 * Accessible 44pt hit-target round icon button.
 */
export function IconButton({
  label,
  icon,
  size = 20,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}
