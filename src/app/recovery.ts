import { strToU8, zipSync } from "fflate";
import type { Observation, Project } from "../types";

interface RecoveryExportInput {
  project: Project;
  observations: Observation[];
  onComplete: () => void;
}

export async function exportRecoveryPackage({
  project,
  observations,
  onComplete,
}: RecoveryExportInput): Promise<void> {
  const unsynced = observations.filter((item) => item.status !== "SYNCED");
  const entries: Record<string, Uint8Array> = {
    "manifest.json": strToU8(
      JSON.stringify(
        {
          format: "collect-recovery-v1",
          exported_at: new Date().toISOString(),
          project_id: project.id,
          schema_version: project.schemaVersion,
          observation_count: unsynced.length,
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
      unsynced
        .map((observation) =>
          JSON.stringify({
            ...observation,
            media: observation.media?.map(({ blob, ...metadata }) => metadata),
          }),
        )
        .join("\n"),
    ),
  };

  for (const observation of unsynced) {
    for (const asset of observation.media ?? []) {
      if (asset.blob)
        entries[`media/${observation.id}/${asset.id}-${asset.name}`] =
          new Uint8Array(await asset.blob.arrayBuffer());
    }
  }

  const archive = zipSync(entries, { level: 0 });
  const blob = new Blob([archive], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `collect-recovery-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click();
  URL.revokeObjectURL(url);
  onComplete();
}
