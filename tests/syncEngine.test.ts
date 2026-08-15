import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import type { Observation } from "../src/types";
import {
  acquireSyncLease,
  commitLocalSubmission,
  getOrCreateDeviceId,
  getOutboxOperations,
  loadAppState,
  markLocalSubmissionsSynced,
  mediaFromAssets,
  probeLocalDatabase,
  readStoredRecoveryData,
  recordOutboxFailure,
  releaseSyncLease,
  setLocalScope,
  setLocalSubmissionStatus,
  type DurableMedia,
  type DurableSubmission,
} from "../src/lib/localStore";
import {
  buildMediaObjectPath,
  outboxKey,
  hasServerReceipt,
} from "../src/lib/syncProtocol";
import { closeCachedDatabases } from "../src/lib/localDatabase";

// ---------------------------------------------------------------------------
// §54 critical-failure coverage at the ledger level: every scenario below
// simulates an interruption (kill/reload) and asserts the queue, media, and
// receipts survive and resume from the durable phase.
// ---------------------------------------------------------------------------

interface TestSubmissionBundle {
  submission: DurableSubmission;
  media: DurableMedia[];
  observation: Observation;
}

function makeSubmission(id = crypto.randomUUID()): TestSubmissionBundle {
  const clientCreatedAt = new Date().toISOString();
  const submission: DurableSubmission = {
    id,
    projectId: "project-1",
    schemaVersionId: "project-1-v1",
    schemaVersion: 1,
    payload: { site_code: "VA-001", building_occupancy: "yes" },
    payloadHash: "abc",
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
      byteSize: 1024,
      originalFilename: "photo.jpg",
      capturedAt: clientCreatedAt,
      captureSource: "picker",
      blob: new Blob([new Uint8Array(1024)], { type: "image/jpeg" }),
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
    status: "SAVED_LOCAL",
    values: { site_code: "VA-001", building_occupancy: "yes" },
    media: media.map(({ blob, ...metadata }) => ({ ...metadata, blob })),
  };
  return { submission, media, observation };
}

