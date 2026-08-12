import { describe, expect, it } from "vitest";
import { ensureMediaHashes, sha256Blob } from "../src/lib/mediaIntegrity";
import type { MediaAsset } from "../src/types";

describe("media integrity", () => {
  it("produces the standard SHA-256 digest for a blob", async () => {
    await expect(sha256Blob(new Blob(["hello"]))).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("fills only missing hashes and preserves asset order", async () => {
    const assets: MediaAsset[] = [
      {
        id: "first",
        name: "first.txt",
        mimeType: "text/plain",
        byteSize: 5,
        blob: new Blob(["hello"]),
      },
      {
        id: "second",
        name: "second.jpg",
        mimeType: "image/jpeg",
        byteSize: 1,
        sha256: "already-hashed",
      },
    ];

    const result = await ensureMediaHashes(assets);

    expect(result.map(({ id }) => id)).toEqual(["first", "second"]);
    expect(result[0].sha256).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(result[1]).toBe(assets[1]);
  });
});
