// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface TopBarProps {
  title?: ReactNode;
  brand?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  className?: string;
  maxWidth?: string;
}

export function TopBar({
  title,
  brand,
  actions,
  leading,
  className = "",
  maxWidth,
}: TopBarProps) {
  return (
    <header className={`topbar ${className}`.trim()}>
      <div className="topbar-inner" style={maxWidth ? { maxWidth } : undefined}>
        <div className="topbar-leading">
          {leading}
          {brand}
        </div>
        {title && <div className="topbar-title">{title}</div>}
        <div className="topbar-actions">{actions}</div>
      </div>
    </header>
  );
}
