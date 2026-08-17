// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface TopBarProps {
  title?: ReactNode;
  brand?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  variant?: "bubbles" | "standard";
  className?: string;
  maxWidth?: string;
}

/**
 * Navigation TopBar adhering to Apple HIG.
 * In "bubbles" mode (default), the topbar is transparent with floating frosted
 * glass capsules for wordmark, desktop navigation, and profile/actions.
 */
export function TopBar({
  title,
  brand,
  nav,
  actions,
  leading,
  variant = "bubbles",
  className = "",
  maxWidth,
}: TopBarProps) {
  return (
    <header className={`topbar ${variant === "bubbles" ? "topbar-bubbles" : ""} ${className}`.trim()}>
      <div className="topbar-inner" style={maxWidth ? { maxWidth } : undefined}>
        <div className="topbar-leading">
          {leading}
          {brand}
        </div>
        {nav && <div className="topbar-nav">{nav}</div>}
        {title && <div className="topbar-title">{title}</div>}
        {actions && <div className="topbar-actions">{actions}</div>}
      </div>
    </header>
  );
}
