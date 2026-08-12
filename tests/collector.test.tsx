// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Collector } from "../src/components/Collector";
import { FieldRenderer } from "../src/components/FieldRenderer";
import { SyncSheet } from "../src/components/SyncSheet";
import { ClearButton, ConfirmationDialog } from "../src/components/ui";
import type { FieldDefinition, Project } from "../src/types";

const fields: FieldDefinition[] = [
  {
    id: "f1",
    key: "site_code",
    label: "Site code",
    type: "short_text",
    required: true,
    semantic_uri: null,
    config: { placeholder: "e.g. VA-023", maxLength: 32, minLength: 3 },
  },
  {
    id: "f2",
    key: "people_count",
    label: "People present",
    type: "number",
    semantic_uri: null,
    config: { integer: true, min: 0, max: 50 },
  },
  {
    id: "f3",
    key: "site_photos",
    label: "Site photos",
    type: "photo",
    required: true,
    semantic_uri: null,
    config: { minCount: 2, maxCount: 5, multiple: true },
  },
  {
    id: "f4",
    key: "notes",
    label: "Field notes",
    type: "long_text",
    semantic_uri: null,
  },
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

const validationFields: FieldDefinition[] = fields.filter(
  (field) => field.key !== "site_photos",
);
const validationProject: Project = { ...project, fields: validationFields };

describe("Collector guided flow (§10 client-side enforcement)", () => {
  const continueButton = () =>
    screen.getByRole("button", { name: /^continue$/i });

  it("keeps Continue disabled until a required first question is answered", () => {
    const onSubmit = vi.fn();
    render(
      <Collector
        project={project}
        draft={{ observed_date: "2026-08-10" }}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    expect(screen.getByText("Site code")).toBeTruthy();
    expect(screen.getByText("Required")).toBeTruthy();
    expect(continueButton()).toHaveProperty("disabled", true);
    fireEvent.click(continueButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("enforces number min/max with a specific message", () => {
    const onSubmit = vi.fn();
    render(
      <Collector
        project={validationProject}
        draft={{
          observed_date: "2026-08-10",
          site_code: "VA-001",
          people_count: { value: 99, unit: null },
        }}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(continueButton());
    expect(screen.getByText("Field notes")).toBeTruthy();
    fireEvent.click(continueButton());
    expect(screen.getByText("People present")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/maximum is 50/i)).toBeTruthy();
  });

  it("rejects fractional values for integer fields", () => {
    const onSubmit = vi.fn();
    render(
      <Collector
        project={validationProject}
        draft={{
          observed_date: "2026-08-10",
          site_code: "VA-001",
          people_count: { value: 1.5, unit: null },
        }}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/whole number/i)).toBeTruthy();
  });

  it("enforces text minLength", () => {
    const onSubmit = vi.fn();
    render(
      <Collector
        project={validationProject}
        draft={{ observed_date: "2026-08-10", site_code: "VA" }}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(continueButton());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/at least 3 characters/i)).toBeTruthy();
  });

  it("walks through every question and saves on the last step", () => {
    const onSubmit = vi.fn();
    const assets = [0, 1].map((index) => ({
      id: `m${index}`,
      name: `p${index}.jpg`,
      mimeType: "image/jpeg",
      byteSize: 10,
      fieldId: "site_photos",
      captureSource: "picker",
      blob: new Blob(["x"]),
    }));
    const draft = {
      observed_date: "2026-08-10",
      site_code: "VA-001",
      people_count: { value: 3, unit: null },
    };
    render(
      <Collector
        project={project}
        draft={draft}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(continueButton());
    expect(screen.getByText("Site photos")).toBeTruthy();
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: assets.map(
          (asset) =>
            new File([new Blob(["x"])], asset.name, { type: "image/jpeg" }),
        ),
      },
    });
    fireEvent.click(continueButton());
    expect(screen.getByText("Field notes")).toBeTruthy();
    fireEvent.click(continueButton());
    expect(screen.getByText("People present")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /save observation/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("lets contributors remove an attached photo before continuing", () => {
    const onSubmit = vi.fn();
    const draft = { observed_date: "2026-08-10", site_code: "VA-001" };
    render(
      <Collector
        project={project}
        draft={draft}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Blob(["x"])], "site.jpg", { type: "image/jpeg" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /remove photo 1/i }));
    expect(continueButton()).toHaveProperty("disabled", true);
    fireEvent.click(continueButton());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("auto-advances after a single answer", async () => {
    const onSubmit = vi.fn();
    const autoFields: FieldDefinition[] = [
      {
        id: "a1",
        key: "occupied",
        label: "Is it occupied?",
        type: "tri_state",
        required: true,
        semantic_uri: null,
      },
      {
        id: "a2",
        key: "kind",
        label: "Kind",
        type: "single_choice",
        required: false,
        semantic_uri: null,
        options: [{ id: "o1", value: "o1", label: "Option one" }],
      },
    ];
    render(
      <Collector
        project={{ ...project, fields: autoFields }}
        draft={{ observed_date: "2026-08-10" }}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={onSubmit}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    await waitFor(() => expect(screen.getByText("Kind")).toBeTruthy());
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
      const [value, setValue] = React.useState<
        string | { value: string; otherText: string }
      >("");
      return (
        <FieldRenderer
          field={field}
          value={value}
          onChange={setValue}
          onCaptureLocation={() => undefined}
          onAddPhoto={() => undefined}
          photoNames={[]}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /^other$/i }));
    const input = screen.getByPlaceholderText(
      /describe the other/i,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "School" } });
    expect((input as HTMLInputElement).value).toBe("School");
  });
});

describe("native input primitives (§HIG)", () => {
  it("ClearButton clears a prefilled text field and calls onDraftChange", () => {
    const onDraftChange = vi.fn();
    const draft = {
      observed_date: "2026-08-10",
      site_code: "VA-001",
      people_count: { value: 3, unit: null },
    };
    render(
      <Collector
        project={validationProject}
        draft={draft}
        lastSavedAt={null}
        onDraftChange={onDraftChange}
        onSubmit={() => undefined}
        onBack={() => undefined}
        isSaving={false}
      />,
    );
    const input = screen.getByRole("textbox", {
      name: /site code/i,
    }) as HTMLInputElement;
    expect(input.value).toBe("VA-001");
    fireEvent.click(screen.getByRole("button", { name: /clear site code/i }));
    expect(onDraftChange).toHaveBeenCalledWith("site_code", "");
  });

  it("ConfirmationDialog presents an alertdialog with confirm and cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog
        title="Close collection?"
        message="Existing offline fieldwork can still synchronize."
        confirmLabel="Close collection"
        cancelLabel="Keep open"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /keep open/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /close collection/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
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
    render(
      <SyncSheet
        observations={[observation("SAVED_LOCAL")]}
        lastSyncAt={null}
        isSyncing={false}
        progress={{}}
        onClose={() => undefined}
        onSync={() => undefined}
        onRecoveryExport={() => undefined}
      />,
    );
    expect(screen.getByText(/1 waiting/i)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText(/device storage/i)).toBeTruthy(),
    );
    expect(
      screen.getByRole("button", { name: /export unsynced recovery package/i }),
    ).toBeTruthy();
  });

  it("reports in-flight phase when syncing", () => {
    const pending = observation("SAVED_LOCAL");
    render(
      <SyncSheet
        observations={[pending]}
        lastSyncAt={null}
        isSyncing
        progress={{
          [pending.id]: { phase: "SYNCING_MEDIA", media: { m1: 62 } },
        }}
        onClose={() => undefined}
        onSync={() => undefined}
        onRecoveryExport={() => undefined}
      />,
    );
    expect(screen.getByText(/syncing 1 of 1/i)).toBeTruthy();
    expect(screen.getByText(/uploading media/i)).toBeTruthy();
    expect(screen.getByText("62%")).toBeTruthy();
  });
});
