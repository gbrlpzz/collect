// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ElementType, ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  headerRight?: ReactNode;
  headerHighlight?: boolean;
  padded?: boolean;
  className?: string;
  as?: ElementType;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * Inset rounded card surface matching Apple HIG grouped styling.
 */
export function Card({
  children,
  header,
  headerRight,
  headerHighlight = false,
  padded = false,
  className = "",
  as: Component = "section",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CardProps) {
  return (
    <Component
      className={`regola-card ${padded ? "regola-card-padded" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {(header || headerRight) && (
        <div className={`card-header ${headerHighlight ? "card-header-highlight" : ""}`}>
          <div className="card-header-title">{header}</div>
          {headerRight && <div className="card-header-right">{headerRight}</div>}
        </div>
      )}
      <div className={header || headerRight ? "card-body" : undefined}>{children}</div>
    </Component>
  );
}
