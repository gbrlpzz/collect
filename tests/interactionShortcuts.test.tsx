// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthScreen } from "../src/components/AuthScreen";
import { Collector } from "../src/components/Collector";
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
    fireEvent.click(
      screen.getByRole("button", { name: /sign in with a link instead/i }),
    );
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
    fireEvent.click(
      screen.getByRole("button", {
        name: /signed in on the web\? enter the code shown there/i,
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
      expect(screen.getByText("92/100 · 24 checks")).toBeTruthy(),
    );
    expect(screen.getByText(/adjusted for random guessing/i)).toBeTruthy();
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
