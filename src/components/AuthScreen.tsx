import { useId, useState } from "react";
import { authCallbackError, pendingAuthEmail, rememberAuthEmail, sendMagicLink } from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./Primitives";

interface AuthScreenProps {
  configured: boolean;
  onPreview?: () => void;
}

export function AuthScreen({ configured, onPreview }: AuthScreenProps) {
  const emailInputId = useId();
  const [email, setEmail] = useState(pendingAuthEmail);
  const [sent, setSent] = useState(false);
  const [callbackIssue, setCallbackIssue] = useState<string | null>(() => authCallbackError());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <main className="auth-page">
      <div className="auth-mark">collect<span>.</span></div>
      <section className="auth-card" aria-labelledby="auth-title">
      {!sent ? (
          <>
            <Eyebrow>{configured ? callbackIssue ? "Sign in again" : "Sign in" : "Authentication required"}</Eyebrow>
            <h1 id="auth-title">{callbackIssue ? "Request a new link." : "Sign in to collect."}</h1>
            <p>{configured ? callbackIssue ? "Enter the invited email address and we’ll send a fresh one-time link." : "Use the email address your administrator invited. We’ll send a one-time link." : "This deployment is not connected to an authentication service yet."}</p>
            {configured && <ol className="auth-steps" aria-label="Sign-in steps"><li><span>1</span><span>Enter your invited email.</span></li><li><span>2</span><span>Tap Continue.</span></li><li><span>3</span><span>Open the newest email on this device.</span></li></ol>}
            <label className="auth-label" htmlFor={emailInputId}>Email address<input id={emailInputId} className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} disabled={!configured} /></label>
            {(callbackIssue || error) && <p className="auth-error" role="alert">{callbackIssue ?? error}</p>}
            {configured ? (
              <Button variant="primary" fullWidth iconAfter="arrow-right" onClick={submit} disabled={busy || !email.trim()}>{busy ? "Sending…" : "Continue"}</Button>
            ) : (
              <div className="auth-config-note"><Icon name="info" size={16} /><span>Sign-in will be available when the project’s Supabase connection is configured.</span></div>
            )}
          </>
        ) : (
          <div className="auth-sent"><Eyebrow>Check your inbox</Eyebrow><h1>Link sent.</h1><p>Open the newest link sent to <strong>{email}</strong> on this device. Each link works once and then expires.</p><p className="auth-sent-hint">If you do not see it, check spam. Do not use an older message.</p>{error && <p className="auth-error" role="alert">{error}</p>}<button className="text-button" onClick={() => void submit()} disabled={busy}>{busy ? "Sending…" : "Send a new link"} <Icon name="refresh" size={15} /></button><button className="text-button" onClick={() => { setSent(false); setError(null); setCallbackIssue(null); }}>Use another email <Icon name="arrow-right" size={15} /></button></div>
        )}
        {!configured && onPreview && <button className="auth-preview-button" onClick={onPreview}>Open interface preview <Icon name="arrow-right" size={15} /></button>}
      </section>
      <p className="auth-footnote"><Icon name="lock" size={14} /> Previously downloaded fieldwork remains available offline.</p>
    </main>
  );
}
