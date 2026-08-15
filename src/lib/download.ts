/**
 * Safe file download primitives for mobile and desktop browsers.
 *
 * Requirements:
 * 1. Firefox requires anchor elements to be attached to document.body
 *    before calling .click(), otherwise the click is silently ignored.
 * 2. Asynchronous window.open() calls get blocked by popup blockers
 *    on Safari (iOS/macOS) and Chrome; hidden anchor clicks with download
 *    attributes bypass popup blockers and don't open orphaned blank tabs.
 * 3. iOS Safari requires deferred blob URL revocation because the actual
 *    file saving occurs asynchronously after the system confirmation dialog.
 */

function sanitizeFilename(filename: string): string {
  return filename.replace(/[/\\?%*:|"<>]/g, "_").trim() || "download";
}

/**
 * Downloads an in-memory Blob as a file with the given filename.
 * Safe on iOS Safari, Chrome, Firefox, Safari desktop, and Android.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === "undefined" || !document.body) return;

  const safeName = sanitizeFilename(filename);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");

  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }

  // Defer revocation: iOS Safari and slow mobile devices need time to stream
  // the blob into the download directory after user confirmation.
  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 120_000);
  }
}

/**
 * Downloads raw binary zip data as a .zip file.
 */
export function downloadZip(archive: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(archive)], {
    type: "application/zip",
  });
  downloadBlob(blob, filename);
}

/**
 * Triggers a direct download for a remote URL (e.g. Supabase Storage signed URL)
 * without triggering popup blockers or opening orphaned blank tabs.
 */
export function downloadUrl(url: string, filename?: string): void {
  if (typeof document === "undefined" || !document.body) return;

  const link = document.createElement("a");
  link.href = url;
  if (filename) {
    link.download = sanitizeFilename(filename);
  }
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  link.setAttribute("aria-hidden", "true");

  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}
