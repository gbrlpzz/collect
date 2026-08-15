import { useEffect, useRef, useState } from "react";
import {
  linkDeviceSession,
  requestContributorSigninCode,
} from "../../lib/supabaseClient";
import { Icon } from "../Icon";
import { Button } from "../ui";
import { signInErrorMessage } from "./authMessages";

/**
 * Backup path: an eight-character code. Administrators issue one for a
 * contributor who cannot receive email, and a signed-in browser mints one to
 * move its session into the installed app — on iOS the two are separate
 * storage containers, so this is the bridge between them.
 */
export function CodeSignIn({ autoFocus = false }: { autoFocus?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = async (token?: string) => {
    const nextToken = (token ?? code).trim().toUpperCase();
    if (nextToken.length !== 8) return;
    setBusy(true);
    setError(null);
    try {
      await linkDeviceSession(nextToken);
      // Session updates flow through the auth listener; this screen unmounts.
    } catch (caught) {
      setError(signInErrorMessage(caught, "code"));
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
      setRequestError(signInErrorMessage(caught, "code-request"));
    } finally {
      setRequestBusy(false);
    }
  };

  return (
    <div className="auth-code">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="auth-label" htmlFor="auth-device-code">
          8-character code
          <input
            ref={inputRef}
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
              setError(null);
              if (nextCode.length === 8 && !busy) void submit(nextCode);
            }}
            placeholder="AB2D9KQX"
            disabled={busy}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {(code.length === 8 || busy) && (
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={busy}
            busy={busy}
          >
            {busy ? "Signing in…" : error ? "Try again" : "Sign in with a code"}
          </Button>
        )}
      </form>
      <button
        type="button"
        className="text-button"
        aria-expanded={requestOpen}
        aria-controls="auth-code-request-panel"
        onClick={() => {
          setRequestOpen((current) => !current);
          setRequestSent(false);
          setRequestError(null);
          // Move focus into the revealed form so keyboard and screen-reader
          // users are not left tabbing blindly past the toggle.
          if (!requestOpen) {
            window.setTimeout(() => {
              document.getElementById("auth-request-email")?.focus();
            }, 0);
          }
        }}
      >
        {requestOpen ? "Hide" : "Request a new code by email"}{" "}
        <Icon name="arrow-right" size={15} />
      </button>
      {requestOpen && (
        <div className="auth-code-request" id="auth-code-request-panel">
          {requestSent ? (
            <p className="auth-sent-note" role="status">
              If an account exists, a code is on its way to that address.
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void requestCode();
              }}
            >
              <div className="auth-label">
                <label htmlFor="auth-request-email">Email address</label>
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
                {requestBusy ? "Sending…" : "Send me a sign-in code"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
