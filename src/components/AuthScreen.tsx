import { useState } from "react";
import { sendMagicLink } from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, Eyebrow, StatusBadge } from "./Primitives";

export function AuthScreen() {
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
      <section className="auth-card">
        <StatusBadge tone="soft">Private field workspace</StatusBadge>
        {!sent ? (
          <>
            <Eyebrow>Sign in</Eyebrow>
            <h1>Fieldwork, ready offline.</h1>
            <p>Use the email address your administrator invited. We’ll send a one-time sign-in link.</p>
            <label className="auth-label">Email address<input className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
            {error && <p className="auth-error">{error}</p>}
            <Button variant="primary" fullWidth icon="arrow-right" onClick={submit} disabled={busy || !email.trim()}>{busy ? "Sending…" : "Send sign-in link"}</Button>
          </>
        ) : (
          <div className="auth-sent"><div className="auth-sent-icon"><Icon name="send" size={22} /></div><Eyebrow>Check your inbox</Eyebrow><h1>Link sent.</h1><p>Open the link sent to <strong>{email}</strong> on this device. You can close this page while you wait.</p><button className="text-button" onClick={() => setSent(false)}>Use another email <Icon name="arrow-right" size={15} /></button></div>
        )}
      </section>
      <p className="auth-footnote"><Icon name="shield" size={14} /> Your local fieldwork remains available if you lose the connection.</p>
    </main>
  );
}
