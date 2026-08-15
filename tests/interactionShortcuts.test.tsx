// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { Collector } from "../src/components/Collector";
import { ConsentScreen } from "../src/components/ConsentScreen";
import { ContributorHome } from "../src/components/ContributorHome";
import { DeviceLinkSheet } from "../src/components/DeviceLinkSheet";
import { NewProjectWizard } from "../src/components/NewProjectWizard";
import { ProfileSheet } from "../src/components/ProfileSheet";
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
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  setPassword: vi.fn().mockResolvedValue(undefined),
  linkDeviceSession: vi.fn().mockResolvedValue(undefined),
  requestDeviceLinkCode: vi
    .fn()
    .mockResolvedValue({ code: "AB2D9KQX", expiresInSeconds: 120 }),
  requestContributorSigninCode: vi.fn().mockResolvedValue(undefined),
  signInWithProvider: vi.fn().mockResolvedValue(undefined),
  // No provider is enabled on this deployment unless a test says so.
  enabledAuthProviders: vi.fn().mockResolvedValue([]),
  knownAuthProviders: vi.fn().mockReturnValue([]),
}));

vi.mock("../src/lib/supabaseClient", () => ({
  authCallbackError: () => null,
  pendingAuthEmail: () => "",
  rememberAuthEmail: () => undefined,
  sendMagicLink: authMocks.sendMagicLink,
  signInWithPassword: authMocks.signInWithPassword,
  setPassword: authMocks.setPassword,
  linkDeviceSession: authMocks.linkDeviceSession,
  requestDeviceLinkCode: authMocks.requestDeviceLinkCode,
  requestContributorSigninCode: authMocks.requestContributorSigninCode,
  signInWithProvider: authMocks.signInWithProvider,
  enabledAuthProviders: authMocks.enabledAuthProviders,
  knownAuthProviders: authMocks.knownAuthProviders,
  authProviders: ["google", "apple"],
  authProviderLabel: { google: "Google", apple: "Apple" },
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
  it("leaves the entry keyboard closed until the person chooses a field", () => {
    render(<AuthScreen configured role="contributor" />);

    expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });

  it("opens on the code entry for contributors and requests a fresh code by email", async () => {
    render(<AuthScreen configured role="contributor" />);
    expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /request a new code by email/i }),
    );
    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, {
      target: { value: "field@example.com" },
    });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() =>
      expect(authMocks.requestContributorSigninCode).toHaveBeenCalledWith(
        "field@example.com",
      ),
    );
    expect(screen.getByText(/if an account exists/i)).toBeTruthy();
  });

  it("signs in with email and password from the focused email field", async () => {
    render(<AuthScreen configured role="contributor" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: /use an email address and password/i,
      }),
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

  it("falls back to a magic link for administrators", async () => {
    render(<AuthScreen configured role="admin" />);
    const emailInput = screen.getByLabelText("Email address");
    fireEvent.change(emailInput, { target: { value: "field@example.com" } });
    fireEvent.submit(emailInput.closest("form")!);

    await waitFor(() =>
      expect(authMocks.sendMagicLink).toHaveBeenCalledWith("field@example.com"),
    );
    expect(screen.getByText(/open the newest link sent to/i)).toBeTruthy();
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
    const codeInput = screen.getByLabelText(/8-character code/i);
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
      expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();
      expect(
        screen.getByText(/enter the code your administrator issued/i),
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: /link this device/i }),
      ).toBeNull();
      expect(screen.queryByText(/copy the code, and paste/i)).toBeNull();
      expect(screen.queryByText(/previously downloaded fieldwork/i)).toBeNull();
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
    // The code renders after the async request resolves; wait for the label
    // rather than asserting immediately after the mock call.
    await waitFor(() =>
      expect(screen.getByLabelText(/code AB2D9KQX/i)).toBeTruthy(),
    );
    expect(screen.getByText(/expires in/i)).toBeTruthy();
    expect(screen.queryByText("Another device")).toBeNull();
    expect(screen.queryByText(/works once and expires/i)).toBeNull();
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
        onChooseProject={() => undefined}
        onResumeObservation={() => undefined}
        onDiscardAndStartObservation={() => undefined}
        onOpenSync={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: /fieldwork/i })).toBeTruthy();
    expect(screen.getByLabelText("collect by gbrlpzz")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "gbrlpzz" }).getAttribute("href"),
    ).toBe("https://gbrlpzz.com/");
    expect(screen.queryByRole("heading", { name: /^projects$/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /add observation/i }));
    expect(onStartObservation).toHaveBeenCalledWith(project);
  });

  it("resumes a draft or deliberately discards it to start fresh", () => {
    const onResumeObservation = vi.fn();
    const onDiscardAndStartObservation = vi.fn();
    render(
      <ContributorHome
        projects={[project]}
        activeProject={project}
        observations={[]}
        hasDraft
        onStartObservation={() => undefined}
        onChooseProject={() => undefined}
        onResumeObservation={onResumeObservation}
        onDiscardAndStartObservation={onDiscardAndStartObservation}
        onOpenSync={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /add observation/i }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /resume observation/i }),
    );
    expect(onResumeObservation).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: /discard and start new/i }),
    );
    expect(onDiscardAndStartObservation).toHaveBeenCalledWith(project);
  });

  it("leaves collection for Home without discarding the draft", () => {
    const onBack = vi.fn();
    const fields: FieldDefinition[] = [
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
        draft={{ notes: "Unfinished field note" }}
        lastSavedAt="09:00"
        onDraftChange={() => undefined}
        onSubmit={() => undefined}
        onBack={onBack}
        isSaving={false}
        attentionCheck={false}
      />,
    );

    expect(screen.getByText("Notes")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /save draft and return home/i }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the contributor and admin surfaces separate", () => {
    render(
      <TopBar mode="contributor" view="home" onNavigate={() => undefined} />,
    );

    expect(
      screen.queryByRole("button", { name: /switch to admin/i }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    expect(screen.getByText("field@example.com")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /sign in another device/i }),
    );
    expect(onLinkDevice).toHaveBeenCalledTimes(1);
  });

  it("keeps app version and feedback inside the profile hierarchy", () => {
    render(
      <ProfileSheet
        userEmail="field@example.com"
        profile={null}
        observations={[]}
        lastSyncAt={null}
        isAdmin={false}
        isPreview={false}
        onClose={() => undefined}
      />,
    );

    const about = screen.getByText("About collect").closest("details")!;
    expect(about.open).toBe(false);
    fireEvent.click(screen.getByText("About collect"));
    expect(about.open).toBe(true);
    expect(screen.getByText(/Version 0\.1\.2/i)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /send feedback/i }).getAttribute("href"),
    ).toContain("github.com/gbrlpzz/collect/issues/new");
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
    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));

    await waitFor(() =>
      expect(
        screen.getByRole("img", {
          name: /attention score 92 out of 100, based on 24 checks/i,
        }),
      ).toBeTruthy(),
    );
    expect(screen.getByText("14")).toBeTruthy();
    fireEvent.click(screen.getByText("Attention"));
    expect(screen.getByText(/chance-adjusted/i)).toBeTruthy();
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
    const agreementDetails = screen
      .getByText("How your agreement is recorded")
      .closest("details")!;
    expect(agreementDetails.open).toBe(false);
    fireEvent.click(screen.getByText("How your agreement is recorded"));
    expect(agreementDetails.open).toBe(true);
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

  it("opens sync status and starts synchronization from the home screen", () => {
    const onOpenSync = vi.fn();
    render(
      <ContributorHome
        projects={[project]}
        activeProject={project}
        observations={[
          {
            id: "waiting-1",
            projectId: project.id,
            createdAt: "2026-08-12T08:00:00.000Z",
            status: "SAVED_LOCAL",
            values: {},
          },
        ]}
        hasDraft={false}
        onStartObservation={() => undefined}
        onChooseProject={() => undefined}
        onResumeObservation={() => undefined}
        onDiscardAndStartObservation={() => undefined}
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
        attentionCheck={false}
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
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();

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

    expect(
      screen.getByRole("heading", { name: "Invite contributors" }),
    ).toBeTruthy();
    expect(screen.queryByText("Invitation preview")).toBeNull();
    const invitationDetails = screen
      .getByText("How invitations work")
      .closest("details")!;
    expect(invitationDetails.open).toBe(false);
    fireEvent.click(screen.getByText("How invitations work"));
    expect(invitationDetails.open).toBe(true);
    expect(
      screen.getByRole("button", { name: /publish project/i }),
    ).toBeTruthy();
    expect(screen.queryByText("Step 4 of 4")).toBeNull();
  });
});
