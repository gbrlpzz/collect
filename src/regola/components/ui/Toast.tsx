// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useEffect } from "react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

export interface ToastProps {
  message: ReactNode;
  onDismiss: () => void;
  duration?: number;
  icon?: string;
  className?: string;
}

export function Toast({
  message,
  onDismiss,
  duration = 4000,
  className = "",
}: ToastProps) {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div className={`toast ${className}`.trim()} role="status" aria-live="polite">
      <span>{message}</span>
      <IconButton label="Dismiss message" icon="x" size={16} onClick={onDismiss} />
    </div>
  );
}
