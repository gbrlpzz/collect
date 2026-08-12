export function isAppleMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || iPadDesktopMode;
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
      standaloneNavigator.standalone,
  );
}

export function canOfferIosInstall(): boolean {
  return isAppleMobileBrowser() && !isStandaloneApp();
}
