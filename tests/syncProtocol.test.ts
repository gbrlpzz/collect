import { describe, expect, it } from "vitest";
import { buildMediaObjectPath, hasServerReceipt } from "../src/lib/syncProtocol";

describe("sync protocol identities", () => {
  it("uses immutable media object paths", () => {
    expect(buildMediaObjectPath("project", "submission", "media")).toBe("projects/project/submissions/submission/media");
    expect(buildMediaObjectPath("project", "submission", "media")).toBe(buildMediaObjectPath("project", "submission", "media"));
  });

  it("recognizes only the synced state as a server receipt", () => {
    expect(hasServerReceipt("SYNCED")).toBe(true);
    expect(hasServerReceipt("SAVED_LOCAL")).toBe(false);
    expect(hasServerReceipt("FINALIZING")).toBe(false);
  });
});
