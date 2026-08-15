import { useState } from "react";
import { setPassword } from "../../lib/supabaseClient";
import { Button } from "../ui";
import { signInErrorMessage } from "./authMessages";

/**
 * One-time password setup after an invitation, link, or code sign-in. People
 * who arrived through a provider never see this screen: Apple’s guidance is
 * explicit that they should not be asked to invent a password.
 */
export function PasswordSetup({ onDone }: { onDone?: () => void }) {
  const [password, setPasswordValue] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 10) {
      setError("Choose a password with at least 10 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setPassword(password);
      onDone?.();
    } catch (caught) {
      setError(signInErrorMessage(caught, "password-setup"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth-card" aria-labelledby="auth-password-title">
      <h1 id="auth-password-title">Create a password.</h1>
      <p>Use it to sign in on other devices.</p>
      <form
        className="auth-set-password"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="auth-label">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            className="field-input"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPasswordValue(event.target.value);
              setError(null);
            }}
            placeholder="At least 10 characters"
            autoFocus
            disabled={busy}
          />
        </div>
        <div className="auth-label">
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            className="field-input"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError(null);
            }}
            placeholder="Repeat the password"
            disabled={busy}
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
          disabled={busy || password.length < 10 || confirmation.length < 10}
          busy={busy}
        >
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
    </section>
  );
}
