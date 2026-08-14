import { useEffect, useState } from "react";

/**
 * Tracks which page section is currently in view as the user scrolls.
 *
 * Shared by the top navigation and the guided tour control so both highlight
 * the same section from one scroll listener. The section is considered active
 * once its top edge has passed `offset` pixels below the viewport top.
 */
export function useSectionSpy(sectionIds: string[], offset = 140): string {
  const [active, setActive] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + offset;
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
      // Past the final section (footer), keep a section active so the nav
      // does not go blank while the call-to-action is on screen.
      if (!current && scrollPos >= firstTop) current = last;
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
