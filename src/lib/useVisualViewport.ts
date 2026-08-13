import { useEffect } from "react";

/**
 * Mirrors the mobile visual viewport into CSS. iOS keeps the layout viewport
 * behind its keyboard, so `position: fixed; bottom: 0` alone is not enough to
 * keep actions reachable. One app-level listener lets every surface respond
 * consistently without each component owning viewport state.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
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
