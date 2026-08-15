import type { MediaAsset } from "../types";

/** Compute a browser-native SHA-256 without copying media into application state. */
export async function sha256Blob(blob: Blob): Promise<string | undefined> {
  if (!globalThis.crypto?.subtle) return undefined;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Finish any hashes that did not complete while the contributor was answering.
 * This is the save-boundary backstop: hashing normally happens in the
 * background, but a very fast submission still receives integrity metadata.
 */
export async function ensureMediaHashes(
  assets: MediaAsset[],
): Promise<MediaAsset[]> {
  const complete: MediaAsset[] = [];
  // Sequential fallback bounds peak memory on devices with several large
  // photos. Most assets already have a hash from background processing.
  for (const asset of assets) {
    if (asset.sha256 || !asset.blob) {
      complete.push(asset);
      continue;
    }
    const sha256 = await sha256Blob(asset.blob);
    complete.push(sha256 ? { ...asset, sha256 } : asset);
  }
  return complete;
}
