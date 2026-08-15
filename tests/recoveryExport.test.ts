// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { exportRecoveryPackage } from "../src/app/recovery";
import type { Observation, Project } from "../src/types";
import * as localStore from "../src/lib/localStore";

describe("exportRecoveryPackage", () => {
  let capturedBlob: Blob | null = null;
  let capturedFilename: string | null = null;

  const mockProject: Project = {
    id: "proj-recovery-test",
    organization: "Research Lab",
    organizationMark: "R",
    name: "Biodiversity Survey",
    description: "Recovery test project",
    instructions: "",
    status: "active",
    schemaVersion: 1,
    license: "CC-BY-4.0",
    contactEmail: "lab@example.com",
    contributors: 2,
    completeSubmissions: 5,
    lastReceived: "2026-08-15T10:00:00.000Z",
    fields: [
      {
        id: "f1",
        key: "tree_species",
        label: "Tree Species",
        type: "short_text",
        required: true,
      },
      {
        id: "f2",
        key: "photo",
        label: "Photo",
        type: "photo",
      },
    ],
  };

  beforeEach(() => {
    capturedBlob = null;
    capturedFilename = null;

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return "blob:mock-recovery-zip";
      }),
      revokeObjectURL: vi.fn(),
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "a") {
          el.click = () => {
            // SAFETY: created anchor element is HTMLAnchorElement.
            capturedFilename = (el as HTMLAnchorElement).download;
          };
        }
        return el;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a complete recovery ZIP package containing manifest, schema, jsonl, durable stores, and media", async () => {
    const photoBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
      type: "image/jpeg",
    });

    const mockObservations: Observation[] = [
      {
        id: "obs-1",
        projectId: "proj-recovery-test",
        createdAt: "2026-08-15T09:00:00.000Z",
        schemaVersion: 1,
        deviceId: "dev-1",
        status: "SAVED_LOCAL",
        values: { tree_species: "Quercus robur" },
        media: [
          {
            id: "med-1",
            name: "oak.jpg",
            mimeType: "image/jpeg",
            byteSize: 4,
            blob: photoBlob,
          },
        ],
      },
      {
        id: "obs-2",
        projectId: "proj-recovery-test",
        createdAt: "2026-08-15T09:30:00.000Z",
        schemaVersion: 1,
        deviceId: "dev-1",
        status: "SYNCED",
        values: { tree_species: "Pinus sylvestris" },
      },
    ];

    vi.spyOn(localStore, "readStoredRecoveryData").mockResolvedValue({
      submissions: mockObservations,
      media: [],
      outbox: [
        {
          key: "submission:obs-1",
          type: "submission",
          submissionId: "obs-1",
          operation: "upsert",
          attemptCount: 0,
          lastAttemptAt: null,
          nextAttemptAt: null,
          error: null,
        },
      ],
      drafts: undefined,
      projects: [mockProject],
      appState: undefined,
      receipts: [],
    });

    const onComplete = vi.fn();
    await exportRecoveryPackage({
      project: mockProject,
      observations: mockObservations,
      onComplete,
    });

    expect(onComplete).toHaveBeenCalled();
    expect(capturedBlob).not.toBeNull();
    expect(capturedFilename).toMatch(
      /^collect-recovery-\d{4}-\d{2}-\d{2}\.zip$/,
    );

    // Unzip and inspect package contents
    const arrayBuffer = await capturedBlob!.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));

    const fileNames = Object.keys(unzipped);
    expect(fileNames).toContain("manifest.json");
    expect(fileNames).toContain("schema/schema-v1.json");
    expect(fileNames).toContain("data/submissions.jsonl");
    expect(fileNames).toContain("durable/outbox.json");
    expect(fileNames).toContain("media/obs-1/med-1-oak.jpg");

    // Check manifest
    const manifestJson = JSON.parse(strFromU8(unzipped["manifest.json"]));
    expect(manifestJson.format).toBe("collect-recovery-v1");
    expect(manifestJson.project_id).toBe("proj-recovery-test");
    expect(manifestJson.schema_version).toBe(1);
    expect(manifestJson.observation_count).toBe(2);
    expect(manifestJson.unsynced_observation_count).toBe(1);
    expect(manifestJson.synced_observation_count).toBe(1);
    expect(manifestJson.outbox_operation_count).toBe(1);

    // Check schema
    const schemaJson = JSON.parse(strFromU8(unzipped["schema/schema-v1.json"]));
    expect(schemaJson).toEqual(mockProject.fields);

    // Check jsonl
    const jsonlText = strFromU8(unzipped["data/submissions.jsonl"]);
    const lines = jsonlText
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines.length).toBe(2);
    expect(lines[0].id).toBe("obs-1");
    expect(lines[0].values.tree_species).toBe("Quercus robur");
    expect(lines[0].media[0].id).toBe("med-1");
    expect(lines[0].media[0].blob).toBeUndefined(); // raw blob must be stripped from JSONL

    // Check media file binary
    const mediaBytes = unzipped["media/obs-1/med-1-oak.jpg"];
    expect(Array.from(mediaBytes)).toEqual([0xff, 0xd8, 0xff, 0xe0]);
  });

  it("handles corrupted or unreadable blobs gracefully without aborting export", async () => {
    const corruptBlob: Blob = Object.assign(new Blob(), {
      arrayBuffer: () => Promise.reject(new Error("Corrupt disk sector")),
    });

    const mockObservations: Observation[] = [
      {
        id: "obs-corrupt",
        projectId: "proj-recovery-test",
        createdAt: "2026-08-15T09:00:00.000Z",
        schemaVersion: 1,
        status: "SAVED_LOCAL",
        values: {},
        media: [
          {
            id: "med-corrupt",
            name: "corrupt.jpg",
            mimeType: "image/jpeg",
            byteSize: 100,
            blob: corruptBlob,
          },
        ],
      },
    ];

    vi.spyOn(localStore, "readStoredRecoveryData").mockResolvedValue({
      submissions: mockObservations,
      media: [],
      outbox: [],
      drafts: undefined,
      projects: [],
      appState: undefined,
      receipts: [],
    });

    await exportRecoveryPackage({
      project: mockProject,
      observations: mockObservations,
    });

    expect(capturedBlob).not.toBeNull();
    const unzipped = unzipSync(
      new Uint8Array(await capturedBlob!.arrayBuffer()),
    );
    expect(Object.keys(unzipped)).toContain("manifest.json");
    expect(Object.keys(unzipped)).toContain("data/submissions.jsonl");
  });
});
