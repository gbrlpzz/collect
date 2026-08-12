// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Collector } from "../src/components/Collector";
import { NewProjectWizard } from "../src/components/NewProjectWizard";
import { ProjectOverview } from "../src/components/ProjectOverview";
import { TopBar } from "../src/components/TopBar";
import type { FieldDefinition, Project } from "../src/types";

const project: Project = {
  id: "shortcut-project",
  organization: "Field organization",
  organizationMark: "F",
  name: "Shortcut survey",
  description: "",
  instructions: "",
  status: "active",
  schemaVersion: 1,
  contributors: 0,
  completeSubmissions: 0,
  lastReceived: "No submissions yet",
  fields: [],
};

describe("low-friction primary actions", () => {
  it("switches from contributor to admin in one top-bar tap", () => {
    const onModeChange = vi.fn();
    render(
      <TopBar
        mode="contributor"
        view="home"
        canAdmin
        onModeChange={onModeChange}
        onNavigate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /switch to admin/i }));

    expect(onModeChange).toHaveBeenCalledWith("admin");
  });

  it("opens sync status and starts synchronization from the project row", () => {
    const onOpenSync = vi.fn();
    render(
      <ProjectOverview
        project={project}
        observations={[
          {
            id: "waiting-1",
            projectId: project.id,
            createdAt: "2026-08-12T08:00:00.000Z",
            status: "SAVED_LOCAL",
            values: {},
          },
        ]}
        onNavigate={() => undefined}
        onOpenSync={onOpenSync}
        onFinishFieldwork={() => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /sync saved observations now/i }),
    );

    expect(onOpenSync).toHaveBeenCalledTimes(1);
  });

  it("auto-advances after a date is chosen", async () => {
    const fields: FieldDefinition[] = [
      {
        id: "date",
        key: "observed_date",
        label: "Observation date",
        type: "date",
        required: true,
        semantic_uri: null,
      },
      {
        id: "notes",
        key: "notes",
        label: "Notes",
        type: "long_text",
        semantic_uri: null,
      },
    ];

    render(
      <Collector
        project={{ ...project, fields }}
        draft={{}}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
        onBack={() => undefined}
        isSaving={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Observation date"), {
      target: { value: "2026-08-12" },
    });

    await waitFor(() => expect(screen.getByText("Notes")).toBeTruthy());
  });

  it("captures location automatically when the location step opens", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback): void => {
      success({
        coords: {
          latitude: 45.123456,
          longitude: -4.654321,
          accuracy: 8,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      });
    });
    const previousGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    const onDraftChange = vi.fn();

    render(
      <Collector
        project={{
          ...project,
          fields: [
            {
              id: "location",
              key: "location",
              label: "Location",
              type: "location",
              required: true,
              semantic_uri: null,
            },
          ],
        }}
        draft={{}}
        lastSavedAt={null}
        onDraftChange={onDraftChange}
        onSubmit={() => undefined}
        onBack={() => undefined}
        isSaving={false}
      />,
    );

    await waitFor(() =>
      expect(onDraftChange).toHaveBeenCalledWith(
        "location",
        expect.objectContaining({ latitude: 45.123456 }),
      ),
    );

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: previousGeolocation,
    });
  });

  it("publishes from the contributor step without a separate review click", () => {
    const onPublish = vi.fn();
    render(<NewProjectWizard onBack={() => undefined} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(screen.getByText("Step 3 of 3")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /publish project/i }),
    ).toBeTruthy();
    expect(screen.queryByText("Step 4 of 4")).toBeNull();
  });
});
