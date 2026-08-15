// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { AuthScreen } from "../src/components/auth/AuthScreen";
import { ConsentScreen } from "../src/components/ConsentScreen";
import { NewProjectWizard } from "../src/components/NewProjectWizard";
import { ProfileSheet } from "../src/components/ProfileSheet";
import { SyncSheet } from "../src/components/SyncSheet";

async function expectNoAccessibilityViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom has no layout or rendered color information. Contrast remains a
      // browser-level check; every semantic and ARIA rule still runs here.
      "color-contrast": { enabled: false },
    },
  });
  expect(results.violations.map(({ id, help }) => `${id}: ${help}`)).toEqual(
    [],
  );
}

const authMocks = vi.hoisted(() => ({
  enabledAuthProviders: vi.fn().mockResolvedValue(["google", "apple"]),
  knownAuthProviders: vi.fn().mockReturnValue(["google", "apple"]),
}));

vi.mock("../src/lib/supabaseClient", () => ({
  authCallbackError: () => null,
  pendingAuthEmail: () => "",
  rememberAuthEmail: () => undefined,
  sendMagicLink: vi.fn(),
  signInWithPassword: vi.fn(),
  setPassword: vi.fn(),
  linkDeviceSession: vi.fn(),
  requestDeviceLinkCode: vi.fn(),
  requestContributorSigninCode: vi.fn(),
  signInWithProvider: vi.fn(),
  enabledAuthProviders: authMocks.enabledAuthProviders,
  knownAuthProviders: authMocks.knownAuthProviders,
  authProviders: ["google", "apple"],
  authProviderLabel: { google: "Google", apple: "Apple" },
}));

describe("automated accessibility checks", () => {
  it("keeps the sign-in screen semantically valid", async () => {
    const { container } = render(<AuthScreen configured role="contributor" />);
    expect(
      await screen.findByRole("button", { name: "Continue with Apple" }),
    ).toBeTruthy();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the consent summary and disclosure semantically valid", async () => {
    const { container } = render(
      <ConsentScreen
        version={2}
        text={"Please review.\n\n1. Answers are recorded.\n\nYou may decline."}
        onAccept={() => undefined}
        onDecline={() => undefined}
      />,
    );
    await expectNoAccessibilityViolations(container);
  });

  it("keeps the simplified project wizard semantically valid", async () => {
    const { container } = render(
      <NewProjectWizard onBack={() => undefined} onPublish={() => undefined} />,
    );
    expect(screen.getByLabelText("Project name")).toBeTruthy();
    await expectNoAccessibilityViolations(container);
  });

  it("keeps profile privacy and statistics semantically valid", async () => {
    const { container } = render(
      <ProfileSheet
        userEmail="field@example.com"
        profile={{
          userId: "u1",
          consentVersion: 1,
          consentGrantedAt: "2026-08-12T00:00:00Z",
          consentRevokedAt: null,
          qualityScore: null,
          attentionScore: 88,
          attentionChecksTotal: 10,
          attentionCorrectTotal: 9,
          attentionLastAt: null,
          contributionCount: 12,
        }}
        observations={[]}
        lastSyncAt="2026-08-12T12:00:00Z"
        isAdmin={false}
        isPreview={false}
        onClose={() => undefined}
        onSignOut={() => undefined}
      />,
    );
    expect(screen.queryByText("What collect records and why")).toBeNull();
    expect(screen.queryByText("Version and feedback")).toBeNull();
    fireEvent.click(screen.getByText("Data and privacy"));
    fireEvent.click(screen.getByText("About collect"));
    await expectNoAccessibilityViolations(container);
  });

  it("keeps healthy sync state semantically valid", async () => {
    const { container } = render(
      <SyncSheet
        observations={[]}
        lastSyncAt="2026-08-12T12:00:00Z"
        isSyncing={false}
        progress={{}}
        onClose={() => undefined}
        onSync={() => undefined}
        onRecoveryExport={() => undefined}
      />,
    );
    expect(screen.queryByText(/server has acknowledged/i)).toBeNull();
    await expectNoAccessibilityViolations(container);
  });
});
