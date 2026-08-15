import { useEffect, useRef, useState } from "react";

/**
 * Native sticky scrollytelling.
 *
 * The ref goes on a tall wrapper whose inner panel is `position: sticky`, so
 * the section visually holds still while the reader scrolls through its band
 * — the "section stop". The active step is derived from scroll progress
 * through that band, so the sub-sections click through themselves as the
 * reader scrolls (and reverse when scrolling back). Scrolling stays entirely
 * native: no wheel interception, no timers, nothing to fight the browser.
 */
export function useScrollytelling<T extends HTMLElement>(
  stepCount: number,
): {
  ref: React.RefObject<T | null>;
  active: number;
  goToStep: (index: number) => void;
} {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const apply = (next: number) => {
    const clamped = Math.min(stepCount - 1, Math.max(0, next));
    if (clamped !== activeRef.current) {
      activeRef.current = clamped;
      setActive(clamped);
    }
  };

  useEffect(() => {
    const el = ref.current;
    if (!el || stepCount <= 1) return;

    const compute = () => {
      const travel = el.offsetHeight - window.innerHeight;
      if (travel <= 0) {
        // Panel is not pinned (short viewport / stacked mobile layout).
        // Preserve user-selected interactive tab state on mobile without scroll resets.
        return;
      }
      const scrolled = Math.min(
        Math.max(-el.getBoundingClientRect().top, 0),
        travel,
      );
      apply(Math.floor((scrolled / travel) * stepCount));
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount]);

  /** Pills stay usable: clicking one scrolls to that step's band. */
  const goToStep = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const travel = el.offsetHeight - window.innerHeight;
    if (travel <= 0) {
      apply(index);
      return;
    }
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: el.offsetTop + (travel * (index + 0.5)) / stepCount,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return { ref, active, goToStep };
}
