import type { ReactNode } from "react";
import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { setSmoothScroller } from "./smoothScroll";

export function LenisRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      smoothWheel: true,
      respectReducedMotion: true,
      prevent: (node) => node.closest("[data-lenis-prevent]") !== null,
    });
    setSmoothScroller(lenis);
    return () => {
      setSmoothScroller(null);
      lenis.destroy();
    };
  }, []);

  return children;
}
