// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface GroupedListProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export function GroupedList({
  children,
  className = "",
  header,
  footer,
}: GroupedListProps) {
  return (
    <div className="grouped-list-container">
      {header && <div className="grouped-list-header">{header}</div>}
      <div className={`grouped-list ${className}`.trim()}>{children}</div>
      {footer && <div className="grouped-list-footer">{footer}</div>}
    </div>
  );
}
