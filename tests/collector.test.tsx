// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Collector } from "../src/components/Collector";
import { FieldRenderer } from "../src/components/FieldRenderer";
import { SyncSheet } from "../src/components/SyncSheet";
import type { FieldDefinition, Project } from "../src/types";

const fields: FieldDefinition[] = [
  { id: "f1", key: "site_code", label: "Site code", type: "short_text", required: true, semantic_uri: null, config: { placeholder: "e.g. VA-023", maxLength: 32, minLength: 3 } },
  { id: "f2", key: "people_count", label: "People present", type: "number", semantic_uri: null, config: { integer: true, min: 0, max: 50 } },
  { id: "f3", key: "site_photos", label: "Site photos", type: "photo", required: true, semantic_uri: null, config: { minCount: 2, maxCount: 5, multiple: true } },
  { id: "f4", key: "notes", label: "Field notes", type: "long_text", semantic_uri: null },
];

const project: Project = {
  id: "p1",
  organization: "Field organization",
  organizationMark: "F",
  name: "Test survey",
  description: "",
  instructions: "",
  status: "active",
  schemaVersion: 1,
  contributors: 0,
  completeSubmissions: 0,
  lastReceived: "No submissions yet",
  fields,
};

const validationFields: FieldDefinition[] = fields.filter((field) => field.key !== "site_photos");
const validationProject: Project = { ...project, fields: validationFields };

describe("Collector validation (§10 client-side enforcement)", () => {
  it("blocks submit when a required field is empty and shows which field", () => {
    const onSubmit = vi.fn();
    render(<Collector project={project} draft={{ observed_date: "2026-08-10" }} lastSavedAt={null} onDraftChange={() => undefined} onSubmit={onSubmit} onBack={() => undefined} isSaving={false} />);
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/complete this field/i).length).toBeGreaterThan(0);
  });

  it("enforces number min/max with a specific message", () => {
    const onSubmit = vi.fn();
    render(<Collector project={validationProject} draft={{ observed_date: "2026-08-10", site_code: "VA-001", people_count: { value: 99, unit: null } }} lastSavedAt={null} onDraftChange={() => undefined} onSubmit={onSubmit} onBack={() => undefined} isSaving={false} />);
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/maximum is 50/i)).toBeTruthy();
  });

  it("enforces text minLength", () => {
    const onSubmit = vi.fn();
    render(<Collector project={validationProject} draft={{ observed_date: "2026-08-10", site_code: "VA" }} lastSavedAt={null} onDraftChange={() => undefined} onSubmit={onSubmit} onBack={() => undefined} isSaving={false} />);
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 3 characters/i)).toBeTruthy();
  });

  it("accepts a complete observation", () => {
    const onSubmit = vi.fn();
    const assets = [0, 1].map((index) => ({ id: `m${index}`, name: `p${index}.jpg`, mimeType: "image/jpeg", byteSize: 10, fieldId: "site_photos", captureSource: "picker", blob: new Blob(["x"]) }));
    const draft = { observed_date: "2026-08-10", site_code: "VA-001", people_count: { value: 3, unit: null } };
    render(<Collector project={project} draft={draft} lastSavedAt={null} onDraftChange={() => undefined} onSubmit={onSubmit} onBack={() => undefined} isSaving={false} />);
    // Attach two photos through the hidden input.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: assets.map((asset) => new File([new Blob(["x"])], asset.name, { type: "image/jpeg" })) } });
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("lets contributors remove an attached photo before saving", () => {
    const onSubmit = vi.fn();
    const draft = { observed_date: "2026-08-10", site_code: "VA-001" };
    render(<Collector project={project} draft={draft} lastSavedAt={null} onDraftChange={() => undefined} onSubmit={onSubmit} onBack={() => undefined} isSaving={false} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([new Blob(["x"])], "site.jpg", { type: "image/jpeg" })] } });
    fireEvent.click(screen.getByRole("button", { name: /remove photo 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText(/complete this field/i).length).toBeGreaterThan(0);
  });
});

describe("FieldRenderer single choice with Other (§10)", () => {
  it("records the other option id plus free text", () => {
    const field: FieldDefinition = {
      id: "c1",
      key: "building_type",
      label: "Building type",
      type: "single_choice",
      semantic_uri: null,
      options: [
        { id: "house", value: "house", label: "House" },
        { id: "other", value: "other", label: "Other" },
      ],
    };
    function Harness() {
      const [value, setValue] = React.useState<string | { value: string; otherText: string }>("");
      return <FieldRenderer field={field} value={value} onChange={setValue} onCaptureLocation={() => undefined} onAddPhoto={() => undefined} photoNames={[]} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /^other$/i }));
    const input = screen.getByPlaceholderText(/describe the other/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "School" } });
    expect((input as HTMLInputElement).value).toBe("School");
  });
});

describe("SyncSheet states (§32)", () => {
  const observation = (status: "SAVED_LOCAL" | "SYNCED") => ({
    id: `obs-${status}`,
    projectId: "p1",
    createdAt: "Just now",
    status,
    values: { site_code: "VA-001" },
  });

  it("shows waiting counts, storage facts, and a details disclosure with recorded errors", async () => {
    render(<SyncSheet observations={[observation("SAVED_LOCAL")]} lastSyncAt={null} isSyncing={false} progress={{}} onClose={() => undefined} onSync={() => undefined} onRecoveryExport={() => undefined} />);
    expect(screen.getByText(/1 waiting/i)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/device storage/i)).toBeTruthy());
    expect(screen.getByRole("button", { name: /export unsynced recovery package/i })).toBeTruthy();
  });

  it("reports in-flight phase when syncing", () => {
    const pending = observation("SAVED_LOCAL");
    render(<SyncSheet observations={[pending]} lastSyncAt={null} isSyncing progress={{ [pending.id]: { phase: "SYNCING_MEDIA", media: { m1: 62 } } }} onClose={() => undefined} onSync={() => undefined} onRecoveryExport={() => undefined} />);
    expect(screen.getByText(/syncing 1 of 1/i)).toBeTruthy();
    expect(screen.getByText(/uploading media/i)).toBeTruthy();
    expect(screen.getByText("62%")).toBeTruthy();
  });
});
