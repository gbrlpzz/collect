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

/**
 * Safari's private scheme that opens the system Safari app.
 *
 * An installed iOS PWA is still WebKit. A same-origin `https://` link —
 * even with `target="_blank"` — stays inside that container. Safari
 * registers `x-safari-https`, which leaves the PWA and opens the URL in
 * the real Safari storage container (the one the sign-in code must come
 * from). Returns null for non-https URLs; there is no http equivalent.
 */
export function safariHandoffHref(url: string): string | null {
  if (!url.startsWith("https://")) return null;
  return `x-safari-https://${url.slice("https://".length)}`;
}

/**
 * Copy the https address, then hand off to system Safari.
 *
 * The clipboard write is the fallback when iOS ignores the scheme: the
 * person can paste the address into Safari by hand. The scheme navigation
 * must not replace the current page with a dead `x-safari-https` URL if
 * the OS does not handle it — `location.assign` of a registered scheme
 * is intercepted as an app switch and leaves the PWA on screen.
 */
export async function handoffToSafari(url: string): Promise<boolean> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    // Clipboard permission is optional; the scheme handoff can still work.
  }
  const href = safariHandoffHref(url);
  if (href && globalThis.window) {
    globalThis.window.location.assign(href);
  }
  return copied;
}
