// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface ModalSurfaceProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  className?: string;
  kind?: "sheet" | "dialog";
  role?: "dialog" | "alertdialog";
}

/**
 * Core modal primitive with focus trapping, backdrop dismiss, Escape key handling,
 * and previous focus restoration.
 */
export function ModalSurface({
  children,
  onClose,
  labelledBy,
  describedBy,
  className = "",
  kind = "sheet",
  role = "dialog",
}: ModalSurfaceProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const previousFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const surface = surfaceRef.current;
      const preferred = surface?.querySelector<HTMLElement>("[data-modal-autofocus]");
      (preferred ?? surface?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR))?.focus();
    });

    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const keepFocusInside = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      surfaceRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={kind === "sheet" ? "sheet-backdrop" : "dialog-backdrop"}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={surfaceRef}
        className={`${kind === "sheet" ? "bottom-sheet" : "confirmation-dialog"} ${className}`.trim()}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onKeyDown={keepFocusInside}
      >
        {children}
      </section>
    </div>
  );
}
