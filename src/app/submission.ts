import type { MediaAsset, Observation, Project } from "../types";
import { collectEnvironment } from "../lib/deviceInfo";
import { extractAttentionResponse } from "../lib/attention";
import { ensureMediaHashes } from "../lib/mediaIntegrity";
import type { EnvironmentInfo } from "../lib/deviceInfo";
import {
  commitLocalSubmission,
  getOrCreateDeviceId,
  mediaFromAssets,
  type DurableMedia,
  type DurableSubmission,
} from "../lib/localStore";

interface CommitLocalObservationInput {
  project: Project;
  values: Record<string, unknown>;
  mediaAssets: MediaAsset[];
  appVersion: string;
}

interface CommittedObservation {
  observation: Observation;
  media: DurableMedia[];
  submission: DurableSubmission;
}

export async function commitLocalObservation({
  project,
  values,
  mediaAssets,
  appVersion,
}: CommitLocalObservationInput): Promise<CommittedObservation> {
  const id = crypto.randomUUID();
  const clientCreatedAt = new Date().toISOString();
  const deviceId = await getOrCreateDeviceId();
  const durableMediaAssets = await ensureMediaHashes(mediaAssets);

  // The automatic attention check (injected by the collector as
  // "_attention" = "checkKey:selectedValue") is stripped from the research
  // payload and carried separately to the server, which validates it.
  const { values: cleanedValues, response: attentionResponse } =
    extractAttentionResponse(values);

  // Only declared schema keys may enter the research payload. The draft also
  // carries a UI-only "observed_date" seed for the demo schema; on real
  // deployments that key is not a declared field and must not be persisted as
  // research data. Filtering here also guarantees the reserved attention key
  // (already stripped above) can never re-enter the payload.
  const declaredKeys = new Set(project.fields.map((field) => field.key));
  let submittedValues = Object.fromEntries(
    Object.entries(cleanedValues).filter(([key]) => declaredKeys.has(key)),
  );

  // A fresh location fix is captured at submit time when the browser permits it.
  // Failure to obtain a fix never blocks the durable local receipt.
  // The fresh fix is written to every declared location field key so a schema
  // with a non-"location" key (e.g. "gps") still records coordinates. The
  // merge stays on cleanedValues so stripped auxiliary keys (e.g. the
  // attention answer) never re-enter the research payload.
  const locationFields = project.fields.filter(
    (field) => field.type === "location",
  );
  const hasFreshLocation = locationFields.every((field) => {
    const value = cleanedValues[field.key];
    if (!value || typeof value !== "object") return false;
    const capturedAt = Date.parse(
      String((value as { capturedAt?: unknown }).capturedAt ?? ""),
    );
    return Number.isFinite(capturedAt) && Date.now() - capturedAt < 30_000;
  });
  if (
    locationFields.length &&
    !hasFreshLocation &&
    "geolocation" in navigator
  ) {
    const freshLocation = await new Promise<Record<string, unknown> | null>(
      (resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) =>
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              capturedAt: new Date().toISOString(),
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              autoCaptured: true,
            }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 },
        );
      },
    );
    if (freshLocation) {
      submittedValues = {
        ...submittedValues,
        ...Object.fromEntries(
          locationFields.map((field) => [field.key, freshLocation]),
        ),
      };
    }
  }

  const environment = await collectEnvironment();
  const observation: Observation = {
    id,
    projectId: project.id,
    createdAt: "Just now",
    clientCreatedAt,
    schemaVersion: project.schemaVersion,
    status: "SAVED_LOCAL",
    deviceId,
    values: submittedValues,
    media: durableMediaAssets,
    environment: environment as EnvironmentInfo & Record<string, unknown>,
    attentionResponse,
  };
  const media = mediaFromAssets(durableMediaAssets, id, "field-site-photos");
  const submission: DurableSubmission = {
    id,
    projectId: project.id,
    schemaVersionId: `${project.id}-v${project.schemaVersion}`,
    payload: submittedValues,
    environment: environment as EnvironmentInfo & Record<string, unknown>,
    attentionResponse,
    payloadHash: null,
    clientCreatedAt,
    deviceId,
    appVersion,
    status: "SAVED_LOCAL",
  };

  await commitLocalSubmission({ observation, media, submission });
  return { observation, media, submission };
}
