// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import * as supabaseClient from "../src/lib/supabaseClient";

const authMocks = {
  enabledAuthProviders: vi.fn().mockResolvedValue(["google", "apple"]),
  knownAuthProviders: vi.fn().mockReturnValue(["google", "apple"]),
};

beforeEach(() => {
  vi.spyOn(supabaseClient, "authCallbackError").mockReturnValue(null);
  vi.spyOn(supabaseClient, "pendingAuthEmail").mockReturnValue("");
  vi.spyOn(supabaseClient, "rememberAuthEmail").mockImplementation(
    () => undefined,
  );
  vi.spyOn(supabaseClient, "sendMagicLink").mockResolvedValue(undefined);
  vi.spyOn(supabaseClient, "signInWithPassword").mockResolvedValue(undefined);
  vi.spyOn(supabaseClient, "setPassword").mockResolvedValue(undefined);
  vi.spyOn(supabaseClient, "linkDeviceSession").mockResolvedValue(undefined);
  vi.spyOn(supabaseClient, "requestDeviceLinkCode").mockResolvedValue({
    code: "AB2D9KQX",
    expiresInSeconds: 120,
  });
  vi.spyOn(supabaseClient, "requestContributorSigninCode").mockResolvedValue(
    undefined,
  );
  vi.spyOn(supabaseClient, "signInWithProvider").mockResolvedValue(undefined);
  vi.spyOn(supabaseClient, "enabledAuthProviders").mockImplementation(
    authMocks.enabledAuthProviders,
  );
  vi.spyOn(supabaseClient, "knownAuthProviders").mockImplementation(
    authMocks.knownAuthProviders,
  );
});

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
