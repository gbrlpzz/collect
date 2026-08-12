import { useId, useRef, useState } from "react";
import {
  authCallbackError,
  linkDeviceSession,
  pendingAuthEmail,
  rememberAuthEmail,
  sendMagicLink,
  setPassword,
  signInWithPassword,
  verifySignInCode,
} from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, ClearButton, Eyebrow } from "./ui";

interface AuthScreenProps {
  configured: boolean;
  role?: "admin" | "contributor";
  onPreview?: () => void;
  /** After an invite/link sign-in, the account has no password yet. */
  requirePasswordSetup?: boolean;
  onPasswordSet?: () => void;
}

function isAppleMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  const iPadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(userAgent) || iPadDesktopMode;
}

function isStandaloneApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)").matches ||
      standaloneNavigator.standalone,
  );
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
  const showStandaloneNote = configured && standalone;
  const [entryMode, setEntryMode] = useState<EntryMode>(() =>
    standalone ? "device" : "link",
  );
  const [email, setEmail] = useState(pendingAuthEmail);
  const [password, setPasswordValue] = useState("");
  const [sent, setSent] = useState(false);
  const [callbackIssue, setCallbackIssue] = useState<string | null>(() =>
    authCallbackError(),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
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
  const codeInputRef = useRef<HTMLInputElement>(null);

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

  const verifyCode = async (token?: string) => {
    const address = email.trim();
    const nextToken = (token ?? code).trim();
    if (!address || nextToken.length !== 6) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      await verifySignInCode(address, nextToken);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("expired") ||
        message.includes("invalid") ||
        message.includes("token")
      ) {
        setCodeError(
          "That code is invalid or expired. Check the newest email for the current code.",
        );
      } else {
        setCodeError(
          "That code could not be verified. Check the email and try again.",
        );
      }
      setCodeError((current) =>
        `${current ?? ""}${current ? " " : ""}If the email has no 6-digit code, its template needs the sign-in code added — the link in that email still works.`.trim(),
      );
    } finally {
      setCodeBusy(false);
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
          "That code is invalid or expired. Open collect on the signed-in device and request a fresh code.",
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
          "That code could not be used. Request a fresh code on the other device and try again.",
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
          collect<span>.</span>
        </div>
        <section className="auth-card" aria-labelledby="auth-password-title">
          <Eyebrow>One more step</Eyebrow>
          <h1 id="auth-password-title">Set a password.</h1>
          <p>
            Sign in on any device with your email and this password. Links and
            codes stay available as fallbacks.
          </p>
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
        collect<span>.</span>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        {!sent ? (
          <>
            <Eyebrow>
              {isAdmin
                ? "Admin workspace"
                : callbackIssue
                  ? "Sign in again"
                  : "Sign in"}
            </Eyebrow>
            <h1 id="auth-title">
              {callbackIssue
                ? "Request a new link."
                : entryMode === "device"
                  ? "Sign in to this app."
                  : isAdmin
                    ? "Sign in to collect Admin."
                    : "Sign in to collect."}
            </h1>
            <p>
              {configured
                ? callbackIssue
                  ? "Enter the invited email address and we’ll send a fresh one-time link."
                  : entryMode === "device"
                    ? "In the signed-in browser, open your profile and choose “Sign in another device”, then enter the code here."
                    : isAdmin
                      ? "Use the administrator email you were invited with."
                      : "Use the email address your administrator invited."
                : "This deployment is not connected to an authentication service yet."}
            </p>
            {showStandaloneNote && (
              <p className="auth-config-note">
                <Icon name="info" size={16} />
                <span>
                  This installed app keeps its own sign-in. If you signed in on
                  the web, transfer that sign-in with the one-time code below.
                </span>
              </p>
            )}
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
                        autoFocus
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
                      8-character code from the signed-in device
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
                        autoFocus
                        disabled={codeBusy}
                      />
                    </label>
                    <p className="auth-config-note">
                      <Icon name="info" size={16} />
                      <span>
                        On the signed-in device, open collect → Sign in on
                        another device, copy the code, and paste it here.
                      </span>
                    </p>
                    {codeError && (
                      <p className="auth-error" role="alert">
                        {codeError}
                      </p>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      disabled={codeBusy || code.length !== 8}
                      busy={codeBusy}
                    >
                      {codeBusy ? "Linking…" : "Link this device"}
                    </Button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setEntryMode("link");
                        setCode("");
                        setCodeError(null);
                      }}
                    >
                      Sign in with email instead{" "}
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
                        autoFocus
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
            ) : (
              <>
                <div className="auth-label">
                  <label htmlFor={emailInputId}>Email address</label>
                  <input
                    id={emailInputId}
                    className="field-input"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    disabled
                  />
                </div>
                <div className="auth-config-note">
                  <Icon name="info" size={16} />
                  <span>
                    Sign-in will be available when the project’s Supabase
                    connection is configured.
                  </span>
                </div>
              </>
            )}
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
            <Eyebrow>
              {isAdmin ? "Admin workspace" : "Check your inbox"}
            </Eyebrow>
            <h1>Link sent.</h1>
            <p>
              Open the newest link sent to <strong>{email}</strong> on this
              device. Each link works once and then expires.
            </p>
            <p className="auth-sent-hint">
              If you do not see it, check spam. Do not use an older message.
            </p>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {codeMode ? (
              <div className="auth-code">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void verifyCode();
                  }}
                >
                  <label className="auth-label" htmlFor="auth-code-input">
                    6-digit code from the email
                    <input
                      ref={codeInputRef}
                      id="auth-code-input"
                      className="field-input"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(event) => {
                        const nextCode = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setCode(nextCode);
                        setCodeError(null);
                        if (nextCode.length === 6 && !codeBusy)
                          void verifyCode(nextCode);
                      }}
                      placeholder="000000"
                      autoFocus
                      disabled={codeBusy}
                    />
                  </label>
                  {codeError && (
                    <p className="auth-error" role="alert">
                      {codeError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={codeBusy || code.length !== 6}
                    busy={codeBusy}
                  >
                    {codeBusy
                      ? "Verifying…"
                      : code.length === 6
                        ? "Verify again"
                        : "Verify code"}
                  </Button>
                </form>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setCodeMode(false);
                    setCode("");
                    setCodeError(null);
                  }}
                >
                  Back to the sign-in link <Icon name="arrow-right" size={15} />
                </button>
              </div>
            ) : (
              <>
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
                {configured && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setCodeMode(true);
                      setCodeError(null);
                      setCode("");
                      window.setTimeout(() => codeInputRef.current?.focus(), 0);
                    }}
                  >
                    Enter the code from the email instead{" "}
                    <Icon name="arrow-right" size={15} />
                  </button>
                )}
              </>
            )}
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
              <p>
                For reliable offline fieldwork, install collect from Safari.
              </p>
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
              <p>
                Open collect from the new icon when you are ready to work
                offline.
              </p>
            </div>
          </details>
        )}
      </section>
      <p className="auth-footnote">
        <Icon name="lock" size={14} /> Previously downloaded fieldwork remains
        available offline.
      </p>
    </main>
  );
}
