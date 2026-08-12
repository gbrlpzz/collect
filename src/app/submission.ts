import type { MediaAsset, Observation, Project } from "../types";
import { collectEnvironment } from "../lib/deviceInfo";
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

  // A fresh location fix is captured at submit time when the browser permits it.
  // Failure to obtain a fix never blocks the durable local receipt.
  let submittedValues = values;
  if ("geolocation" in navigator) {
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
    if (freshLocation) submittedValues = { ...values, location: freshLocation };
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
    media: mediaAssets,
  };
  const media = mediaFromAssets(mediaAssets, id, "field-site-photos");
  const submission: DurableSubmission = {
    id,
    projectId: project.id,
    schemaVersionId: `${project.id}-v${project.schemaVersion}`,
    payload: submittedValues,
    environment: environment as unknown as Record<string, unknown>,
    payloadHash: null,
    clientCreatedAt,
    deviceId,
    appVersion,
    status: "SAVED_LOCAL",
  };

  await commitLocalSubmission({ observation, media, submission });
  return { observation, media, submission };
}
