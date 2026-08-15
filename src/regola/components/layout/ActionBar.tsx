// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface ActionBarProps {
  children: ReactNode;
  className?: string;
}

export function ActionBar({ children, className = "" }: ActionBarProps) {
  return <div className={`primary-action-dock ${className}`.trim()}>{children}</div>;
}
