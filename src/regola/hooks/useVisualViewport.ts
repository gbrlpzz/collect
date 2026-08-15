// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useEffect } from "react";

/**
 * Hook to synchronize the mobile browser visual viewport into CSS custom properties.
 * 
 * On iOS and Android, software keyboards resize the visual viewport while the layout viewport
 * stays fixed. This hook sets:
 * - `--visual-viewport-height`: current visible height in px
 * - `--visual-viewport-top`: offset top of the visual viewport
 * - `html[data-keyboard-open="true"]`: boolean attribute when the keyboard is active
 * 
 * This enables sticky primary action docks to float directly above the virtual keyboard
 * without jitter or layout breaks.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;

    const syncViewport = () => {
      root.style.setProperty(
        "--visual-viewport-height",
        `${Math.round(viewport.height)}px`,
      );
      root.style.setProperty(
        "--visual-viewport-top",
        `${Math.round(viewport.offsetTop)}px`,
      );
      root.dataset.keyboardOpen = String(
        viewport.height < window.innerHeight - 120,
      );
    };

    syncViewport();
    viewport.addEventListener("resize", syncViewport);
    viewport.addEventListener("scroll", syncViewport);
    window.addEventListener("orientationchange", syncViewport);

    return () => {
      viewport.removeEventListener("resize", syncViewport);
      viewport.removeEventListener("scroll", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      root.style.removeProperty("--visual-viewport-height");
      root.style.removeProperty("--visual-viewport-top");
      delete root.dataset.keyboardOpen;
    };
  }, []);
}
