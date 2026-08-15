// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";

export interface PageContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: "flow" | "content" | "admin" | "wizard" | "none";
}

export function PageContainer({
  children,
  className = "",
  maxWidth = "content",
}: PageContainerProps) {
  const maxWidthStyle =
    maxWidth === "flow"
      ? "var(--flow-max)"
      : maxWidth === "content"
        ? "var(--content-max)"
        : maxWidth === "admin"
          ? "var(--admin-content-max)"
          : maxWidth === "wizard"
            ? "var(--wizard-max)"
            : "none";

  return (
    <main
      className={`page ${className}`.trim()}
      style={maxWidth !== "none" ? { maxWidth: maxWidthStyle } : undefined}
    >
      {children}
    </main>
  );
}
