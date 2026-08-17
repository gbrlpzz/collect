// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Motion tokens following Apple Human Interface Guidelines (HIG):
 * Fluid spring physics, tactile micro-interactions, responsive touch,
 * and graceful degradation for prefers-reduced-motion.
 */

export const motion = {
  // Apple HIG Spring Physics Easing curves
  ease: {
    spring: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    springSnappy: "cubic-bezier(0.16, 1, 0.3, 1)",
    springBouncy: "cubic-bezier(0.34, 1.36, 0.64, 1)",
    smooth: "cubic-bezier(0.25, 1, 0.5, 1)",
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    outQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  // Calibrated durations
  duration: {
    instant: "120ms",
    fast: "180ms",
    normal: "280ms",
    slow: "380ms",
    enter: "320ms",
  },
  // Ready-to-use transition presets
  transition: {
    interactive: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
    spring: "all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
    bounce: "transform 0.28s cubic-bezier(0.34, 1.36, 0.64, 1)",
    smooth: "all 0.32s cubic-bezier(0.25, 1, 0.5, 1)",
    transform: "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)",
    fade: "opacity 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
    accent: "background-color 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
    fill: "background-color 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
  // Interactive tactile press scaling
  scale: {
    press: "0.972",
    pressSubtle: "0.985",
    pop: "1.05",
  },
} as const;
