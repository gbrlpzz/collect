export interface DeviceInfo {
  platform: string;
  os: string;
  browser: string;
  deviceModel: string;
  language: string;
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface BatteryManager {
  level: number;
  charging: boolean;
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: NetworkInformation;
  getBattery?: () => Promise<BatteryManager>;
}

export function collectDeviceInfo(): DeviceInfo {
  const ua = globalThis.navigator?.userAgent ?? "";
  const platform = globalThis.navigator?.platform ?? "";
  let os = "unknown";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "unknown";
  if (/CriOS/i.test(ua)) browser = "Chrome (iOS)";
  else if (/EdgiOS|EdgA/i.test(ua)) browser = "Edge";
  else if (/FxiOS/i.test(ua)) browser = "Firefox (iOS)";
  else if (/OPiOS/i.test(ua)) browser = "Opera (iOS)";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";

  let deviceModel = "unknown";
  const isIos =
    /iPhone|iPad|iPod/i.test(ua) ||
    (platform === "MacIntel" &&
      Boolean(globalThis.navigator && globalThis.navigator.maxTouchPoints > 1));
  if (isIos) {
    deviceModel = iosModelFromScreen();
  } else {
    const android = ua.match(
      /; (SM-[A-Z0-9]+|Pixel \d+|[A-Za-z]+_?[A-Za-z0-9]+) Build\//,
    );
    if (android) deviceModel = android[1].replace(/_/g, " ");
  }

  return {
    platform: platform || "unknown",
    os,
    browser,
    deviceModel,
    language: globalThis.navigator?.language ?? "",
  };
}

export interface EnvironmentInfo {
  capturedAt: string;
  timezone: string;
  language: string;
  deviceModel: string;
  deviceOs: string;
  browser: string;
  platform: string;
  screen: string;
  orientation: string | null;
  pixelRatio: number;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  connection: {
    type: string | null;
    downlink: number | null;
    rtt: number | null;
    saveData: boolean | null;
  } | null;
  battery: { level: number | null; charging: boolean | null } | null;
  online: boolean;
}

export async function collectEnvironment(): Promise<EnvironmentInfo> {
  const device = collectDeviceInfo();
  let screen = "unknown";
  let orientation: string | null = null;
  let pixelRatio = 1;
  try {
    if (globalThis.window?.screen) {
      screen = `${Math.round(globalThis.window.screen.width)}x${Math.round(globalThis.window.screen.height)}`;
      pixelRatio = globalThis.window.devicePixelRatio || 1;
      orientation = globalThis.window.screen.orientation?.type ?? null;
    }
  } catch {
    // Screen access is never required.
  }
  let concurrency: number | null = null;
  let memory: number | null = null;
  let connection: EnvironmentInfo["connection"] = null;
  try {
    const nav = globalThis.navigator;
    if (nav) {
      concurrency = nav.hardwareConcurrency ?? null;
      // SAFETY: deviceMemory is a non-standard Chromium property on navigator.
      const extNav = nav as ExtendedNavigator;
      memory = extNav.deviceMemory ?? null;
      const net = extNav.connection;
      if (net) {
        connection = {
          type: net.effectiveType ?? null,
          downlink: Number.isFinite(net.downlink)
            ? (net.downlink ?? null)
            : null,
          rtt: Number.isFinite(net.rtt) ? (net.rtt ?? null) : null,
          saveData: net.saveData ?? null,
        };
      }
    }
  } catch {
    // Connection/memory APIs are Chromium-only and optional.
  }
  let battery: EnvironmentInfo["battery"] = null;
  try {
    const nav = globalThis.navigator;
    if (nav) {
      // SAFETY: getBattery is a non-standard Chromium method on navigator.
      const extNav = nav as ExtendedNavigator;
      const bat = await extNav.getBattery?.();
      if (bat) battery = { level: bat.level, charging: bat.charging };
    }
  } catch {
    // Battery API is Chromium-only and optional.
  }
  return {
    capturedAt: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: device.language,
    deviceModel: device.deviceModel,
    deviceOs: device.os,
    browser: device.browser,
    platform: device.platform,
    screen,
    orientation,
    pixelRatio,
    hardwareConcurrency: concurrency,
    deviceMemory: memory,
    connection,
    battery,
    online: globalThis.navigator?.onLine ?? true,
  };
}

function iosModelFromScreen(): string {
  if (!globalThis.window) return "iOS device";
  const width = Math.min(
    globalThis.window.screen.width,
    globalThis.window.screen.height,
  );
  const height = Math.max(
    globalThis.window.screen.width,
    globalThis.window.screen.height,
  );
  const dpr = globalThis.window.devicePixelRatio || 2;
  const key = `${Math.round(width * dpr)}x${Math.round(height * dpr)}`;
  const iosVersion = parseIosVersion();

  const iphoneTable = {
    "640x1136": [["iPhone SE (1st gen) / 5s", 12]],
    "750x1334": [
      ["iPhone SE (2nd/3rd gen)", 14],
      ["iPhone 6/6s/7/8", 13],
    ],
    "1242x2208": [["iPhone 6 Plus/7 Plus/8 Plus"]],
    "1125x2436": [
      ["iPhone 13 mini", 17],
      ["iPhone 12 mini / X / XS / 11 Pro", 16],
    ],
    "828x1792": [["iPhone 11 / XR"]],
    "1170x2532": [["iPhone 12 / 13 / 14 / 15 / 16 (6.1-inch)"]],
    "1284x2778": [["iPhone 12 Pro Max / 13 Pro Max / 14 Plus"]],
    "1179x2556": [["iPhone 15 / 16 / 14 Pro (6.1-inch)"]],
    "1290x2796": [["iPhone 15 Pro Max / 16 Plus"]],
    "1206x2622": [["iPhone 16 Pro"]],
    "1320x2868": [["iPhone 16 Pro Max"]],
  } as const;

  const ipadTable = {
    "1536x2048": ["iPad 5–9 / Air 1–2 / mini 2–5 (9.7-inch)"],
    "1620x2160": ["iPad 10 (10.9-inch)"],
    "1640x2360": ["iPad Air 4/5 (10.9-inch)"],
    "1668x2224": ["iPad Pro 10.5 / Air 3"],
    "1668x2388": ["iPad Pro 11 (all generations)"],
    "2048x2732": ["iPad Pro 12.9 (3rd gen and later)"],
    "1488x2266": ["iPad mini 6"],
  } as const;

  type IphoneKey = keyof typeof iphoneTable;
  type IpadKey = keyof typeof ipadTable;
  const isIphoneKey = (k: string): k is IphoneKey => k in iphoneTable;
  const isIpadKey = (k: string): k is IpadKey => k in ipadTable;

  if (isIphoneKey(key)) {
    const candidates = iphoneTable[key];
    const [family, cutoff] = candidates[0];
    if (cutoff === undefined || iosVersion === 0 || iosVersion >= cutoff)
      return family;
    return family;
  }
  if (isIpadKey(key)) return ipadTable[key][0];
  return `${Math.round(width)}x${Math.round(height)}pt iOS device`;
}

function parseIosVersion(): number {
  if (!globalThis.navigator) return 0;
  const match = globalThis.navigator.userAgent.match(/OS (\d+)[._]/);
  return match ? Number(match[1]) : 0;
}
