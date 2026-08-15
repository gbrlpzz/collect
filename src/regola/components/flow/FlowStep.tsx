// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface FlowStepProps {
  kicker?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FlowStep({
  kicker,
  title,
  description,
  children,
  className = "",
}: FlowStepProps) {
  return (
    <div className={`flow-step ${className}`.trim()}>
      {kicker && <span className="flow-step-kicker">{kicker}</span>}
      <h1 className="flow-step-title">{title}</h1>
      {description && <p className="flow-step-description">{description}</p>}
      <div className="flow-step-control">{children}</div>
    </div>
  );
}
