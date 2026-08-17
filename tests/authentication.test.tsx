// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthScreen } from "../src/components/auth/AuthScreen";

import * as supabaseClient from "../src/lib/supabaseClient";

const authMocks = {
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
};

beforeEach(() => {
  vi.spyOn(supabaseClient, "authCallbackError").mockReturnValue(null);
  vi.spyOn(supabaseClient, "pendingAuthEmail").mockReturnValue("");
  vi.spyOn(supabaseClient, "rememberAuthEmail").mockImplementation(
    () => undefined,
  );
  vi.spyOn(supabaseClient, "sendMagicLink").mockImplementation(
    authMocks.sendMagicLink,
  );
  vi.spyOn(supabaseClient, "signInWithPassword").mockImplementation(
    authMocks.signInWithPassword,
  );
  vi.spyOn(supabaseClient, "setPassword").mockImplementation(
    authMocks.setPassword,
  );
  vi.spyOn(supabaseClient, "linkDeviceSession").mockImplementation(
    authMocks.linkDeviceSession,
  );
  vi.spyOn(supabaseClient, "requestDeviceLinkCode").mockImplementation(
    authMocks.requestDeviceLinkCode,
  );
  vi.spyOn(supabaseClient, "requestContributorSigninCode").mockImplementation(
    authMocks.requestContributorSigninCode,
  );
  vi.spyOn(supabaseClient, "signInWithProvider").mockImplementation(
    authMocks.signInWithProvider,
  );
  vi.spyOn(supabaseClient, "enabledAuthProviders").mockImplementation(
    authMocks.enabledAuthProviders,
  );
  vi.spyOn(supabaseClient, "knownAuthProviders").mockImplementation(
    authMocks.knownAuthProviders,
  );
});

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
    // SAFETY: querySelectorAll returns provider button elements.
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

  it("focuses on code sign-in on installed PWA, hiding Google and web-only methods", async () => {
    // SAFETY: standalone is a non-standard iOS property on navigator.
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

      // In standalone mode, Google and other methods are hidden
      expect(
        screen.queryByRole("button", { name: "Continue with Google" }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Continue with Apple" }),
      ).toBeNull();
      expect(screen.queryByText("Other ways to sign in")).toBeNull();

      // Clear guidance and code input are directly available
      expect(screen.getByText(/how to get your sign-in code/i)).toBeTruthy();
      expect(screen.getByText(/sign in another device/i)).toBeTruthy();
      expect(
        screen.getByRole("link", { name: /open in safari/i }),
      ).toBeTruthy();
      expect(screen.getByLabelText(/8-character code/i)).toBeTruthy();
    } finally {
      Object.defineProperty(navigator, "standalone", {
        configurable: true,
        value: previous,
      });
    }
  });
});
