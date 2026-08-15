// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`.trim()}>{children}</div>;
}

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`divider ${className}`.trim()} aria-hidden="true" />;
}

export function Avatar({
  initials,
  muted = false,
  className = "",
}: {
  initials: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={`avatar ${muted ? "avatar-muted" : ""} ${className}`.trim()}>
      {initials}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge ${className}`.trim()}>{children}</span>;
}

export function InfoDisclosure({
  title,
  children,
  icon = "info",
  className = "",
}: {
  title: string;
  children: ReactNode;
  icon?: IconName;
  className?: string;
}) {
  return (
    <details className={`info-disclosure ${className}`.trim()}>
      <summary>
        <Icon name={icon} size={16} />
        <span>{title}</span>
        <Icon className="info-disclosure-chevron" name="chevron-down" size={15} />
      </summary>
      <div className="info-disclosure-content">{children}</div>
    </details>
  );
}

export function ProgressRing({
  score,
  total,
  size = 44,
  label,
}: {
  score: number | null;
  total?: number | null;
  size?: number;
  label?: string;
}) {
  const available = score !== null && (total === undefined || total === null || total > 0);
  const rounded = available ? Math.round(score) : null;
  const tone =
    rounded === null
      ? "empty"
      : rounded >= 75
        ? "high"
        : rounded >= 50
          ? "medium"
          : "low";
  const radius = 18;
  const progress = rounded ?? 0;
  const ariaLabel =
    label ??
    (rounded === null
      ? "Score unavailable"
      : `Score ${rounded} out of 100${total ? `, based on ${total} items` : ""}`);

  return (
    <span
      className={`score-ring score-ring-${tone}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="score-ring-track" cx="22" cy="22" r={radius} />
        <circle
          className="score-ring-value"
          cx="22"
          cy="22"
          r={radius}
          pathLength={100}
          strokeDasharray={`${progress} 100`}
        />
      </svg>
      <strong>{rounded ?? "–"}</strong>
    </span>
  );
}
