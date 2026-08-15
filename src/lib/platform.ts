export function isAppleMobileBrowser(): boolean {
  const nav = globalThis.navigator;
  if (!nav) return false;
  const iPadDesktopMode = nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(nav.userAgent) || iPadDesktopMode;
}

export function isStandaloneApp(): boolean {
  const win = globalThis.window;
  const nav = globalThis.navigator;
  if (!win || !nav) return false;
  // SAFETY: iOS Safari attaches a non-standard boolean 'standalone' property to navigator.
  const standaloneNavigator = nav as Navigator & { standalone?: boolean };
  return Boolean(
    win.matchMedia?.("(display-mode: standalone)").matches ||
      standaloneNavigator.standalone,
  );
}

export function isMobileDevice(): boolean {
  const win = globalThis.window;
  const nav = globalThis.navigator;
  if (!win || !nav) return false;
  if (isAppleMobileBrowser()) return true;
  const userAgent = nav.userAgent || "";
  if (/Android|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent))
    return true;
  return (
    win.matchMedia?.("(max-width: 768px) and (pointer: coarse)").matches ??
    false
  );
}

export function canOfferIosInstall(): boolean {
  return isAppleMobileBrowser() && !isStandaloneApp();
}
