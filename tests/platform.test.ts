// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { handoffToSafari, safariHandoffHref } from "../src/lib/platform";

describe("safariHandoffHref", () => {
  it("rewrites https URLs to Safari's private scheme", () => {
    expect(safariHandoffHref("https://collect.example.org/app")).toBe(
      "x-safari-https://collect.example.org/app",
    );
    expect(
      safariHandoffHref("https://collect.example.org/app?role=admin"),
    ).toBe("x-safari-https://collect.example.org/app?role=admin");
  });

  it("leaves non-https URLs untouched", () => {
    expect(safariHandoffHref("http://localhost:5173/app")).toBeNull();
    expect(safariHandoffHref("/app")).toBeNull();
  });
});

describe("handoffToSafari", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copies the https URL then assigns the Safari scheme", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    });

    const copied = await handoffToSafari("https://collect.example.org/app");

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://collect.example.org/app");
    expect(assign).toHaveBeenCalledWith(
      "x-safari-https://collect.example.org/app",
    );
  });

  it("still returns false and skips assign when the URL is not https", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    });

    const copied = await handoffToSafari("http://localhost:5173/app");

    expect(copied).toBe(true);
    expect(writeText).toHaveBeenCalledWith("http://localhost:5173/app");
    expect(assign).not.toHaveBeenCalled();
  });

  it("still assigns the scheme when the clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    });

    const copied = await handoffToSafari("https://collect.example.org/app");

    expect(copied).toBe(false);
    expect(assign).toHaveBeenCalledWith(
      "x-safari-https://collect.example.org/app",
    );
  });
});
