import { beforeEach, describe, expect, it } from "vitest";
import { indexedDB } from "fake-indexeddb";
import type { AppState, Observation } from "../src/types";
import {
  commitLocalSubmission,
  getOutboxOperations,
  loadAppState,
  markLocalSubmissionsSynced,
  recordOutboxFailure,
} from "../src/lib/localStore";

Object.defineProperty(globalThis, "indexedDB", {
  value: indexedDB,
  configurable: true,
});
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
});

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("collect-local-v1");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("database delete blocked"));
  });
}

const observation: Observation = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: "Just now",
  clientCreatedAt: "2026-08-09T08:00:00.000Z",
  status: "SAVED_LOCAL",
  values: { site_code: "VA-001" },
  media: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "site.jpg",
      mimeType: "image/jpeg",
      byteSize: 4,
      blob: new Blob([new Uint8Array([1, 2, 3, 4])]),
    },
  ],
};

const state: AppState = {
  view: "home",
  mode: "contributor",
  draft: {},
  observations: [],
  lastSavedAt: null,
  storagePersistence: "unknown",
  storageUsage: null,
  project: {
    id: "project-test",
    organization: "Test",
    organizationMark: "T",
    name: "Test project",
    description: "",
    instructions: "",
    status: "active",
    schemaVersion: 1,
    contributors: 1,
    completeSubmissions: 0,
    lastReceived: "",
    fields: [],
  },
};

describe("durable local receipt boundary", () => {
  beforeEach(async () => {
    await deleteDatabase();
  });

  it("commits the submission, media, and outbox before it can be acknowledged", async () => {
    await commitLocalSubmission({
      observation,
      media: [
        {
          id: observation.media![0].id,
          submissionId: observation.id,
          fieldId: "field-photo",
          mimeType: "image/jpeg",
          byteSize: 4,
          originalFilename: "site.jpg",
          blob: observation.media![0].blob,
          uploadState: "QUEUED",
        },
      ],
      submission: {
        id: observation.id,
        projectId: "project-test",
        schemaVersionId: "schema-v1",
        schemaVersion: 1,
        payload: observation.values,
        payloadHash: null,
        clientCreatedAt: observation.clientCreatedAt!,
        deviceId: "33333333-3333-4333-8333-333333333333",
        appVersion: "0.1.0",
        status: "SAVED_LOCAL",
      },
    });
    const saved = await loadAppState();
    expect(saved?.observations?.[0].status).toBe("SAVED_LOCAL");
    expect(
      (await getOutboxOperations())
        .map((operation) => operation.operationType)
        .sort(),
    ).toEqual(["CREATE_SUBMISSION", "FINALIZE_SUBMISSION", "UPLOAD_MEDIA"]);
  });

  it("keeps a retryable error and every operation recoverable", async () => {
    await commitLocalSubmission({
      observation,
      media: [],
      submission: {
        id: observation.id,
        projectId: "project-test",
        schemaVersionId: "schema-v1",
        schemaVersion: 1,
        payload: observation.values,
        payloadHash: null,
        clientCreatedAt: observation.clientCreatedAt!,
        deviceId: "33333333-3333-4333-8333-333333333333",
        appVersion: "0.1.0",
        status: "SAVED_LOCAL",
      },
    });
    await recordOutboxFailure(observation.id, "temporary network failure");
    expect((await loadAppState())?.observations?.[0].status).toBe(
      "RETRYABLE_ERROR",
    );
    const operations = await getOutboxOperations();
    expect(operations).toHaveLength(2);
    expect(
      operations.every(
        (operation) =>
          operation.state === "RETRYABLE_ERROR" && operation.attempts === 1,
      ),
    ).toBe(true);
  });

  it("clears the field-data queue only after the explicit receipt boundary", async () => {
    await commitLocalSubmission({
      observation,
      media: [
        {
          id: observation.media![0].id,
          submissionId: observation.id,
          fieldId: "field-photo",
          mimeType: "image/jpeg",
          byteSize: 4,
          originalFilename: "site.jpg",
          blob: observation.media![0].blob,
          uploadState: "QUEUED",
        },
      ],
      submission: {
        id: observation.id,
        projectId: "project-test",
        schemaVersionId: "schema-v1",
        schemaVersion: 1,
        payload: observation.values,
        payloadHash: null,
        clientCreatedAt: observation.clientCreatedAt!,
        deviceId: "33333333-3333-4333-8333-333333333333",
        appVersion: "0.1.0",
        status: "SAVED_LOCAL",
      },
    });
    expect((await getOutboxOperations()).length).toBe(3);
    await markLocalSubmissionsSynced([observation.id], {
      receivedAt: "2026-08-09T08:01:00.000Z",
      finalizedAt: "2026-08-09T08:01:01.000Z",
      demo: false,
    });
    expect((await loadAppState())?.observations?.[0].status).toBe("SYNCED");
    expect(await getOutboxOperations()).toEqual([]);
  });
});
