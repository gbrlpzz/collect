// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";

export interface ListRowProps {
  title?: ReactNode;
  primary?: ReactNode;
  subtitle?: ReactNode;
  secondary?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ListRow({
  title,
  primary,
  subtitle,
  secondary,
  leading,
  trailing,
  meta,
  chevron = false,
  onClick,
  className = "",
  disabled = false,
}: ListRowProps) {
  const isClickable = Boolean(onClick);
  const displayTitle = title ?? primary;
  const displaySubtitle = subtitle ?? secondary;

  const content = (
    <>
      {leading && <div className="list-row-leading">{leading}</div>}
      <div className="list-row-copy">
        <strong className="list-row-title">{displayTitle}</strong>
        {displaySubtitle && <span className="list-row-subtitle">{displaySubtitle}</span>}
      </div>
      {(meta || trailing || chevron) && (
        <div className="list-row-meta">
          {meta && <span>{meta}</span>}
          {trailing}
          {chevron && <Icon name="chevron-right" size={16} />}
        </div>
      )}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`list-row ${className}`.trim()}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return <div className={`list-row ${className}`.trim()}>{content}</div>;
}
