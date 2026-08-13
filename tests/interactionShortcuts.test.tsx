// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthScreen } from "../src/components/AuthScreen";
import { Collector } from "../src/components/Collector";
import { ConsentScreen } from "../src/components/ConsentScreen";
import { ContributorHome } from "../src/components/ContributorHome";
import { DeviceLinkSheet } from "../src/components/DeviceLinkSheet";
import { NewProjectWizard } from "../src/components/NewProjectWizard";
import { ProjectOverview } from "../src/components/ProjectOverview";
import { TopBar } from "../src/components/TopBar";
import { EmailPrompt } from "../src/components/ui";
import type { FieldDefinition, Project } from "../src/types";

const consentMocks = vi.hoisted(() => ({
  getMyProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("../src/lib/consent", () => ({
  getMyProfile: consentMocks.getMyProfile,
}));

const authMocks = vi.hoisted(() => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
  verifySignInCode: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  setPassword: vi.fn().mockResolvedValue(undefined),
  linkDeviceSession: vi.fn().mockResolvedValue(undefined),
  requestDeviceLinkCode: vi
    .fn()
    .mockResolvedValue({ code: "AB2D9KQX", expiresInSeconds: 120 }),
}));

vi.mock("../src/lib/supabaseClient", () => ({
  authCallbackError: () => null,
  isStandalonePwa: () => false,
  pendingAuthEmail: () => "",
  rememberAuthEmail: () => undefined,
  sendMagicLink: authMocks.sendMagicLink,
  verifySignInCode: authMocks.verifySignInCode,
  signInWithPassword: authMocks.signInWithPassword,
  setPassword: authMocks.setPassword,
  linkDeviceSession: authMocks.linkDeviceSession,
  requestDeviceLinkCode: authMocks.requestDeviceLinkCode,
}));

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
  it("focuses the login email field as soon as the screen opens", () => {
    render(<AuthScreen configured role="contributor" />);

    expect(document.activeElement).toBe(screen.getByLabelText("Email address"));
  });

  it("signs in with email and password from the focused email field", async () => {
    render(<AuthScreen configured role="contributor" />);
    fireEvent.click(
      screen.getByRole("button", { name: /sign in with a password instead/i }),
    );
    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "field@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret123" },
    });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() =>
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith(
        "field@example.com",
        "secret123",
      ),
    );
  });

  it("falls back to a magic link and auto-verifies the email code", async () => {
    render(<AuthScreen configured role="contributor" />);
    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "field@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() =>
      expect(authMocks.sendMagicLink).toHaveBeenCalledWith("field@example.com"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /enter the code from the email/i }),
    );
    fireEvent.change(screen.getByLabelText(/6-digit code from the email/i), {
      target: { value: "123456" },
    });

    await waitFor(() =>
      expect(authMocks.verifySignInCode).toHaveBeenCalledWith(
        "field@example.com",
        "123456",
      ),
    );
  });

  it("sets a password once after an invite sign-in", async () => {
    const onPasswordSet = vi.fn();
    render(
      <AuthScreen
        configured
        role="contributor"
        requirePasswordSetup
        onPasswordSet={onPasswordSet}
      />,
    );
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "secret123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secret123" },
    });
    fireEvent.submit(screen.getByLabelText("New password").closest("form")!);

    await waitFor(() =>
      expect(authMocks.setPassword).toHaveBeenCalledWith("secret123"),
    );
    await waitFor(() => expect(onPasswordSet).toHaveBeenCalledTimes(1));
  });

  it("links this device with the code shown on the signed-in device", async () => {
    render(<AuthScreen configured role="contributor" />);
    fireEvent.click(screen.getByText("Other sign-in options"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /use a code from a signed-in device/i,
      }),
    );
    const codeInput = screen.getByLabelText(
      /8-character code from the signed-in device/i,
    );
    fireEvent.change(codeInput, { target: { value: "ab2d9kqx" } });

    await waitFor(() =>
      expect(authMocks.linkDeviceSession).toHaveBeenCalledWith("AB2D9KQX"),
    );
  });

  it("opens device-code entry first in an installed iOS app", () => {
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    const previousStandalone = standaloneNavigator.standalone;
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    try {
      render(<AuthScreen configured role="contributor" />);
      expect(
        screen.getByLabelText(/8-character code from the signed-in device/i),
      ).toBeTruthy();
      expect(screen.getByText(/open your profile/i)).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: previousStandalone,
      });
    }
  });

  it("shows the device-link code on the signed-in device", async () => {
    render(<DeviceLinkSheet onClose={() => undefined} />);

    await waitFor(() =>
      expect(authMocks.requestDeviceLinkCode).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByLabelText(/code AB2D9KQX/i)).toBeTruthy();
    expect(screen.getByText(/expires in/i)).toBeTruthy();
  });

  it("focuses a modal email field without a second tap", () => {
    render(
      <EmailPrompt
        title="Add contributor"
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(document.activeElement).toBe(screen.getByLabelText("Email address"));
  });

  it("dismisses shared modals with Escape and returns focus", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.append(trigger);
    trigger.focus();
    const onCancel = vi.fn();
    const { unmount } = render(
      <EmailPrompt
        title="Add contributor"
        onSubmit={() => undefined}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("puts starting an observation before project routing", () => {
    const onStartObservation = vi.fn();
    render(
      <ContributorHome
        projects={[project]}
        activeProject={project}
        observations={[]}
        hasDraft={false}
        onStartObservation={onStartObservation}
        onOpenProject={() => undefined}
        onChooseProject={() => undefined}
        onResumeObservation={() => undefined}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /new observation/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /^projects$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /start observation/i }));
    expect(onStartObservation).toHaveBeenCalledWith(project);
  });

  it("shows only the resume action when a draft already exists", () => {
    const onResumeObservation = vi.fn();
    render(
      <ContributorHome
        projects={[project]}
        activeProject={project}
        observations={[]}
        hasDraft
        onStartObservation={() => undefined}
        onOpenProject={() => undefined}
        onChooseProject={() => undefined}
        onResumeObservation={onResumeObservation}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /start observation/i }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /resume observation/i }),
    );
    expect(onResumeObservation).toHaveBeenCalledTimes(1);
  });

  it("keeps the contributor and admin surfaces separate", () => {
    render(
      <TopBar mode="contributor" view="home" onNavigate={() => undefined} />,
    );

    expect(
      screen.queryByRole("button", { name: /switch to admin/i }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.queryByRole("menuitem", { name: /admin/i })).toBeNull();
  });

  it("offers a device sign-in code from the signed-in account menu", () => {
    const onLinkDevice = vi.fn();
    render(
      <TopBar
        mode="contributor"
        view="home"
        userEmail="field@example.com"
        onNavigate={() => undefined}
        onLinkDevice={onLinkDevice}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "field@example.com" }));
    fireEvent.click(
      screen.getByRole("button", { name: /sign in another device/i }),
    );
    expect(onLinkDevice).toHaveBeenCalledTimes(1);
  });

  it("shows the attention score in the account menu for a signed-in contributor", async () => {
    consentMocks.getMyProfile.mockResolvedValueOnce({
      userId: "u1",
      consentVersion: 1,
      consentGrantedAt: "2026-08-12T00:00:00Z",
      consentRevokedAt: null,
      qualityScore: null,
      attentionScore: 92.4,
      attentionChecksTotal: 24,
      attentionCorrectTotal: 22,
      attentionLastAt: null,
      contributionCount: 14,
    });
    render(
      <TopBar
        mode="contributor"
        view="home"
        userEmail="field@example.com"
        onNavigate={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "field@example.com" }));

    await waitFor(() =>
      expect(
        screen.getByRole("img", {
          name: /attention score 92 out of 100, based on 24 checks/i,
        }),
      ).toBeTruthy(),
    );
    expect(screen.getByText("14")).toBeTruthy();
    fireEvent.click(screen.getByText("Attention"));
    expect(screen.getByText(/adjusts for random guessing/i)).toBeTruthy();
  });

  it("presents consent as readable sections and prevents duplicate acceptance", async () => {
    let finish!: () => void;
    const onAccept = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    render(
      <ConsentScreen
        version={2}
        text={
          "Please review this statement.\n\n1. We collect observation answers.\n\n2. Location is included when requested.\n\nYou can decline and sign out."
        }
        onAccept={onAccept}
        onDecline={() => undefined}
      />,
    );

    expect(screen.getByText("What is recorded")).toBeTruthy();
    fireEvent.click(screen.getByText("Read the full consent statement"));
    expect(
      screen.getByRole("heading", { name: "Full statement" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const accept = screen.getByRole("button", { name: /agree and continue/i });
    fireEvent.click(accept);
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /saving/i }).hasAttribute("disabled"),
    ).toBe(true);
    finish();
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /agree and continue/i })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
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
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /view sync status/i }));

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
        config: { keyIdentifier: true },
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

    const dateInput = screen.getByLabelText("Observation date");
    expect(document.activeElement).toBe(dateInput);
    fireEvent.change(dateInput, {
      target: { value: "2026-08-12" },
    });

    await waitFor(() => expect(screen.getByText("Notes")).toBeTruthy());
  });

  it("focuses the first choice control when a guided choice opens", () => {
    const fields: FieldDefinition[] = [
      {
        id: "condition",
        key: "condition",
        label: "Condition",
        type: "tri_state",
        required: true,
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

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Yes" }),
    );
  });

  it("blocks collection until the contributor grants location access", async () => {
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

    expect(screen.getByText("Location required")).toBeTruthy();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Allow location" }));

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

  it("keeps collection locked when location access is denied", async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback): void => {
        error({
          code: 1,
          message: "Permission denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    );
    const previousGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <Collector
        project={{
          ...project,
          fields: [
            {
              id: "notes",
              key: "notes",
              label: "Notes",
              type: "long_text",
              required: false,
              semantic_uri: null,
            },
            {
              id: "location",
              key: "location",
              label: "Location",
              type: "location",
              required: false,
              semantic_uri: null,
            },
          ],
        }}
        draft={{}}
        lastSavedAt={null}
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
        onBack={() => undefined}
        isSaving={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Allow location" }));

    await waitFor(() =>
      expect(screen.getByText("Allow location in Settings")).toBeTruthy(),
    );
    expect(screen.queryByRole("textbox", { name: "Notes" })).toBeNull();
    expect(
      screen.getByText(
        "Collection remains locked until location access is available.",
      ),
    ).toBeTruthy();

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: previousGeolocation,
    });
  });

  it("publishes from the contributor step without a separate review click", () => {
    const onPublish = vi.fn();
    render(<NewProjectWizard onBack={() => undefined} onPublish={onPublish} />);

    expect(document.activeElement).toBe(screen.getByLabelText("Project name"));

    fireEvent.submit(screen.getByLabelText("Project name").closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));
    const fieldInputs = screen.getAllByRole("textbox", {
      name: /field \d+ label/i,
    });
    expect(document.activeElement).toBe(fieldInputs[fieldInputs.length - 1]);
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(screen.getByText("Step 3 of 3")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /publish project/i }),
    ).toBeTruthy();
    expect(screen.queryByText("Step 4 of 4")).toBeNull();
  });
});
