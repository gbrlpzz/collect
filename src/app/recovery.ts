import { strToU8, zipSync } from "fflate";
import type { Observation, Project } from "../types";
import { readStoredRecoveryData } from "../lib/localStore";

interface RecoveryExportInput {
  project: Project;
  observations: Observation[];
  onComplete: () => void;
}

/**
 * Durable recovery package: built from the IndexedDB stores directly, so it
 * still works in recovery mode (unreadable/absent app-state singleton) and
 * includes outbox, receipts, drafts, projects, and media rows that exist only
 * in MEDIA_STORE. This is the explicit escape hatch for unsynced data.
 */
export async function exportRecoveryPackage({
  project,
  observations,
  onComplete,
}: RecoveryExportInput): Promise<void> {
  const durable = await readStoredRecoveryData().catch(() => null);
  const durableSubmissions = durable?.submissions ?? [];
  const submissions = durableSubmissions.length
    ? durableSubmissions.filter((item) => item.status !== "SYNCED")
    : observations.filter((item) => item.status !== "SYNCED");

  // Media blobs come from the durable store first (they are the canonical
  // copy); in-memory assets are the fallback for a fresh un-persisted pick.
  const mediaById = new Map(
    (durable?.media ?? []).map((media) => [media.id, media]),
  );
  const mediaEntries: Record<string, Uint8Array> = {};
  for (const observation of submissions) {
    for (const asset of observation.media ?? []) {
      const blob = asset.blob ?? mediaById.get(asset.id)?.blob ?? null;
      if (!blob) continue;
      try {
        mediaEntries[`media/${observation.id}/${asset.id}-${asset.name}`] =
          new Uint8Array(await blob.arrayBuffer());
      } catch {
        // A corrupt single blob must not abort the whole export.
      }
    }
  }

  const entries: Record<string, Uint8Array> = {
    "manifest.json": strToU8(
      JSON.stringify(
        {
          format: "collect-recovery-v1",
          exported_at: new Date().toISOString(),
          project_id: project.id,
          schema_version: project.schemaVersion,
          observation_count: submissions.length,
          outbox_operation_count: durable?.outbox.length ?? 0,
          receipt_count:
            durable && Array.isArray(durable.receipts)
              ? durable.receipts.length
              : 0,
          note: "Local recovery package. Records remain on this device after export.",
        },
        null,
        2,
      ),
    ),
    [`schema/schema-v${project.schemaVersion}.json`]: strToU8(
      JSON.stringify(project.fields, null, 2),
    ),
    "data/submissions.jsonl": strToU8(
      submissions
        .map((observation) =>
          JSON.stringify({
            ...observation,
            media: observation.media?.map(({ blob, ...metadata }) => metadata),
          }),
        )
        .join("\n"),
    ),
    ...mediaEntries,
  };

  if (durable) {
    entries["durable/outbox.json"] = strToU8(
      JSON.stringify(durable.outbox, null, 2),
    );
    entries["durable/receipts.json"] = strToU8(
      JSON.stringify(durable.receipts, null, 2),
    );
    if (durable.drafts !== undefined)
      entries["durable/drafts.json"] = strToU8(
        JSON.stringify(durable.drafts, null, 2),
      );
    if (durable.projects !== undefined)
      entries["durable/projects.json"] = strToU8(
        JSON.stringify(durable.projects, null, 2),
      );
  }

  const archive = zipSync(entries, { level: 0 });
  const blob = new Blob([archive], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `collect-recovery-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click();
  // Defer revocation: some browsers cancel the download if the URL is gone
  // before the download starts.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  onComplete();
}
