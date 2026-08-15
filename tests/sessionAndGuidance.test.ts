import { describe, expect, it } from "vitest";
import { nextLocalScope } from "../src/lib/auth/scopePolicy";
import { failureGuidance } from "../src/lib/syncErrors";

describe("local scope policy", () => {
  it("adopts the account scope on first sign-in", () => {
    expect(nextLocalScope(null, "user-a", "SIGNED_IN")).toEqual({
      scope: "user-a",
      reloadForAccountSwitch: false,
    });
  });

  it("keeps the scope for the same account", () => {
    expect(nextLocalScope("user-a", "user-a", "SIGNED_IN").scope).toBe(
      "user-a",
    );
    expect(nextLocalScope("user-a", "user-a", "TOKEN_REFRESHED").scope).toBe(
      "user-a",
    );
  });

  it("switches scope and reloads when a different person signs in", () => {
    expect(nextLocalScope("user-a", "user-b", "SIGNED_IN")).toEqual({
      scope: "user-b",
      reloadForAccountSwitch: true,
    });
  });

  it("leaves the account scope only on explicit sign-out", () => {
    expect(nextLocalScope("user-a", null, "SIGNED_OUT")).toEqual({
      scope: "default",
      reloadForAccountSwitch: false,
    });
  });

  it("never flips to the anonymous scope on a transient null session", () => {
    // An offline token-refresh failure delivers a null session without an
    // explicit sign-out; switching to "default" would redirect autosave into
    // the wrong database and make the account's data seem to vanish.
    expect(nextLocalScope("user-a", null, "TOKEN_REFRESH_FAILED")).toEqual({
      scope: null,
      reloadForAccountSwitch: false,
    });
    expect(nextLocalScope("user-a", null, "INITIAL_SESSION")).toEqual({
      scope: null,
      reloadForAccountSwitch: false,
    });
  });

  it("returns to the account scope after a transient null session recovers", () => {
    expect(
      nextLocalScope("user-a", "user-a", "SIGNED_IN").reloadForAccountSwitch,
    ).toBe(false);
  });
});

describe("failure guidance taxonomy", () => {
  it("explains missing local media", () => {
    const guidance = failureGuidance("Media 123 has no local blob");
    expect(guidance.title).toContain("missing from this device");
    expect(guidance.action).toContain("administrator");
  });

  it("explains schema drift", () => {
    const guidance = failureGuidance("unknown schema version 9");
    expect(guidance.title).toContain("form");
  });

  it("explains access and consent changes", () => {
    const guidance = failureGuidance("consent has been revoked");
    expect(guidance.title).toContain("access");
  });

  it("explains conflicts and integrity failures", () => {
    const guidance = failureGuidance("checksum does not match");
    expect(guidance.title).toContain("refused");
  });

  it("falls back to an honest generic cause", () => {
    const guidance = failureGuidance(null);
    expect(guidance.action).toContain("stays saved");
  });
});
