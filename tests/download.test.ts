// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadBlob, downloadZip, downloadUrl } from "../src/lib/download";
import { isMobileDevice, isAppleMobileBrowser } from "../src/lib/platform";

describe("download module", () => {
  let createdLinks: HTMLAnchorElement[] = [];
  let appendedElements: HTMLElement[] = [];
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createdLinks = [];
    appendedElements = [];
    clickSpy = vi.fn();
    createObjectURLMock = vi.fn((blob: Blob) => `blob:mock-url-${blob.size}`);
    revokeObjectURLMock = vi.fn();

    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "a") {
          el.click = clickSpy;
          // SAFETY: document.createElement('a') creates an HTMLAnchorElement.
          createdLinks.push(el as HTMLAnchorElement);
        }
        return el;
      },
    );

    const originalAppendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, "appendChild").mockImplementation((node: Node) => {
      // SAFETY: appended nodes in this test are HTMLElements.
      appendedElements.push(node as HTMLElement);
      return originalAppendChild(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloadBlob appends hidden anchor to body, clicks, removes, and defers URL revocation", () => {
    const blob = new Blob(["test data"], { type: "text/plain" });
    downloadBlob(blob, "survey-data.txt");

    expect(createObjectURLMock).toHaveBeenCalledWith(blob);
    expect(createdLinks.length).toBe(1);

    const link = createdLinks[0];
    expect(link.download).toBe("survey-data.txt");
    expect(link.href).toContain("blob:mock-url-");
    expect(link.rel).toBe("noopener noreferrer");
    expect(link.style.display).toBe("none");

    expect(appendedElements).toContain(link);
    expect(clickSpy).toHaveBeenCalled();
    // Verify link is removed from DOM after click
    expect(document.body.contains(link)).toBe(false);

    // Verify URL is not revoked immediately (delayed for iOS Safari)
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it("downloadZip packages Uint8Array into application/zip Blob and triggers download", () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    downloadZip(data, "project_checkpoint.zip");

    expect(createdLinks.length).toBe(1);
    const link = createdLinks[0];
    expect(link.download).toBe("project_checkpoint.zip");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("downloadUrl attaches hidden anchor with download attribute without popup blockers", () => {
    downloadUrl(
      "https://storage.example.com/checkpoints/cp-123.zip",
      "my_checkpoint.zip",
    );

    expect(createdLinks.length).toBe(1);
    const link = createdLinks[0];
    expect(link.href).toBe(
      "https://storage.example.com/checkpoints/cp-123.zip",
    );
    expect(link.download).toBe("my_checkpoint.zip");
    expect(link.rel).toBe("noopener noreferrer");
    expect(appendedElements).toContain(link);
    expect(clickSpy).toHaveBeenCalled();
    expect(document.body.contains(link)).toBe(false);
  });

  it("sanitizes dangerous characters in filenames", () => {
    const blob = new Blob(["data"]);
    downloadBlob(blob, "../../evil:filename?.zip");

    expect(createdLinks.length).toBe(1);
    const link = createdLinks[0];
    expect(link.download).toBe(".._.._evil_filename_.zip");
  });

  it("isMobileDevice accurately detects mobile user agents and touch viewports", () => {
    const originalUserAgent = navigator.userAgent;

    // Test iOS user agent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
    expect(isAppleMobileBrowser()).toBe(true);
    expect(isMobileDevice()).toBe(true);

    // Test Android user agent
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
      configurable: true,
    });
    expect(isAppleMobileBrowser()).toBe(false);
    expect(isMobileDevice()).toBe(true);

    // Restore userAgent
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });
});
