// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import {
  buildClientCheckpointArchive,
  exportClientCheckpoint,
  csvCell,
  locationFeature,
  sha256Text,
} from "../src/lib/checkpointExport";
import type { Observation, Project } from "../src/types";
import * as localStore from "../src/lib/localStore";

describe("checkpointExport module", () => {
  const mockProject: Project = {
    id: "proj-fair-dataset",
    organization: "Ecology Institute",
    organizationMark: "E",
    name: "Forest Canopy Survey",
    description: "Multi-device canopy density and biodiversity study.",
    instructions: "",
    status: "active",
    schemaVersion: 1,
    license: "CC-BY-4.0",
    contactEmail: "ecology@example.com",
    datasetIdentifier: "10.5281/zenodo.1234567",
    contributors: 3,
    completeSubmissions: 2,
    lastReceived: "2026-08-15T12:00:00.000Z",
    fields: [
      {
        id: "f1",
        key: "plot_id",
        label: "Plot Identifier",
        type: "short_text",
        required: true,
      },
      {
        id: "f2",
        key: "coordinates",
        label: "GPS Location",
        type: "location",
        required: true,
      },
      {
        id: "f3",
        key: "photo",
        label: "Canopy Photo",
        type: "photo",
      },
      {
        id: "f4",
        key: "notes",
        label: "Observer Notes",
        type: "long_text",
      },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-checkpoint-zip"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("csvCell neutralizes formula injection and escapes quotes", () => {
    expect(csvCell("=SUM(A1:A10)")).toBe('"\'=SUM(A1:A10)"');
    expect(csvCell("+12345")).toBe('"\'+12345"');
    expect(csvCell("-50")).toBe('"\'-50"');
    expect(csvCell("@cmd")).toBe('"\'@cmd"');
    expect(csvCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
  });

  it("locationFeature extracts coordinates from payload.location or custom location fields", () => {
    const obsWithLocation: Observation = {
      id: "obs-loc-1",
      projectId: "proj-1",
      createdAt: "2026-08-15T00:00:00.000Z",
      schemaVersion: 1,
      status: "SAVED_LOCAL",
      values: {
        coordinates: {
          latitude: 45.1234,
          longitude: 7.5678,
          accuracy: 5,
        },
      },
    };

    const feature = locationFeature(obsWithLocation);
    expect(feature).not.toBeNull();
    expect(feature?.type).toBe("Feature");
    expect(feature?.geometry).toEqual({
      type: "Point",
      coordinates: [7.5678, 45.1234],
    });
    expect(feature?.properties.accuracy_m).toBe(5);
  });

  it("builds a canonical FAIR checkpoint archive matching docs/export-format.md", async () => {
    const photoBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], {
      type: "image/png",
    });

    const mockObservations: Observation[] = [
      {
        id: "sub-101",
        projectId: "proj-fair-dataset",
        createdAt: "2026-08-15T11:00:00.000Z",
        schemaVersion: 1,
        deviceId: "device-alpha",
        status: "SYNCED",
        values: {
          plot_id: "PLOT-A",
          coordinates: { latitude: 42.5, longitude: -3.8, accuracy: 3 },
          notes: "Dense foliage, high canopy cover.",
        },
        media: [
          {
            id: "med-101",
            name: "canopy-north.png",
            mimeType: "image/png",
            byteSize: 4,
            blob: photoBlob,
          },
        ],
      },
    ];

    vi.spyOn(localStore, "readStoredRecoveryData").mockResolvedValue({
      submissions: mockObservations,
      media: [],
      outbox: [],
      drafts: undefined,
      projects: [mockProject],
      appState: undefined,
      receipts: [],
    });

    const { archive, filename } = await buildClientCheckpointArchive({
      project: mockProject,
      observations: mockObservations,
      readiness: [
        {
          id: "contributor-1",
          email: "researcher@example.com",
          status: "Active",
          ready: true,
          pending: 0,
          lastSeen: "2026-08-15T11:30:00.000Z",
          received: 1,
          attentionScore: 100,
          attentionChecksTotal: 1,
          attentionCorrectTotal: 1,
          consentGranted: true,
        },
      ],
    });

    expect(filename).toMatch(
      /^forest-canopy-survey_checkpoint-\d{4}-\d{2}-\d{2}\.zip$/,
    );

    // Unzip and verify FAIR file hierarchy
    const unzipped = unzipSync(archive);
    const files = Object.keys(unzipped);

    expect(files).toContain("manifest.json");
    expect(files).toContain("schema/schema-v1.json");
    expect(files).toContain("data/submissions.jsonl");
    expect(files).toContain("data/submissions.csv");
    expect(files).toContain("data/media.csv");
    expect(files).toContain("data/contributors.csv");
    expect(files).toContain("data/attention.csv");
    expect(files).toContain("data/submissions.geojson");
    expect(files).toContain("dataset/datacite.json");
    expect(files).toContain("dataset/data-dictionary.json");
    expect(files).toContain("dataset/README.md");
    expect(files).toContain("media/sub-101/med-101.png");

    // Verify manifest.json
    const manifest = JSON.parse(strFromU8(unzipped["manifest.json"]));
    expect(manifest.export_format_version).toBe("1");
    expect(manifest.project.name).toBe("Forest Canopy Survey");
    expect(manifest.submission_count).toBe(1);
    expect(manifest.media_count).toBe(1);
    expect(manifest.hashes.submissions_jsonl_sha256).toBeDefined();
    expect(manifest.hashes.media_csv_sha256).toBeDefined();

    // Verify SHA-256 hash in manifest matches actual data
    const jsonlContent = strFromU8(unzipped["data/submissions.jsonl"]);
    const expectedJsonlHash = await sha256Text(jsonlContent);
    expect(manifest.hashes.submissions_jsonl_sha256).toBe(expectedJsonlHash);

    // Verify DataCite 4.4 metadata
    const datacite = JSON.parse(strFromU8(unzipped["dataset/datacite.json"]));
    expect(datacite.schemaVersion).toBe(
      "http://datacite.org/schema/kernel-4.4",
    );
    expect(datacite.publisher).toBe("Ecology Institute");
    expect(datacite.identifier.identifier).toBe("10.5281/zenodo.1234567");
    expect(datacite.resourceType.resourceTypeGeneral).toBe("Dataset");

    // Verify GeoJSON
    const geojson = JSON.parse(strFromU8(unzipped["data/submissions.geojson"]));
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(1);
    expect(geojson.features[0].geometry.coordinates).toEqual([-3.8, 42.5]);

    // Verify binary media content
    const mediaBytes = unzipped["media/sub-101/med-101.png"];
    expect(Array.from(mediaBytes)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("exportClientCheckpoint triggers download without popups", async () => {
    let downloadedName: string | null = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "a") {
          el.click = () => {
            // SAFETY: created anchor element is HTMLAnchorElement.
            downloadedName = (el as HTMLAnchorElement).download;
          };
        }
        return el;
      },
    );

    const onComplete = vi.fn();
    await exportClientCheckpoint({
      project: mockProject,
      observations: [],
      onComplete,
    });

    expect(onComplete).toHaveBeenCalled();
    expect(downloadedName).toMatch(
      /^forest-canopy-survey_checkpoint-\d{4}-\d{2}-\d{2}\.zip$/,
    );
  });

  it("populates attention responses and computes attention_failed in client export", async () => {
    const mockObsWithAttention: Observation[] = [
      {
        id: "sub-att-pass",
        projectId: "proj-fair-dataset",
        createdAt: "2026-08-15T11:00:00.000Z",
        schemaVersion: 1,
        deviceId: "device-alpha",
        status: "SYNCED",
        values: { plot_id: "PLOT-1" },
        attentionResponse: { checkKey: "select_blue", selectedValue: "blue" },
      },
      {
        id: "sub-att-fail",
        projectId: "proj-fair-dataset",
        createdAt: "2026-08-15T11:15:00.000Z",
        schemaVersion: 1,
        deviceId: "device-alpha",
        status: "SYNCED",
        values: { plot_id: "PLOT-2" },
        attentionResponse: { checkKey: "select_blue", selectedValue: "red" },
      },
    ];

    vi.spyOn(localStore, "readStoredRecoveryData").mockResolvedValue({
      submissions: mockObsWithAttention,
      media: [],
      outbox: [],
      drafts: undefined,
      projects: [mockProject],
      appState: undefined,
      receipts: [],
    });

    const { archive } = await buildClientCheckpointArchive({
      project: mockProject,
      observations: mockObsWithAttention,
    });

    const unzipped = unzipSync(archive);
    const attentionCsv = strFromU8(unzipped["data/attention.csv"]);
    const submissionsJsonl = strFromU8(unzipped["data/submissions.jsonl"]);
    const submissionsCsv = strFromU8(unzipped["data/submissions.csv"]);

    expect(attentionCsv).toContain("select_blue");
    expect(attentionCsv).toContain("blue");
    expect(attentionCsv).toContain("red");

    const jsonlLines = submissionsJsonl
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));
    expect(jsonlLines[0].attention_failed).toBe(false);
    expect(jsonlLines[1].attention_failed).toBe(true);

    expect(submissionsCsv).toContain('"false"');
    expect(submissionsCsv).toContain('"true"');
  });
});
