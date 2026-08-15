// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
      expect(authMocks.signInWithProvider).toHaveBeenCalledWith(
        "google",
        "contributor",
      ),
    );
  });

  it("passes the admin surface to provider sign-in from the admin screen", async () => {
    render(<AuthScreen configured role="admin" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() =>
      expect(authMocks.signInWithProvider).toHaveBeenCalledWith(
        "google",
        "admin",
      ),
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

  it("names what each surface is for", async () => {
    const contributor = render(<AuthScreen configured role="contributor" />);
    expect(
      await screen.findByText(/reach the projects you contribute to/i),
    ).toBeTruthy();
    contributor.unmount();

    render(<AuthScreen configured role="admin" />);
    expect(
      await screen.findByText(/run projects, schemas, and contributor access/i),
    ).toBeTruthy();
    expect(
      screen.queryByText(/reach the projects you contribute to/i),
    ).toBeNull();
  });

  it("lists every backup method as one named row", async () => {
    render(<AuthScreen configured role="contributor" />);
    await screen.findByRole("button", { name: "Continue with Apple" });

    expect(screen.getByText("Other ways to sign in")).toBeTruthy();
    const rows = Array.from(document.querySelectorAll(".auth-method"));
    expect(
      rows.map((row) => row.querySelector(".auth-method-copy")?.textContent),
    ).toEqual([
      "Email me a sign-in link",
      "Sign in with a password",
      "Sign in with a code",
    ]);
    // Progressive disclosure: a row names its method and explains nothing
    // until it is opened.
    expect(
      screen.queryByText(/from your administrator or a signed-in device/i),
    ).toBeNull();
  });

  it("explains a method only once it is opened", async () => {
    render(<AuthScreen configured role="contributor" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /sign in with a code/i }),
    );

    expect(
      screen.getByText(/from your administrator or a signed-in device/i),
    ).toBeTruthy();
  });

  it("opens one method at a time, with a way back", async () => {
    render(<AuthScreen configured role="contributor" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /sign in with a password/i }),
    );

    // The chosen method is alone on the screen: no provider buttons, no list.
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(document.querySelectorAll(".auth-method").length).toBe(0);
    expect(document.querySelectorAll(".provider-button").length).toBe(0);

    fireEvent.click(
      screen.getByRole("button", { name: /all sign-in options/i }),
    );
    expect(
      await screen.findByRole("button", { name: "Continue with Apple" }),
    ).toBeTruthy();
    expect(document.querySelectorAll(".auth-method").length).toBe(3);
  });

  it("offers the same named methods when no provider is enabled", async () => {
    authMocks.enabledAuthProviders.mockResolvedValue([]);
    render(<AuthScreen configured role="contributor" />);

    await waitFor(() =>
      expect(document.querySelectorAll(".auth-method").length).toBe(3),
    );
    expect(document.querySelectorAll(".provider-button").length).toBe(0);
    expect(screen.getByText(/choose how to sign in/i)).toBeTruthy();
  });

  it("never asks a provider account to invent a password", async () => {
    render(
      <AuthScreen configured role="contributor" requirePasswordSetup={false} />,
    );
    await screen.findByRole("button", { name: "Continue with Apple" });

    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it("tells an installed app how to finish sign-in, with the remedy attached", async () => {
    const standaloneNavigator = navigator as Navigator & {
      standalone?: boolean;
    };
    const previous = standaloneNavigator.standalone;
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    try {
      render(<AuthScreen configured role="contributor" />);
      await screen.findByRole("button", { name: "Continue with Apple" });

      // Visible, not collapsed: this is a real situation the person can act
      // on, and the action sits inside the message.
      expect(screen.getByText(/this is the installed app/i)).toBeTruthy();
      const callout = document.querySelector(".auth-callout") as HTMLElement;
      fireEvent.click(
        within(callout).getByRole("button", { name: "Sign in with a code" }),
      );
      expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: previous,
      });
    }
  });
});
