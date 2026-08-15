import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import type { Session } from "@supabase/supabase-js";
import type { AppState, Observation } from "../src/types";
import type { RemoteReceipt } from "../src/lib/remoteBackend";
import {
  commitLocalSubmission,
  getOutboxOperations,
  getPendingOutboxCountsByProject,
  loadAppState,
  markLocalSubmissionsSynced,
  markOutboxOperation,
  migrateLegacyDatabase,
  readStoredRecoveryData,
  recordOutboxFailure,
  setLocalScope,
  type DurableMedia,
  type DurableSubmission,
} from "../src/lib/localStore";
import {
  SUBMISSIONS_STORE,
  closeCachedDatabases,
  createRequest,
  openDatabaseByName,
} from "../src/lib/localDatabase";
import {
  ActionRequiredError,
  isActionRequiredFailure,
} from "../src/lib/syncErrors";
import { syncNow } from "../src/app/syncController";

const DATABASE_NAMES = [
  "collect-local-v1",
  "collect-local-v1-scopea",
  "collect-local-v1-scopeb",
  "collect-local-v1-scopec",
];

async function resetDatabases(): Promise<void> {
  // Connections are cached for the page lifetime; a reset must close them
  // before deleting, or the delete blocks on the open handles.
  await closeCachedDatabases();
  await Promise.all(
    DATABASE_NAMES.map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () =>
            reject(new Error(`database delete blocked: ${name}`));
        }),
    ),
  );
}

interface SubmissionBundle {
  submission: DurableSubmission;
  media: DurableMedia[];
  observation: Observation;
}

function makeSubmission(): SubmissionBundle {
  const id = crypto.randomUUID();
  const clientCreatedAt = new Date().toISOString();
  const submission: DurableSubmission = {
    id,
    projectId: "project-1",
    schemaVersionId: "project-1-v1",
    schemaVersion: 1,
    payload: { site_code: "VA-001" },
    payloadHash: null,
    clientCreatedAt,
    deviceId: "device-1",
    appVersion: "0.1.2",
    status: "SAVED_LOCAL",
  };
  const media: DurableMedia[] = [
    {
      id: crypto.randomUUID(),
      submissionId: id,
      fieldId: "site_photos",
      mimeType: "image/jpeg",
      byteSize: 4,
      originalFilename: "photo.jpg",
      capturedAt: clientCreatedAt,
      captureSource: "picker",
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/jpeg" }),
      uploadState: "QUEUED",
    },
  ];
  const observation: Observation = {
    id,
    projectId: "project-1",
    createdAt: "Just now",
    clientCreatedAt,
    schemaVersion: 1,
    deviceId: "device-1",
    status: "RETRYABLE_ERROR",
    values: { site_code: "VA-001" },
    media: media.map(({ blob, ...metadata }) => ({ ...metadata, blob })),
  };
  return { submission, media, observation };
}

