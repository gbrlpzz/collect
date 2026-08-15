// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Environment and platform detection utilities for PWA ergonomics.
 */

export function isAppleMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || iPadDesktopMode;
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
      standaloneNavigator.standalone,
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (isAppleMobileBrowser()) return true;
  const userAgent = navigator.userAgent || "";
  if (/Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent))
    return true;
  return (
    window.matchMedia?.("(max-width: 768px) and (pointer: coarse)").matches ??
    false
  );
}

export function canOfferIosInstall(): boolean {
  return isAppleMobileBrowser() && !isStandaloneApp();
}
