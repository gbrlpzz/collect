import { useEffect, useRef, useState } from "react";

/** How long the auto click-through lingers on each step before advancing. */
const LINGER_MS = 1000;

/**
 * Scroll-following step focus for pill-driven sections.
 *
 * The section shows one compact story at a time under a row of step pills;
 * the companion visual stays sticky on the right. As the reader scrolls, the
 * active step auto-advances ("auto click-through") one step at a time, each
 * held for ~1s so a quick scroll cannot skip past the content. Clicking a
 * pill focuses that step instantly; the next scroll re-syncs. Nothing slides
 * — only the active pill, story, and visual highlight change.
 */
export function useScrollFocus<T extends HTMLElement>(
  stepCount: number,
): {
  ref: React.RefObject<T | null>;
  active: number;
  activate: (index: number) => void;
} {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const derive = () => {
    const el = ref.current;
    if (!el || stepCount <= 0) return activeRef.current;
    const r = el.getBoundingClientRect();
    const mid = window.innerHeight / 2;
    const progress = (mid - r.top) / r.height;
    return Math.min(
      stepCount - 1,
      Math.max(0, Math.floor(progress * stepCount)),
    );
  };

  const setActiveNow = (next: number) => {
    activeRef.current = next;
    setActive(next);
  };

  const scheduleStepToward = (target: number) => {
    if (timerRef.current !== null) return;
    const current = activeRef.current;
    if (current === target) return;
    const next = target > current ? current + 1 : current - 1;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setActiveNow(next);
      const derived = derive();
      if (derived !== next) scheduleStepToward(derived);
    }, LINGER_MS);
  };

  useEffect(() => {
    const compute = () => {
      const derived = derive();
      if (derived !== activeRef.current) scheduleStepToward(derived);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount]);

  const activate = (index: number) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveNow(index);
  };

  return { ref, active, activate };
}
