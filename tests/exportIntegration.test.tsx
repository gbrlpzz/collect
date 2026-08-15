// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminProject } from "../src/components/AdminDashboard";
import { SyncSheet } from "../src/components/SyncSheet";
import { ProfileSheet } from "../src/components/ProfileSheet";
import { TopBar } from "../src/components/TopBar";
import { PackageBrowser } from "../src/homepage/PackageBrowser";
import type { Project } from "../src/types";

describe("Export UI integration", () => {
  const mockProject: Project = {
    id: "proj-ui-test",
    organization: "Research Unit",
    organizationMark: "R",
    name: "Survey Project",
    description: "Export UI integration test",
    instructions: "",
    status: "active",
    schemaVersion: 1,
    license: "CC-BY-4.0",
    contactEmail: "lab@example.com",
    contributors: 2,
    completeSubmissions: 15,
    lastReceived: "2026-08-15T12:00:00.000Z",
    fields: [
      {
        id: "f1",
        key: "name",
        label: "Name",
        type: "short_text",
      },
    ],
  };

  it("ExportPanel handles export click, displays busy state, and disables button during export", async () => {
    let resolveExport: () => void = () => {};
    const onExport = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveExport = resolve;
        }),
    );

    render(
      <AdminProject
        project={mockProject}
        initialTab="export"
        onBack={() => {}}
        onToast={() => {}}
        onExport={onExport}
        onSchemaPublished={() => {}}
        onToggleStatus={() => {}}
      />,
    );

    const exportBtn = screen.getByRole("button", {
      name: /export checkpoint/i,
    });
    expect(exportBtn).toBeDefined();
    expect(exportBtn.getAttribute("aria-busy")).toBeNull();

    // Click Export Checkpoint
    fireEvent.click(exportBtn);

    expect(onExport).toHaveBeenCalledTimes(1);

    // Button should now be busy and disabled
    await waitFor(() => {
      expect(exportBtn.getAttribute("aria-busy")).toBe("true");
      expect(exportBtn.textContent).toContain("Preparing checkpoint…");
      expect(exportBtn.hasAttribute("disabled")).toBe(true);
    });

    // Clicking again while exporting should not trigger additional calls
    fireEvent.click(exportBtn);
    expect(onExport).toHaveBeenCalledTimes(1);

    // Resolve export
    resolveExport();

    await waitFor(() => {
      expect(exportBtn.getAttribute("aria-busy")).toBeNull();
      expect(exportBtn.textContent).toContain("Export checkpoint");
      expect(exportBtn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("SyncSheet offers recovery export action", () => {
    const onRecoveryExport = vi.fn();
    render(
      <SyncSheet
        observations={[]}
        lastSyncAt={null}
        isSyncing={false}
        progress={null}
        onClose={() => {}}
        onSync={() => {}}
        onRecoveryExport={onRecoveryExport}
      />,
    );

    const recoveryBtn = screen.getByRole("button", {
      name: /export local recovery copy/i,
    });
    expect(recoveryBtn).toBeDefined();

    fireEvent.click(recoveryBtn);
    expect(onRecoveryExport).toHaveBeenCalledTimes(1);
  });

  it("ProfileSheet offers local data copy export action", () => {
    const onRecoveryExport = vi.fn();
    render(
      <ProfileSheet
        userEmail="contributor@example.com"
        profile={null}
        observations={[]}
        lastSyncAt="2026-08-15T12:00:00.000Z"
        isAdmin={false}
        isPreview={false}
        onClose={() => {}}
        onRecoveryExport={onRecoveryExport}
      />,
    );

    const exportBtn = screen.getByRole("button", {
      name: /export local data copy/i,
    });
    expect(exportBtn).toBeDefined();

    fireEvent.click(exportBtn);
    expect(onRecoveryExport).toHaveBeenCalledTimes(1);
  });

  it("TopBar account menu offers local data copy export", () => {
    const onRecoveryExport = vi.fn();
    render(
      <TopBar
        mode="contributor"
        view="home"
        onNavigate={() => {}}
        userEmail="contributor@example.com"
        onRecoveryExport={onRecoveryExport}
      />,
    );

    // Open profile sheet / account menu
    const menuBtn = screen.getByRole("button", { name: /profile/i });
    fireEvent.click(menuBtn);

    const exportBtn = screen.getByRole("button", {
      name: /export local data copy/i,
    });
    fireEvent.click(exportBtn);
    expect(onRecoveryExport).toHaveBeenCalledTimes(1);
  });

  it("PackageBrowser allows downloading demo archive ZIP directly", () => {
    let downloadedName: string | null = null;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-demo-zip"),
      revokeObjectURL: vi.fn(),
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === "a") {
          el.click = () => {
            downloadedName = (el as HTMLAnchorElement).download;
          };
        }
        return el;
      },
    );

    render(<PackageBrowser />);

    const zipBtn = screen.getByRole("button", {
      name: /download demo archive zip/i,
    });
    expect(zipBtn).toBeDefined();

    fireEvent.click(zipBtn);
    expect(downloadedName).toBe("valpuesta_checkpoint-2026-08-04.zip");
  });
});
