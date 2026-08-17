// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface AppCreditProps {
  brandName?: string;
  authorName?: string;
  authorUrl?: string;
  brandElement?: ReactNode;
  className?: string;
}

/**
 * Quiet end-of-content signature matching Apple HIG and the Collect/Dispatch pattern.
 */
export function AppCredit({
  brandName = "regola",
  authorName = "gbrlpzz",
  authorUrl = "https://gabrielepizzi.com/",
  brandElement,
  className = "",
}: AppCreditProps) {
  return (
    <footer className={`app-credit ${className}`.trim()} aria-label={`${brandName} by ${authorName}`}>
      {brandElement ?? (
        <span className="regola-brand" aria-hidden="true">
          <span className="regola-wordmark">
            {brandName}
            <span className="wordmark-dot">.</span>
          </span>
        </span>
      )}
      <span>
        by{" "}
        <a href={authorUrl} target="_blank" rel="noopener noreferrer">
          {authorName}
        </a>
      </span>
    </footer>
  );
}