const appStateWith = (observation: Observation): AppState => ({
  view: "home",
  mode: "contributor",
  draft: {},
  observations: [observation],
  lastSavedAt: null,
  storagePersistence: "unknown",
  storageUsage: null,
  project: {
    id: "project-1",
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
});

describe("sync resilience hardening", () => {
  beforeEach(async () => {
    await resetDatabases();
    setLocalScope("default");
  });

  it("reuses one cached connection per database and reopens after a reset", async () => {
    const first = await openDatabaseByName("collect-local-v1");
    const second = await openDatabaseByName("collect-local-v1");
    expect(second).toBe(first);
    await closeCachedDatabases();
    const third = await openDatabaseByName("collect-local-v1");
    expect(third).not.toBe(first);
  });

  it("recordOutboxFailure never downgrades acknowledged media operations", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    // Media phase succeeded before a later finalize failure.
    await markOutboxOperation(`media:${media[0].id}`, "ACKNOWLEDGED");

    await recordOutboxFailure(submission.id, "connection reset");

    const operations = await getOutboxOperations();
    const mediaOperation = operations.find(
      (operation) => operation.id === `media:${media[0].id}`,
    );
    expect(mediaOperation?.state).toBe("ACKNOWLEDGED");
    expect(mediaOperation?.attempts).toBe(0);
    for (const operation of operations) {
      if (operation.id === `media:${media[0].id}`) continue;
      expect(operation.state).toBe("RETRYABLE_ERROR");
      expect(operation.attempts).toBe(1);
    }
  });

  it("a durable server receipt prunes the local media blob in the same transaction", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    await markLocalSubmissionsSynced([submission.id], {
      receivedAt: "2026-08-14T00:00:00Z",
      finalizedAt: "2026-08-14T00:00:01Z",
      serverStatus: "COMPLETE",
    });

    const state = await loadAppState();
    expect(state?.observations[0].status).toBe("SYNCED");
    const recovery = await readStoredRecoveryData();
    expect(recovery.media).toHaveLength(0);
    expect(recovery.receipts).toHaveLength(1);
  });

  it("a demo receipt keeps the local blob (it is the only copy)", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    await markLocalSubmissionsSynced([submission.id], {
      receivedAt: "2026-08-14T00:00:00Z",
      serverStatus: "COMPLETE",
      demo: true,
    });

    const recovery = await readStoredRecoveryData();
    expect(recovery.media).toHaveLength(1);
    expect(recovery.media[0].uploadState).toBe("SYNCED");
  });

  it("classifies typed and patterned failures as action-required", () => {
    expect(
      isActionRequiredFailure(new ActionRequiredError("no local blob")),
    ).toBe(true);
    expect(isActionRequiredFailure(new Error("unknown schema version 9"))).toBe(
      true,
    );
    expect(isActionRequiredFailure(new Error("connection reset"))).toBe(false);
    expect(
      isActionRequiredFailure(new Error("Media m1 has no local blob")),
    ).toBe(true);
  });

  it("background sync honors the backoff schedule; a manual tap bypasses it", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    // One failed attempt pushes nextAttemptAt into the future.
    await recordOutboxFailure(submission.id, "connection reset");

    const remoteSync = vi.fn(async (): Promise<RemoteReceipt> => ({
      submission_id: submission.id,
      status: "COMPLETE",
      finalized_at: "2026-08-14T00:00:01Z",
      received_at: "2026-08-14T00:00:00Z",
    }));
    const args = () => ({
      state: appStateWith(observation),
      // SAFETY: syncNow only checks the session for truthiness; no session
      // field is read, so an empty object is a faithful stand-in.
      session: {} as Session,
      configured: true,
      appVersion: "test",
      pendingCount: 1,
      isSyncing: false,
      syncOwner: "test-owner",
      setState: () => undefined,
      setIsSyncing: () => undefined,
      setSyncProgress: () => undefined,
      showToast: () => undefined,
      remoteSync,
    });

    const background = await syncNow({ ...args(), silent: true });
    expect(background).toBe(false);
    expect(remoteSync).not.toHaveBeenCalled();

    const manual = await syncNow({ ...args(), silent: false });
    expect(manual).toBe(true);
    expect(remoteSync).toHaveBeenCalledTimes(1);
  });

  it("the legacy import is claimed by one scope before any copy", async () => {
    // Seed the shared legacy database with one submission.
    const legacy = await openDatabaseByName("collect-local-v1");
    const seedTx = legacy.transaction(SUBMISSIONS_STORE, "readwrite");
    const seeded = makeSubmission();
    seedTx
      .objectStore(SUBMISSIONS_STORE)
      .put(seeded.observation, seeded.submission.id);
    await new Promise<void>((resolve, reject) => {
      seedTx.oncomplete = () => resolve();
      seedTx.onerror = () => reject(seedTx.error);
    });

    // First account claims and imports.
    setLocalScope("scopea");
    await migrateLegacyDatabase("scopea");
    expect((await loadAppState())?.observations).toHaveLength(1);

    // A second account booting later must adopt none of it.
    setLocalScope("scopeb");
    await migrateLegacyDatabase("scopeb");
    expect(await loadAppState()).toBeNull();

    // A partially interrupted first run can resume its own claim.
    setLocalScope("scopec");
    const marker = await openDatabaseByName("collect-local-v1").then(
      (database) =>
        createRequest(
          database
            .transaction("settings", "readwrite")
            .objectStore("settings")
            .put("scopec", "legacy-imported-to"),
        ),
    );
    await marker;
    await migrateLegacyDatabase("scopec");
    expect((await loadAppState())?.observations).toHaveLength(1);
  });

  it("pending counts are grouped per project from one outbox read", async () => {
    const first = makeSubmission();
    const second = makeSubmission();
    second.submission.projectId = "project-2";
    await commitLocalSubmission({
      submission: first.submission,
      media: first.media,
      observation: first.observation,
    });
    await commitLocalSubmission({
      submission: second.submission,
      media: second.media,
      observation: second.observation,
    });
    await markOutboxOperation(`media:${first.media[0].id}`, "ACKNOWLEDGED");

    const counts = await getPendingOutboxCountsByProject();
    expect(counts.get("project-1")).toEqual({
      pendingSubmissions: 1,
      pendingMedia: 0,
    });
    expect(counts.get("project-2")).toEqual({
      pendingSubmissions: 1,
      pendingMedia: 1,
    });
  });
});
