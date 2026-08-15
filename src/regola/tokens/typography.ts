// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Typography tokens matching the Apple system typography scale.
 */

export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMono:
    'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  scale: {
    caption2: "0.6875rem",  // 11px
    caption: "0.75rem",     // 12px
    footnote: "0.8125rem",  // 13px
    subheadline: "0.9375rem",// 15px
    body: "1.0625rem",      // 17px (Apple default mobile body size)
    title3: "1.25rem",      // 20px
    title2: "1.375rem",     // 22px
    title1: "1.75rem",      // 28px
    largeTitle: "2.125rem", // 34px - 44px
  },
  lineHeight: {
    tight: 1.08,
    heading: 1.18,
    body: 1.45,
    relaxed: 1.55,
  },
  letterSpacing: {
    title: "-0.022em",
    wordmark: "-0.045em",
    kicker: "0.03em",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 800,
  },
} as const;
