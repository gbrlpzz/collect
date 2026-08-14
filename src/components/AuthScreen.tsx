import { useId, useRef, useState } from "react";
import {
  authCallbackError,
  linkDeviceSession,
  pendingAuthEmail,
  rememberAuthEmail,
  requestContributorSigninCode,
  sendMagicLink,
  setPassword,
  signInWithPassword,
} from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { CollectBrand } from "./CollectBrand";
import { Button, ClearButton } from "./ui";
import { isAppleMobileBrowser, isStandaloneApp } from "../lib/platform";

interface AuthScreenProps {
  configured: boolean;
  role?: "admin" | "contributor";
  onPreview?: () => void;
  /** After an invite/link sign-in, the account has no password yet. */
  requirePasswordSetup?: boolean;
  onPasswordSet?: () => void;
}

function isLocalDevelopmentOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

type EntryMode = "password" | "link" | "device";

export function AuthScreen({
  configured,
  role = "contributor",
  onPreview,
  requirePasswordSetup = false,
  onPasswordSet,
}: AuthScreenProps) {
  const isAdmin = role === "admin";
  const emailInputId = useId();
  const passwordInputId = useId();
  const standalone = isStandaloneApp();
  const showInstallHint = isAppleMobileBrowser() && !standalone;
  const showLocalRedirectHint = configured && isLocalDevelopmentOrigin();
  // Contributors sign in with a code; administrators keep the link flow
  // (invitations and password setup) with device-link as the mobile bridge.
  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    role === "contributor" ? "device" : standalone ? "device" : "link",
  );
  const [email, setEmail] = useState(pendingAuthEmail);
  const [password, setPasswordValue] = useState("");
  const [sent, setSent] = useState(false);
  const [callbackIssue, setCallbackIssue] = useState<string | null>(() =>
    authCallbackError(),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  // One-time password setup after invite/link sign-in.
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSetupError, setPasswordSetupError] = useState<string | null>(
    null,
  );
  const [passwordSetupBusy, setPasswordSetupBusy] = useState(false);
  // Device-link entry.
  const deviceCodeInputRef = useRef<HTMLInputElement>(null);
  // Self-service: request a fresh sign-in code by email.
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    setCallbackIssue(null);
    rememberAuthEmail(address);
    try {
      await sendMagicLink(address);
      setSent(true);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("redirect") || message.includes("url")) {
        setError(
          "This deployment’s sign-in return address is not configured yet. Ask its administrator to add the app URL in Supabase.",
        );
      } else if (message.includes("rate") || message.includes("too many")) {
        setError(
          "Too many requests. Wait a moment, then request one fresh link.",
        );
      } else if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to")
      ) {
        setError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setError(
          "That sign-in link could not be sent. Check the address and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async () => {
    const address = email.trim();
    if (!address || !password) return;
    setBusy(true);
    setError(null);
    setCallbackIssue(null);
    rememberAuthEmail(address);
    try {
      await signInWithPassword(address, password);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("invalid") ||
        message.includes("credentials") ||
        message.includes("password")
      ) {
        setError("The email address or password is incorrect. Try again.");
      } else if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to")
      ) {
        setError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setError(
          "Sign-in could not be completed. Check your details and try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const requestCode = async () => {
    const address = requestEmail.trim();
    if (!address) return;
    setRequestBusy(true);
    setRequestError(null);
    try {
      await requestContributorSigninCode(address);
      setRequestSent(true);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to") ||
        message.includes("configured")
      ) {
        setRequestError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setRequestError("That could not be completed. Try again in a moment.");
      }
    } finally {
      setRequestBusy(false);
    }
  };

  const submitDeviceLink = async (token?: string) => {
    const nextToken = (token ?? code).trim().toUpperCase();
    if (nextToken.length !== 8) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      await linkDeviceSession(nextToken);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("expired") ||
        message.includes("invalid") ||
        message.includes("code") ||
        message.includes("not found")
      ) {
        setCodeError(
          "That code is invalid or expired. Ask your administrator for a fresh code.",
        );
      } else if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to")
      ) {
        setCodeError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setCodeError(
          "That code could not be used. Request a fresh code and try again.",
        );
      }
    } finally {
      setCodeBusy(false);
    }
  };

  const submitPasswordSetup = async () => {
    if (newPassword.length < 6) {
      setPasswordSetupError("Choose a password with at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordSetupError("The two passwords do not match.");
      return;
    }
    setPasswordSetupBusy(true);
    setPasswordSetupError(null);
    try {
      await setPassword(newPassword);
      onPasswordSet?.();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("weak") ||
        message.includes("short") ||
        message.includes("6")
      ) {
        setPasswordSetupError(
          "Choose a stronger password (at least 6 characters).",
        );
      } else if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to")
      ) {
        setPasswordSetupError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setPasswordSetupError("The password could not be saved. Try again.");
      }
    } finally {
      setPasswordSetupBusy(false);
    }
  };

  // One-time password setup screen (shown after invite/link sign-in).
  if (requirePasswordSetup) {
    return (
      <main className={`auth-page auth-page-${role}`}>
        <div className="auth-mark">
          <CollectBrand />
        </div>
        <section className="auth-card" aria-labelledby="auth-password-title">
          <h1 id="auth-password-title">Create a password.</h1>
          <p>Use it to sign in on other devices.</p>
          <form
            className="auth-set-password"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPasswordSetup();
            }}
          >
            <div className="auth-label">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                className="field-input"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setPasswordSetupError(null);
                }}
                placeholder="At least 6 characters"
                autoFocus
                disabled={passwordSetupBusy}
              />
            </div>
            <div className="auth-label">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                className="field-input"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setPasswordSetupError(null);
                }}
                placeholder="Repeat the password"
                disabled={passwordSetupBusy}
              />
            </div>
            {passwordSetupError && (
              <p className="auth-error" role="alert">
                {passwordSetupError}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={
                passwordSetupBusy ||
                newPassword.length < 6 ||
                confirmPassword.length < 6
              }
              busy={passwordSetupBusy}
            >
              {passwordSetupBusy ? "Saving…" : "Save password"}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={`auth-page auth-page-${role}`}>
      <div className="auth-mark">
        <CollectBrand />
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        {!sent ? (
          <>
            <h1 id="auth-title">
              {callbackIssue
                ? "Request a new link."
                : entryMode === "device"
                  ? "Sign in with a code."
                  : isAdmin
                    ? "Admin sign in."
                    : "Sign in."}
            </h1>
            <p>
              {configured
                ? callbackIssue
                  ? "Enter the invited email address and we’ll send a fresh one-time link."
                  : entryMode === "device"
                    ? "Enter the code your administrator issued, or request a new one below."
                    : "Use your invited email address."
                : "Authentication is not configured for this deployment."}
            </p>
            {configured ? (
              entryMode === "password" ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitPassword();
                  }}
                >
                  <div className="auth-label">
                    <label htmlFor={emailInputId}>Email address</label>
                    <div className="input-with-clear">
                      <input
                        id={emailInputId}
                        className="field-input"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      {email && (
                        <ClearButton
                          label="Clear email address"
                          onClick={() => setEmail("")}
                        />
                      )}
                    </div>
                  </div>
                  <div className="auth-label">
                    <label htmlFor={passwordInputId}>Password</label>
                    <input
                      id={passwordInputId}
                      className="field-input"
                      type="password"
                      required
                      value={password}
                      onChange={(event) => {
                        setPasswordValue(event.target.value);
                        setError(null);
                      }}
                      placeholder="Your password"
                      autoComplete="current-password"
                    />
                  </div>
                  {(callbackIssue || error) && (
                    <p className="auth-error" role="alert">
                      {callbackIssue ?? error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    iconAfter="arrow-right"
                    disabled={busy || !email.trim() || !password}
                    busy={busy}
                  >
                    {busy ? "Signing in…" : "Sign in"}
                  </Button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setEntryMode("link");
                      setError(null);
                      setCallbackIssue(null);
                    }}
                  >
                    Sign in with a link instead{" "}
                    <Icon name="arrow-right" size={15} />
                  </button>
                </form>
              ) : entryMode === "device" ? (
                <div className="auth-code">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitDeviceLink();
                    }}
                  >
                    <label className="auth-label" htmlFor="auth-device-code">
                      8-character code
                      <input
                        ref={deviceCodeInputRef}
                        id="auth-device-code"
                        className="field-input"
                        type="text"
                        required
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="one-time-code"
                        pattern="[A-Z0-9]{8}"
                        maxLength={8}
                        value={code}
                        onChange={(event) => {
                          const nextCode = event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 8);
                          setCode(nextCode);
                          setCodeError(null);
                          if (nextCode.length === 8 && !codeBusy)
                            void submitDeviceLink(nextCode);
                        }}
                        placeholder="AB2D9KQX"
                        disabled={codeBusy}
                      />
                    </label>
                    {codeError && (
                      <p className="auth-error" role="alert">
                        {codeError}
                      </p>
                    )}
                    {(code.length === 8 || codeBusy) && (
                      <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        disabled={codeBusy}
                        busy={codeBusy}
                      >
                        {codeBusy
                          ? "Signing in…"
                          : codeError
                            ? "Try again"
                            : "Sign in"}
                      </Button>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setRequestOpen((current) => !current);
                        setRequestSent(false);
                        setRequestError(null);
                      }}
                    >
                      {requestOpen ? "Hide" : "Request a new code by email"}{" "}
                      <Icon name="arrow-right" size={15} />
                    </button>
                    {requestOpen && (
                      <div className="auth-code-request">
                        {requestSent ? (
                          <p className="auth-sent-note" role="status">
                            If an account exists, a code is on its way to that
                            address.
                          </p>
                        ) : (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void requestCode();
                            }}
                          >
                            <div className="auth-label">
                              <label htmlFor="auth-request-email">
                                Email address
                              </label>
                              <input
                                id="auth-request-email"
                                className="field-input"
                                type="email"
                                required
                                value={requestEmail}
                                onChange={(event) => {
                                  setRequestEmail(event.target.value);
                                  setRequestError(null);
                                }}
                                placeholder="you@example.com"
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                spellCheck={false}
                              />
                            </div>
                            {requestError && (
                              <p className="auth-error" role="alert">
                                {requestError}
                              </p>
                            )}
                            <Button
                              type="submit"
                              variant="secondary"
                              fullWidth
                              disabled={requestBusy || !requestEmail.trim()}
                              busy={requestBusy}
                            >
                              {requestBusy
                                ? "Sending…"
                                : "Send me a sign-in code"}
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setEntryMode(isAdmin ? "link" : "password");
                        setCode("");
                        setCodeError(null);
                      }}
                    >
                      {isAdmin
                        ? "Sign in with email instead"
                        : "Sign in with a password instead"}{" "}
                      <Icon name="arrow-right" size={15} />
                    </button>
                  </form>
                </div>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <div className="auth-label">
                    <label htmlFor={emailInputId}>Email address</label>
                    <div className="input-with-clear">
                      <input
                        id={emailInputId}
                        className="field-input"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      {email && (
                        <ClearButton
                          label="Clear email address"
                          onClick={() => setEmail("")}
                        />
                      )}
                    </div>
                  </div>
                  {(callbackIssue || error) && (
                    <p className="auth-error" role="alert">
                      {callbackIssue ?? error}
                    </p>
                  )}
                  {showLocalRedirectHint && (
                    <p className="auth-config-note">
                      <Icon name="info" size={16} />
                      <span>
                        Local preview: sign-in links return to the deployed app.
                        Open the deployed address on your phone.
                      </span>
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    iconAfter="arrow-right"
                    disabled={busy || !email.trim()}
                    busy={busy}
                  >
                    {busy ? "Sending…" : "Continue"}
                  </Button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setEntryMode("password");
                      setError(null);
                      setCallbackIssue(null);
                    }}
                  >
                    Sign in with a password instead{" "}
                    <Icon name="arrow-right" size={15} />
                  </button>
                </form>
              )
            ) : null}
            {configured && entryMode !== "device" && (
              <details className="auth-alternatives">
                <summary>Other sign-in options</summary>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEntryMode("device");
                    setCode("");
                    setCodeError(null);
                    window.setTimeout(
                      () => deviceCodeInputRef.current?.focus(),
                      0,
                    );
                  }}
                >
                  Use a code from a signed-in device{" "}
                  <Icon name="arrow-right" size={15} />
                </button>
              </details>
            )}
          </>
        ) : (
          <div className="auth-sent">
            <h1>Check your inbox.</h1>
            <p>
              Open the newest link sent to <strong>{email}</strong>. If it is
              missing, check spam.
            </p>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="text-button"
              onClick={() => void submit()}
              disabled={busy}
            >
              {busy ? "Sending…" : "Send a new link"}{" "}
              <Icon name="refresh" size={15} />
            </button>
            <button
              className="text-button"
              onClick={() => {
                setSent(false);
                setError(null);
                setCallbackIssue(null);
              }}
            >
              Use another email <Icon name="arrow-right" size={15} />
            </button>
          </div>
        )}
        {!configured && onPreview && (
          <button className="auth-preview-button" onClick={onPreview}>
            Open interface preview <Icon name="arrow-right" size={15} />
          </button>
        )}
        {showInstallHint && (
          <details className="auth-install-help">
            <summary>
              <Icon name="plus" size={16} /> Add collect to Home Screen
            </summary>
            <div className="auth-install-content">
              <ol>
                <li>
                  Tap <strong>Share</strong>.
                </li>
                <li>
                  Tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong>.
                </li>
              </ol>
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
