import { useEffect, useState } from "react";

/**
 * Tracks which page section is currently in view as the user scrolls.
 *
 * Shared by the top navigation and the guided tour control so both highlight
 * the same section from one scroll listener. The section is considered active
 * once its top edge has passed `offset` pixels below the viewport top.
 */
export function useSectionSpy(
  sectionIds: string[],
  offset = 140,
  preferLastAtBottom = false,
): string {
  const [active, setActive] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + offset;
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      let current = "";
      let last = "";
      let firstTop = Number.POSITIVE_INFINITY;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        firstTop = Math.min(firstTop, top);
        if (scrollPos >= top && scrollPos < top + height) {
          current = id;
          break;
        }
        if (scrollPos >= top) last = id;
      }
      // Past the final section (footer), keep a section active so the tour
      // and nav do not go blank while the call-to-action is on screen.
      if (!current && scrollPos >= firstTop) current = last;
      // A short final section may never scroll past the offset (too little
      // room left). Once it is on screen at the very bottom of the page and
      // the caller asks for it, the final section wins.
      if (preferLastAtBottom && atBottom) {
        const lastEl = document.getElementById(
          sectionIds[sectionIds.length - 1],
        );
        if (lastEl && lastEl.offsetTop <= window.scrollY + window.innerHeight) {
          current = sectionIds[sectionIds.length - 1];
        }
      }
      setActive(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIds.join(","), offset]);

  return active;
}
