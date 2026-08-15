import { useId, useState } from "react";
import {
  pendingAuthEmail,
  rememberAuthEmail,
  signInWithPassword,
} from "../../lib/supabaseClient";
import { Button, ClearButton } from "../ui";
import { signInErrorMessage } from "./authMessages";

/**
 * Backup path: email address and password. It behaves identically in Safari,
 * in an installed app, and on desktop, with no email round-trip.
 */
export function PasswordForm() {
  const emailInputId = useId();
  const passwordInputId = useId();
  const [email, setEmail] = useState(pendingAuthEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim();
    if (!address || !password) return;
    setBusy(true);
    setError(null);
    rememberAuthEmail(address);
    try {
      await signInWithPassword(address, password);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      setError(signInErrorMessage(caught, "password"));
    } finally {
      setBusy(false);
    }
  };

  return (
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
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
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
            setPassword(event.target.value);
            setError(null);
          }}
          placeholder="Your password"
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="auth-error" role="alert">
          {error}
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
        {busy ? "Signing in…" : "Sign in with a password"}
      </Button>
    </form>
  );
}
