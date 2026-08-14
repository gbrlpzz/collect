import { useEffect, useRef, useState } from "react";

/**
 * Scroll-driven focus for step-based sections.
 *
 * The section keeps all step content persistently on screen; this hook moves
 * a focus highlight (and optional companion visual) between steps as the
 * reader scrolls — "auto click-through" — and lets a click focus a step
 * directly by scrolling it to the viewport center. Nothing slides: content
 * stays put, only the active step changes.
 */
export function useScrollFocus<T extends HTMLElement>(
  stepSelector: string,
): {
  ref: React.RefObject<T | null>;
  active: number;
  activate: (index: number) => void;
} {
  const ref = useRef<T>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const steps = Array.from(el.querySelectorAll<HTMLElement>(stepSelector));
      if (steps.length === 0) return;
      const mid = window.innerHeight / 2;
      let next = 0;
      for (let i = 0; i < steps.length; i++) {
        if (steps[i].getBoundingClientRect().top <= mid) next = i;
      }
      setActive((prev) => (prev === next ? prev : next));
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [stepSelector]);

  const activate = (index: number) => {
    const el = ref.current;
    if (!el) return;
    const target = el.querySelectorAll<HTMLElement>(stepSelector)[index];
    if (!target) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, top - (window.innerHeight - target.offsetHeight) / 2),
      behavior: reduceMotion ? "auto" : "smooth",
    });
    // Give immediate feedback; the scroll listener re-syncs if needed.
    setActive((prev) => (prev === index ? prev : index));
  };

  return { ref, active, activate };
}
