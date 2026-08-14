// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContributorsPanel } from "../src/components/AdminDashboard";
import type { ContributorReadiness } from "../src/lib/adminBackend";

const backendMocks = vi.hoisted(() => ({
  mintContributorSigninCode: vi.fn().mockResolvedValue({
    code: "AB2D9KQX",
    expiresInSeconds: 1200,
    emailed: true,
  }),
}));

vi.mock("../src/lib/adminBackend", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/adminBackend")>();
  return {
    ...actual,
    mintContributorSigninCode: backendMocks.mintContributorSigninCode,
  };
});

vi.mock("../src/lib/supabaseClient", () => ({
  isSupabaseConfigured: false,
}));

const memberRow: ContributorReadiness = {
  id: "u1",
  email: "alice@lab.org",
  status: "Ready",
  ready: true,
  pending: 0,
  lastSeen: null,
  received: 0,
  attentionScore: null,
  attentionChecksTotal: null,
  attentionCorrectTotal: null,
  consentGranted: true,
};

const inviteRow: ContributorReadiness = {
  ...memberRow,
  id: "invite:1",
  email: "frank@lab.org",
  status: "Invitation pending",
  ready: false,
  invitedOnly: true,
};

describe("contributor sign-in codes (admin side)", () => {
  it("issues a code from the roster menu and shows it for sharing", async () => {
    render(
      <ContributorsPanel
        projectId="p1"
        onToast={() => undefined}
        rows={[memberRow]}
        error={false}
        refresh={() => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /issue sign-in code/i }),
    );

    await waitFor(() =>
      expect(backendMocks.mintContributorSigninCode).toHaveBeenCalledWith(
        "p1",
        "alice@lab.org",
      ),
    );
    expect(screen.getByLabelText(/code ab2d9kqx/i)).toBeTruthy();
    expect(screen.getByText(/emailed to/i)).toBeTruthy();
    expect(screen.getByText(/expires in 20 minutes/i)).toBeTruthy();
  });

  it("hides the issue action for pending invitations", () => {
    render(
      <ContributorsPanel
        projectId="p1"
        onToast={() => undefined}
        rows={[inviteRow]}
        error={false}
        refresh={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /issue sign-in code/i }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: /revoke invitation/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /view profile/i })).toBeNull();
  });
});
