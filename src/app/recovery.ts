import { strToU8, zip, zipSync } from "fflate";
import type { Observation, Project } from "../types";
import { readStoredRecoveryData } from "../lib/localStore";
import { downloadZip } from "../lib/download";

interface RecoveryExportInput {
  project: Project;
  observations: Observation[];
  onComplete?: () => void;
}

/**
 * Durable recovery package: built from the IndexedDB stores directly, so it
 * still works in recovery mode (unreadable/absent app-state singleton) and
 * includes outbox, receipts, drafts, projects, and media rows that exist only
 * in MEDIA_STORE. This is the explicit escape hatch for local data.
 */
export async function exportRecoveryPackage({
  project,
  observations,
  onComplete,
}: RecoveryExportInput): Promise<void> {
  const durable = await readStoredRecoveryData().catch(() => null);
  const durableSubmissions = durable?.submissions ?? [];
  const submissions = durableSubmissions.length
    ? durableSubmissions
    : observations;

  // Media blobs come from the durable store first (they are the canonical
  // copy); in-memory assets are the fallback for a fresh un-persisted pick.
  const mediaById = new Map(
    (durable?.media ?? []).map((media) => [media.id, media]),
  );
  const mediaEntries: Record<string, Uint8Array> = {};
  const processedMediaIds = new Set<string>();

  for (const observation of submissions) {
    for (const asset of observation.media ?? []) {
      const blob = asset.blob ?? mediaById.get(asset.id)?.blob ?? null;
      if (!blob) continue;
      const safeName = (asset.name || `${asset.id}.bin`).replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      try {
        mediaEntries[`media/${observation.id}/${asset.id}-${safeName}`] =
          new Uint8Array(await blob.arrayBuffer());
        processedMediaIds.add(asset.id);
      } catch {
        // A corrupt single blob must not abort the whole export.
      }
    }
  }

  // Include any remaining standalone/orphan media blobs from MEDIA_STORE so no media is lost
  for (const durableMedia of durable?.media ?? []) {
    if (processedMediaIds.has(durableMedia.id) || !durableMedia.blob) continue;
    const safeName = (
      durableMedia.originalFilename || `${durableMedia.id}.bin`
    ).replace(/[^a-zA-Z0-9._-]/g, "_");
    try {
      mediaEntries[`media/stored/${durableMedia.id}-${safeName}`] =
        new Uint8Array(await durableMedia.blob.arrayBuffer());
    } catch {
      // ignore single blob read error
    }
  }

  const entries = {
    "manifest.json": strToU8(
      JSON.stringify(
        {
          format: "collect-recovery-v1",
          exported_at: new Date().toISOString(),
          project_id: project.id,
          schema_version: project.schemaVersion,
          observation_count: submissions.length,
          synced_observation_count: submissions.filter(
            (item) => item.status === "SYNCED",
          ).length,
          unsynced_observation_count: submissions.filter(
            (item) => item.status !== "SYNCED",
          ).length,
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
            media: observation.media?.map(
              ({ blob: _blob, ...metadata }) => metadata,
            ),
          }),
        )
        .join("\n"),
    ),
    ...mediaEntries,
  } satisfies Record<string, Uint8Array>;

  const durableEntries: Record<string, Uint8Array> = {};
  if (durable) {
    durableEntries["durable/outbox.json"] = strToU8(
      JSON.stringify(durable.outbox, null, 2),
    );
    durableEntries["durable/receipts.json"] = strToU8(
      JSON.stringify(durable.receipts, null, 2),
    );
    if (durable.drafts !== undefined)
      durableEntries["durable/drafts.json"] = strToU8(
        JSON.stringify(durable.drafts, null, 2),
      );
    if (durable.projects !== undefined)
      durableEntries["durable/projects.json"] = strToU8(
        JSON.stringify(durable.projects, null, 2),
      );
  }
  const allEntries = { ...entries, ...durableEntries };

  // fflate's async zip runs on its worker pool, keeping the export off the
  // main thread for large media. Falls back to zipSync if workers are unavailable.
  let archive: Uint8Array;
  try {
    archive = await new Promise<Uint8Array>((resolve, reject) => {
      zip(allEntries, { level: 0 }, (error, data) => {
        if (error) reject(error);
        else resolve(data);
      });
    });
  } catch {
    archive = zipSync(allEntries, { level: 0 });
  }

  const filename = `collect-recovery-${new Date().toISOString().slice(0, 10)}.zip`;
  downloadZip(archive, filename);
  onComplete?.();
}
