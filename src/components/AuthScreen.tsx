import { useState } from "react";
import { sendMagicLink } from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, Eyebrow } from "./Primitives";

interface AuthScreenProps {
  configured: boolean;
  onPreview?: () => void;
}

export function AuthScreen({ configured, onPreview }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await sendMagicLink(email.trim());
      setSent(true);
    } catch {
      setError("That sign-in link could not be sent. Check the address and try again.");
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
            <Eyebrow>{configured ? "Sign in" : "Authentication required"}</Eyebrow>
            <h1 id="auth-title">Sign in to collect.</h1>
            <p>{configured ? "Use the email address your administrator invited. We’ll send a one-time link." : "This deployment is not connected to an authentication service yet."}</p>
            <label className="auth-label">Email address<input className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" disabled={!configured} /></label>
            {error && <p className="auth-error">{error}</p>}
            {configured ? (
              <Button variant="primary" fullWidth iconAfter="arrow-right" onClick={submit} disabled={busy || !email.trim()}>{busy ? "Sending…" : "Continue"}</Button>
            ) : (
              <div className="auth-config-note"><Icon name="info" size={16} /><span>Sign-in will be available when the project’s Supabase connection is configured.</span></div>
            )}
          </>
        ) : (
          <div className="auth-sent"><Eyebrow>Check your inbox</Eyebrow><h1>Link sent.</h1><p>Open the link sent to <strong>{email}</strong> on this device. You can close this page while you wait.</p><button className="text-button" onClick={() => setSent(false)}>Use another email <Icon name="arrow-right" size={15} /></button></div>
        )}
        {!configured && onPreview && <button className="auth-preview-button" onClick={onPreview}>Open interface preview <Icon name="arrow-right" size={15} /></button>}
      </section>
      <p className="auth-footnote"><Icon name="lock" size={14} /> Previously downloaded fieldwork remains available offline.</p>
    </main>
  );
}
