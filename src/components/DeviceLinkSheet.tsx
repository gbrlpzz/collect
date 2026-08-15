import { useEffect, useState } from "react";
import { requestDeviceLinkCode } from "../lib/supabaseClient";
import { Button, IconButton, ModalSurface } from "./ui";

interface DeviceLinkSheetProps {
  onClose: () => void;
}

/**
 * Web side of the device-link bridge: shows a one-time code that another
 * container (the installed PWA) can enter to receive this session without
 * email. The code is single-use and time-boxed.
 */
export function DeviceLinkSheet({ onClose }: DeviceLinkSheetProps) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const result = await requestDeviceLinkCode();
      setCode(result.code);
      setExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      setNow(Date.now());
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message.toLowerCase() : "";
      if (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("failed to")
      ) {
        setError(
          "We couldn’t reach the sign-in service. Check your connection and try again.",
        );
      } else {
        setError(
          "A code could not be created right now. Try again in a moment.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError(
        "Copy was unavailable. Read the code above and enter it in the app.",
      );
    }
  };

  useEffect(() => {
    void requestCode();
  }, []);

  // Refresh the remaining time once a second while the code is on screen.
  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [code]);

  const remaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining <= 0;

  return (
    <ModalSurface
      onClose={onClose}
      labelledBy="device-link-title"
      className="device-link-sheet"
    >
      <div className="sheet-handle" />
      <div className="sheet-heading">
        <h2 id="device-link-title">Sign in another device</h2>
        <IconButton
          label="Close"
          icon="x"
          data-modal-autofocus
          onClick={onClose}
        />
      </div>
      {error && (
        <p className="field-help-error" role="alert">
          {error}
        </p>
      )}
      {busy && !code ? (
        <p className="sheet-copy">Creating a code…</p>
      ) : code ? (
        <>
          <div
            className="device-code"
            aria-label={`Code ${code}`}
            aria-live="polite"
          >
            {code.split("").map((digit, index) => (
              <span key={index}>{digit}</span>
            ))}
          </div>
          <p className="device-code-expiry" aria-live="polite">
            {expired
              ? "This code has expired. Request a new one."
              : `Expires in ${minutes}:${String(seconds).padStart(2, "0")}`}
          </p>
          <div className="device-link-actions">
            <Button
              variant="primary"
              icon="file"
              fullWidth
              onClick={() => void copyCode()}
              disabled={expired}
            >
              {copied ? "Code copied" : "Copy code"}
            </Button>
            <Button
              variant="quiet"
              icon="refresh"
              fullWidth
              onClick={() => void requestCode()}
              disabled={busy}
              busy={busy}
            >
              {busy ? "Creating…" : "New code"}
            </Button>
          </div>
        </>
      ) : null}
    </ModalSurface>
  );
}
