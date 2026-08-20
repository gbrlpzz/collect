import type Lenis from "lenis";

let activeLenis: Lenis | null = null;

export function setSmoothScroller(instance: Lenis | null) {
  activeLenis = instance;
}

export function smoothScrollTo(
  target: number | HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  if (activeLenis) {
    activeLenis.scrollTo(
      target,
      behavior === "auto" ? { immediate: true } : undefined,
    );
    return;
  }

  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior });
  } else {
    target.scrollIntoView({ behavior, block: "start" });
  }
}
