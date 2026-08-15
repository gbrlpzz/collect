// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthScreen } from "../src/components/auth/AuthScreen";

const authMocks = vi.hoisted(() => ({
  signInWithProvider: vi.fn().mockResolvedValue(undefined),
  enabledAuthProviders: vi.fn().mockResolvedValue(["google", "apple"]),
  knownAuthProviders: vi.fn().mockReturnValue([]),
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  setPassword: vi.fn().mockResolvedValue(undefined),
  linkDeviceSession: vi.fn().mockResolvedValue(undefined),
  requestContributorSigninCode: vi.fn().mockResolvedValue(undefined),
  requestDeviceLinkCode: vi
    .fn()
    .mockResolvedValue({ code: "AB2D9KQX", expiresInSeconds: 120 }),
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

describe("provider sign-in", () => {
  beforeEach(() => {
    authMocks.signInWithProvider.mockClear();
    authMocks.enabledAuthProviders.mockResolvedValue(["google", "apple"]);
  });

  it("offers the enabled providers first, with Apple named and reachable", async () => {
    render(<AuthScreen configured role="contributor" />);

    const apple = await screen.findByRole("button", {
      name: "Continue with Apple",
    });
    const google = await screen.findByRole("button", {
      name: "Continue with Google",
    });
    // Apple's guidance: an approved title, and never below the other buttons.
    const buttons = Array.from(
      document.querySelectorAll(".provider-button"),
    ) as HTMLElement[];
    expect(buttons[0]).toBe(apple);
    expect(buttons[1]).toBe(google);
    // No email is requested to sign in at all.
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });

  it("starts the provider flow when a provider button is used", async () => {
    render(<AuthScreen configured role="contributor" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() =>
      expect(authMocks.signInWithProvider).toHaveBeenCalledWith("google"),
    );
  });

  it("offers only the providers the deployment enables", async () => {
    authMocks.enabledAuthProviders.mockResolvedValue(["google"]);
    render(<AuthScreen configured role="admin" />);

    await screen.findByRole("button", { name: "Continue with Google" });
    expect(
      screen.queryByRole("button", { name: "Continue with Apple" }),
    ).toBeNull();
  });

  it("keeps every backup method available under one disclosure", async () => {
    render(<AuthScreen configured role="contributor" />);
    await screen.findByRole("button", { name: "Continue with Apple" });

    expect(screen.getByText("Other ways to sign in")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /email me a sign-in link/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /use an email address and password/i,
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: /use a code from your administrator or another device/i,
      }),
    ).toBeTruthy();
  });

  it("falls back to a named method when no provider is enabled", async () => {
    authMocks.enabledAuthProviders.mockResolvedValue([]);
    render(<AuthScreen configured role="contributor" />);

    await waitFor(() =>
      expect(document.querySelectorAll(".provider-button").length).toBe(0),
    );
    expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();
  });

  it("never asks a provider account to invent a password", async () => {
    render(
      <AuthScreen configured role="contributor" requirePasswordSetup={false} />,
    );
    await screen.findByRole("button", { name: "Continue with Apple" });

    expect(screen.queryByLabelText("New password")).toBeNull();
  });
});
