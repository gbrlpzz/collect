import { useId, useState } from "react";
import { authCallbackError, isStandalonePwa, pendingAuthEmail, rememberAuthEmail, sendMagicLink, verifySignInCode } from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, ClearButton, Eyebrow } from "./Primitives";

interface AuthScreenProps {
  configured: boolean;
  role?: "admin" | "contributor";
  onPreview?: () => void;
}

function isAppleMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent;
  const iPadDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(userAgent) || iPadDesktopMode;
}

function isStandaloneApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || standaloneNavigator.standalone);
}

function isLocalDevelopmentOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function AuthScreen({ configured, role = "contributor", onPreview }: AuthScreenProps) {
  const isAdmin = role === "admin";
  const emailInputId = useId();
  const showInstallHint = isAppleMobileBrowser() && !isStandaloneApp();
  const showLocalRedirectHint = configured && isLocalDevelopmentOrigin();
  const showStandaloneNote = configured && isStandalonePwa();
  const [email, setEmail] = useState(pendingAuthEmail);
  const [sent, setSent] = useState(false);
  const [callbackIssue, setCallbackIssue] = useState<string | null>(() => authCallbackError());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);

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
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("redirect") || message.includes("url")) {
        setError("This deployment’s sign-in return address is not configured yet. Ask its administrator to add the app URL in Supabase.");
      } else if (message.includes("rate") || message.includes("too many")) {
        setError("Too many requests. Wait a moment, then request one fresh link.");
      } else if (message.includes("network") || message.includes("fetch") || message.includes("failed to")) {
        setError("We couldn’t reach the sign-in service. Check your connection and try again.");
      } else {
        setError("That sign-in link could not be sent. Check the address and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const address = email.trim();
    const token = code.trim();
    if (!address || token.length !== 6) return;
    setCodeBusy(true);
    setCodeError(null);
    try {
      await verifySignInCode(address, token);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      if (message.includes("expired") || message.includes("invalid") || message.includes("token")) {
        setCodeError("That code is invalid or expired. Check the newest email for the current code.");
      } else {
        setCodeError("That code could not be verified. Check the email and try again.");
      }
      setCodeError((current) => `${current ?? ""}${current ? " " : ""}If the email has no 6-digit code, its template needs the sign-in code added — the link in that email still works.`.trim());
    } finally {
      setCodeBusy(false);
    }
  };

  return (
    <main className={`auth-page auth-page-${role}`} data-role={role}>
      <div className="auth-brand">
        <div className="auth-mark">collect<span className="auth-mark-dot">.</span>{isAdmin && <span className="auth-mark-suffix">Admin</span>}</div>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
      {!sent ? (
          <>
            <Eyebrow>{configured ? callbackIssue ? "Sign in again" : isAdmin ? "Admin workspace" : "Sign in" : "Authentication required"}</Eyebrow>
            <h1 id="auth-title">{callbackIssue ? "Request a new link." : isAdmin ? "Sign in to collect Admin." : "Sign in to collect."}</h1>
            <p>{configured ? callbackIssue ? "Enter the invited email address and we’ll send a fresh one-time link." : isAdmin ? "Use the administrator email you were invited with. We’ll send a one-time link." : "Use the email address your administrator invited. We’ll send a one-time link." : "This deployment is not connected to an authentication service yet."}</p>
            {showStandaloneNote && <p className="auth-config-note"><Icon name="info" size={16} /><span>This installed app keeps its own sign-in. If you signed in on the web, sign in again here — synced data returns from the server.</span></p>}
            {configured && <ol className="auth-steps" aria-label="Sign-in steps"><li><span>1</span><span>Enter your invited email.</span></li><li><span>2</span><span>Tap Continue.</span></li><li><span>3</span><span>Open the newest email on this device.</span></li></ol>}
            <div className="auth-label">
              <label htmlFor={emailInputId}>Email address</label>
              <div className="input-with-clear">
                <input id={emailInputId} className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} disabled={!configured} />
                {email && configured && <ClearButton label="Clear email address" onClick={() => setEmail("")} />}
              </div>
            </div>
            {(callbackIssue || error) && <p className="auth-error" role="alert">{callbackIssue ?? error}</p>}
            {showLocalRedirectHint && <p className="auth-config-note"><Icon name="info" size={16} /><span>Local preview: sign-in links return to the deployed app. Open the deployed address on your phone.</span></p>}
            {configured ? (
              <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                <Button type="submit" variant="primary" fullWidth iconAfter="arrow-right" disabled={busy || !email.trim()} busy={busy}>{busy ? "Sending…" : "Continue"}</Button>
              </form>
            ) : (
              <div className="auth-config-note"><Icon name="info" size={16} /><span>Sign-in will be available when the project’s Supabase connection is configured.</span></div>
            )}
          </>
        ) : (
          <div className="auth-sent"><Eyebrow>{isAdmin ? "Admin workspace" : "Check your inbox"}</Eyebrow><h1>Link sent.</h1><p>Open the newest link sent to <strong>{email}</strong> on this device. Each link works once and then expires.</p><p className="auth-sent-hint">If you do not see it, check spam. Do not use an older message.</p>{error && <p className="auth-error" role="alert">{error}</p>}
            {codeMode ? (
              <div className="auth-code">
                <label className="auth-label" htmlFor="auth-code-input">6-digit code from the email<input id="auth-code-input" className="field-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(null); }} placeholder="000000" disabled={codeBusy} /></label>
                {codeError && <p className="auth-error" role="alert">{codeError}</p>}
                <Button variant="primary" fullWidth onClick={() => void verifyCode()} disabled={codeBusy || code.length !== 6} busy={codeBusy}>{codeBusy ? "Verifying…" : "Verify code"}</Button>
                <button className="text-button" onClick={() => { setCodeMode(false); setCode(""); setCodeError(null); }}>Back to the sign-in link <Icon name="arrow-right" size={15} /></button>
              </div>
            ) : (
              <>
                <button className="text-button" onClick={() => void submit()} disabled={busy}>{busy ? "Sending…" : "Send a new link"} <Icon name="refresh" size={15} /></button>
                <button className="text-button" onClick={() => { setSent(false); setError(null); setCallbackIssue(null); }}>Use another email <Icon name="arrow-right" size={15} /></button>
                {configured && <button className="text-button" onClick={() => { setCodeMode(true); setCodeError(null); }}>Enter the code from the email instead <Icon name="arrow-right" size={15} /></button>}
              </>
            )}
          </div>
        )}
        {!configured && onPreview && <button className="auth-preview-button" onClick={onPreview}>Open interface preview <Icon name="arrow-right" size={15} /></button>}
        {showInstallHint && <details className="auth-install-help"><summary><Icon name="plus" size={16} /> Add collect to Home Screen</summary><div className="auth-install-content"><p>For reliable offline fieldwork, install collect from Safari.</p><ol><li>Tap <strong>Share</strong>.</li><li>Tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li></ol><p>Open collect from the new icon when you are ready to work offline.</p></div></details>}
      </section>
      <p className="auth-footnote"><Icon name="lock" size={14} /> Previously downloaded fieldwork remains available offline.</p>
    </main>
  );
}
