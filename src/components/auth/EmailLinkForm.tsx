import { useId, useState } from "react";
import {
  pendingAuthEmail,
  rememberAuthEmail,
  sendMagicLink,
} from "../../lib/supabaseClient";
import { Icon } from "../Icon";
import { Button, ClearButton } from "../ui";
import { signInErrorMessage } from "./authMessages";

/**
 * Backup path: a one-time sign-in link by email. It never creates an account,
 * so a stranger cannot spend the deployment's mail quota; people who already
 * have an account can always get in without a provider.
 */
export function EmailLinkForm({
  surface = "contributor",
  showLocalRedirectHint,
}: {
  surface?: "admin" | "contributor";
  showLocalRedirectHint: boolean;
}) {
  const emailInputId = useId();
  const [email, setEmail] = useState(pendingAuthEmail);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    rememberAuthEmail(address);
    try {
      await sendMagicLink(address, surface);
      setSent(true);
    } catch (caught) {
      setError(signInErrorMessage(caught, "link"));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-sent">
        <h2>Check your inbox.</h2>
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
          type="button"
          className="text-button"
          onClick={() => void submit()}
          disabled={busy}
        >
          {busy ? "Sending…" : "Send a new link"}{" "}
          <Icon name="refresh" size={15} />
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
        >
          Use another email <Icon name="arrow-right" size={15} />
        </button>
      </div>
    );
  }

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
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {showLocalRedirectHint && (
        <p className="auth-config-note">
          <Icon name="info" size={16} />
          <span>
            Local preview: sign-in links return to the deployed app. Open the
            deployed address on your phone.
          </span>
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        fullWidth
        iconAfter="send"
        disabled={busy || !email.trim()}
        busy={busy}
      >
        {busy ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