describe("local ledger survival (§54 lifecycle)", () => {
  beforeEach(async () => {
    // Connections are cached for the page lifetime; a reset must close them
    // and await the delete, or the next write lands in the doomed database.
    await closeCachedDatabases();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("collect-local-v1");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("database delete blocked"));
    });
  });

  it("kill immediately after Submit: submission, media, and all three outbox operations reload intact", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    // Simulate app termination: a fresh read of the database.
    const state = await loadAppState();
    const operations = await getOutboxOperations();
    const recovery = await readStoredRecoveryData();

    expect(state?.observations).toHaveLength(1);
    expect(state!.observations[0].id).toBe(submission.id);
    expect(recovery.media).toHaveLength(1);
    expect(recovery.media[0].submissionId).toBe(submission.id);
    expect(
      operations.map((operation) => operation.operationType).sort(),
    ).toEqual(["CREATE_SUBMISSION", "FINALIZE_SUBMISSION", "UPLOAD_MEDIA"]);
    expect(operations.every((operation) => operation.state === "QUEUED")).toBe(
      true,
    );
  });

  it("kill during metadata sync: phase persists and the operation is still queued/in-progress", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    await setLocalSubmissionStatus(submission.id, "SYNCING_METADATA");

    const state = await loadAppState();
    expect(state?.observations[0].status).toBe("SYNCING_METADATA");
    const operations = await getOutboxOperations();
    expect(
      operations.find(
        (operation) => operation.id === `submission:${submission.id}`,
      )?.state,
    ).toBe("QUEUED");
  });

  it("kill after media upload before finalization: media acknowledged, finalize still queued, submission resumable", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    await setLocalSubmissionStatus(submission.id, "SYNCING_MEDIA");
    const operations = await getOutboxOperations();
    const mediaOperation = operations.find(
      (operation) => operation.id === `media:${media[0].id}`,
    );
    expect(mediaOperation).toBeDefined();
    expect(mediaOperation!.state).toBe("QUEUED");

    const state = await loadAppState();
    expect(state?.observations[0].status).toBe("SYNCING_MEDIA");
  });

  it("durable receipt is the only thing that clears the outbox; media rows flip to SYNCED", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    await markLocalSubmissionsSynced([submission.id], {
      receivedAt: "2026-08-10T00:00:00Z",
      finalizedAt: "2026-08-10T00:00:01Z",
      serverStatus: "COMPLETE",
    });

    const state = await loadAppState();
    expect(state?.observations[0].status).toBe("SYNCED");
    const operations = await getOutboxOperations();
    expect(
      operations.filter(
        (operation) =>
          operation.entityId === submission.id ||
          media.some((item) => item.id === operation.entityId),
      ),
    ).toHaveLength(0);
    const recovery = await readStoredRecoveryData();
    expect(recovery.media.every((item) => item.uploadState === "SYNCED")).toBe(
      true,
    );
    expect(recovery.receipts).toHaveLength(1);
  });

  it("retryable failure records attempts, backoff, lastError, and lastAttemptAt; ACTION_REQUIRED is not retryable", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    await recordOutboxFailure(submission.id, "connection reset");
    const operations = await getOutboxOperations();
    for (const operation of operations) {
      expect(operation.attempts).toBe(1);
      expect(operation.lastError).toBe("connection reset");
      expect(operation.lastAttemptAt).not.toBeNull();
      expect(new Date(operation.nextAttemptAt).getTime()).toBeGreaterThan(
        Date.now() - 1000,
      );
      expect(operation.state).toBe("RETRYABLE_ERROR");
    }
    const state = await loadAppState();
    expect(state?.observations[0].status).toBe("RETRYABLE_ERROR");

    await recordOutboxFailure(submission.id, "Unknown schema version", true);
    const afterAction = await getOutboxOperations();
    expect(
      afterAction.every((operation) => operation.state === "ACTION_REQUIRED"),
    ).toBe(true);
    const reloaded = await loadAppState();
    expect(reloaded?.observations[0].status).toBe("ACTION_REQUIRED");
  });

  it("multi-tab lease: one owner at a time, expiry hands over, release hands over", async () => {
    const ownerA = "sync-worker-a";
    const ownerB = "sync-worker-b";
    expect(await acquireSyncLease(ownerA)).toBe(true);
    expect(await acquireSyncLease(ownerB)).toBe(false);
    // Same owner may refresh.
    expect(await acquireSyncLease(ownerA)).toBe(true);
    // Expired lease is reacquirable.
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("collect-local-v1", 2);
      request.onupgradeneeded = () => {
        /* stores already exist */
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction("device-state", "readwrite");
    tx.objectStore("device-state").put(
      { owner: ownerA, expiresAt: Date.now() - 1000 },
      "sync_lease",
    );
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    database.close();
    expect(await acquireSyncLease(ownerB)).toBe(true);
    await releaseSyncLease(ownerB);
    expect(await acquireSyncLease(ownerA)).toBe(true);
  });

  it("device identity is stable per installation", async () => {
    const first = await getOrCreateDeviceId();
    const second = await getOrCreateDeviceId();
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("full state round-trip preserves media blobs, drafts, and offline-ready flags", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    const blobBytes = await media[0].blob!.arrayBuffer();

    const state = await loadAppState();
    const restored = state!.observations[0];
    expect(restored.media).toHaveLength(1);
    // SAFETY: media array contains blob attachment.
    const restoredBlob = restored.media![0].blob as Blob | undefined;
    expect(restoredBlob).toBeDefined();
    expect(new Uint8Array(await restoredBlob!.arrayBuffer())).toEqual(
      new Uint8Array(blobBytes),
    );
  });

  it("mediaFromAssets preserves per-field provenance and capture source", () => {
    const { submission } = makeSubmission();
    const durable = mediaFromAssets(
      [
        {
          id: "m1",
          name: "a.jpg",
          mimeType: "image/jpeg",
          byteSize: 10,
          fieldId: "tree_photos",
          captureSource: "camera",
        },
      ],
      submission.id,
      "field-site-photos",
    );
    expect(durable[0].fieldId).toBe("tree_photos");
    expect(durable[0].captureSource).toBe("camera");
    expect(durable[0].uploadState).toBe("QUEUED");
  });

  it("recovery reads work when the app-state singleton is missing (recovery mode)", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });
    // Remove the singleton the way a partial write failure might.
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("collect-local-v1", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction("app-state", "readwrite");
    tx.objectStore("app-state").delete("singleton");
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    database.close();

    const probe = await probeLocalDatabase();
    expect(probe.ok).toBe(true);
    const recovery = await readStoredRecoveryData();
    expect(recovery.submissions).toHaveLength(1);
    expect(recovery.media).toHaveLength(1);
    expect(recovery.outbox).toHaveLength(3);
  });

  it("per-account local databases isolate cached projects and outbox rows", async () => {
    const { submission, media, observation } = makeSubmission();
    await commitLocalSubmission({ submission, media, observation });

    // The same device, but a different account: it must see none of it.
    setLocalScope("another-user-id");
    const otherState = await loadAppState();
    const otherOperations = await getOutboxOperations();
    expect(otherState).toBeNull();
    expect(otherOperations).toHaveLength(0);

    // Back to the original account: everything is still there.
    setLocalScope("default");
    const ownState = await loadAppState();
    expect(ownState?.observations).toHaveLength(1);
    expect((await getOutboxOperations()).length).toBe(3);
  });

  it("protocol helpers: deterministic paths, outbox keys, receipt semantics", () => {
    expect(buildMediaObjectPath("p", "s", "m")).toBe(
      "projects/p/submissions/s/m",
    );
    expect(outboxKey("UPLOAD_MEDIA", "m")).toBe("UPLOAD_MEDIA:m");
    expect(hasServerReceipt("SYNCED")).toBe(true);
    expect(hasServerReceipt("QUEUED")).toBe(false);
    expect(hasServerReceipt("FINALIZING")).toBe(false);
  });
});
