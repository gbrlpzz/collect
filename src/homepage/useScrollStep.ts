import { useEffect, useRef, useState } from "react";

/** Rest the section title just below the fixed top bar. */
const REST_OFFSET = 84;
/** Small entry zone that triggers a gentle settle onto the section. */
const ENTRY_ZONE_FRACTION = 0.15;

/**
 * Scroll-driven step focus for pill sections.
 *
 * The active step is derived directly from the section's scroll position
 * (scrollspy-style): scrolling forward advances one step per scroll band,
 * scrolling back reverses it. No timers, no scroll blocking — every state
 * change is triggered by scroll motion. Pill clicks focus a step directly;
 * the next scroll re-syncs.
 *
 * Optionally, the first time the reader scrolls into the section, the page
 * gently settles with the section title at the top (one smooth scroll,
 * cancelable by any continued scrolling).
 */
export function useScrollStep<T extends HTMLElement>(
  stepCount: number,
  settleSectionId?: string,
): {
  ref: React.RefObject<T | null>;
  active: number;
  activate: (index: number) => void;
} {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || stepCount <= 0) return;

    const compute = () => {
      const r = el.getBoundingClientRect();
      // Progress through the section from "title at the top" (step 0) to
      // scrolled a full section-height past it (final step).
      const progress = (REST_OFFSET - r.top) / r.height;
      const next = Math.min(
        stepCount - 1,
        Math.max(0, Math.floor(progress * stepCount)),
      );
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!settleSectionId || settledRef.current || e.deltaY <= 0) return;
      const section = document.getElementById(settleSectionId);
      if (!section) return;
      const rest = section.offsetTop - REST_OFFSET;
      const zone = window.innerHeight * ENTRY_ZONE_FRACTION;
      const y = window.scrollY;
      if (y < rest && y > rest - zone) {
        settledRef.current = true;
        window.scrollTo({ top: rest, behavior: "smooth" });
      }
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    if (settleSectionId)
      window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      if (settleSectionId) window.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount, settleSectionId]);

  const activate = (index: number) => {
    activeRef.current = index;
    setActive(index);
  };

  return { ref, active, activate };
}
