// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { collectDeviceInfo, collectEnvironment } from "../src/lib/deviceInfo";

describe("device provenance", () => {
  it("detects iOS family from UA", () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", configurable: true });
    Object.defineProperty(window, "screen", { value: { width: 390, height: 844 }, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    const info = collectDeviceInfo();
    expect(info.os).toBe("iOS");
    expect(info.browser).toContain("Safari");
    expect(info.deviceModel).toContain("iPhone");
  });

  it("detects Android model from UA", () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36", configurable: true });
    const info = collectDeviceInfo();
    expect(info.os).toBe("Android");
    expect(info.deviceModel).toBe("SM-S928B");
    expect(info.browser).toContain("Chrome");
  });

  it("collects the full environment without throwing in a minimal DOM", async () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", configurable: true });
    const env = await collectEnvironment();
    expect(env.capturedAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(env.timezone).toBeTruthy();
    expect(typeof env.deviceModel).toBe("string");
    expect(typeof env.online).toBe("boolean");
    expect(env.screen).toBeTruthy();
  });
});
