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

export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
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
