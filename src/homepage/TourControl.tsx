import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";

export interface TourSection {
  id: string;
  label: string;
}

/** How long the guided tour lingers on each section before advancing. */
const LINGER_MS = 6000;
/** The control appears once the reader scrolls past the hero. */
const SHOW_AFTER_Y = 480;
/** Scroll target keeps the section heading below the fixed top bar. */
const SCROLL_OFFSET = 72;
const DISMISS_KEY = "collect.tour.dismissed";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({
    top: Math.max(0, el.offsetTop - SCROLL_OFFSET),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}

/**
 * Floating guided-tour control for the landing page.
 *
 * While the reader scrolls, the pill shows which key section is in view
 * (auto-focus) and offers next/previous navigation. Play starts an auto-tour
 * that lingers on each section and stops at the final call-to-action; any
 * manual scroll, wheel, touch, or keyboard input pauses it immediately.
 * Readers who prefer reduced motion get navigation but no auto-tour.
 */
export function TourControl({
  sections,
  activeId,
}: {
  sections: TourSection[];
  activeId: string;
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(false);
  autoRef.current = auto;
  const reduceMotion = useMemo(prefersReducedMotion, []);

  const index = useMemo(() => {
    const i = sections.findIndex((s) => s.id === activeId);
    return i === -1 ? 0 : i;
  }, [sections, activeId]);

  // Show only after the reader has scrolled past the hero.
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_Y);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The moment the reader takes over with any input, pause the auto-tour.
  useEffect(() => {
    if (!auto) return;
    const pause = () => {
      if (autoRef.current) setAuto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        [
          " ",
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
        ].includes(e.key)
      ) {
        pause();
      }
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("touchstart", pause, { passive: true });
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("wheel", pause);
      window.removeEventListener("touchstart", pause);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [auto]);

  // Auto-advance with a linger on each section; stop at the final CTA.
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      const i = sections.findIndex((s) => s.id === activeId);
      if (i === -1 || i >= sections.length - 1) {
        setAuto(false);
        return;
      }
      scrollToSection(sections[i + 1].id);
    }, LINGER_MS);
    return () => window.clearInterval(id);
  }, [auto, activeId, sections]);

  const dismiss = () => {
    setDismissed(true);
    setAuto(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  };

  if (dismissed || !visible) return null;

  const current = sections[index] ?? sections[0];

  return (
    <nav className="hp-tour" aria-label="Guided tour of key information">
      <div className="hp-tour-step" aria-live="polite">
        <span className="hp-tour-index">
          {index + 1}
          <span aria-hidden="true"> / </span>
          {sections.length}
        </span>
        <span className="hp-tour-label">{current.label}</span>
      </div>
      <div className="hp-tour-actions">
        <button
          type="button"
          className="hp-tour-btn"
          aria-label="Previous section"
          disabled={index === 0}
          onClick={() => scrollToSection(sections[Math.max(0, index - 1)].id)}
        >
          <Icon name="chevron-up" size={16} />
        </button>
        <button
          type="button"
          className="hp-tour-btn"
          aria-label="Next section"
          disabled={index === sections.length - 1}
          onClick={() =>
            scrollToSection(
              sections[Math.min(sections.length - 1, index + 1)].id,
            )
          }
        >
          <Icon name="chevron-down" size={16} />
        </button>
        {!reduceMotion && (
          <button
            type="button"
            className="hp-tour-btn"
            aria-label={auto ? "Pause guided tour" : "Play guided tour"}
            aria-pressed={auto}
            disabled={!auto && index === sections.length - 1}
            onClick={() => setAuto((value) => !value)}
          >
            <Icon name={auto ? "pause" : "play"} size={14} />
          </button>
        )}
        <button
          type="button"
          className="hp-tour-btn"
          aria-label="Hide tour control"
          onClick={dismiss}
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </nav>
  );
}
