// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Spacing and layout geometry tokens.
 * Strict 4-point grid following Apple HIG.
 */

export const spacing = {
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space5: "20px",
  space6: "24px",
  space7: "32px",
  space8: "40px",
  space9: "48px",
} as const;

export const layout = {
  pageGutter: "16px",
  pageGutterWide: "24px",
  flowMax: "560px",
  flowContentMax: "520px",
  contentMax: "720px",
  adminContentMax: "960px",
  wizardMax: "760px",
  dialogMax: "420px",
  sheetMax: "560px",
} as const;

export const controlHeights = {
  minTouchTarget: "44px", // Minimum Apple HIG touch hit area
  primaryAction: "52px",  // Dominant mobile primary action
  flowInput: "56px",      // Flow screen input height
  rowHeight: "68px",      // Standard grouped list row height
  cardHeight: "72px",     // Admin project card height
  topbarHeight: "52px",   // Topbar height excluding safe-area-inset-top
  mobileTabbarHeight: "58px", // Bottom tabbar height
} as const;
