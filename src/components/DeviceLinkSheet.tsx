import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { requestDeviceLinkCode } from "../lib/supabaseClient";
import { Icon } from "./Icon";
import { Button, IconButton } from "./ui";

interface DeviceLinkSheetProps {
  onClose: () => void;
}

/**
 * Web side of the device-link bridge: shows a one-time code that another
 * container (the installed PWA) can enter to receive this session without
 * email. The code is single-use and time-boxed.
 */
export function DeviceLinkSheet({ onClose }: DeviceLinkSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const requestCode = async () => {
    setBusy(true);
    setError(null);
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
        setError("We couldn’t reach the sign-in service. Check your connection and try again.");
      } else {
        setError("A code could not be created right now. Try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void requestCode();
  }, []);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => {
      if (previousFocusRef.current?.isConnected)
        previousFocusRef.current.focus();
    };
  }, []);

  // Refresh the remaining time once a second while the code is on screen.
  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [code]);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const keepFocusInside = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      sheetRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
      ) ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const remaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining <= 0;

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={sheetRef}
        className="bottom-sheet device-link-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-link-title"
        onKeyDown={keepFocusInside}
      >
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <span className="sheet-kicker">Another device</span>
            <h2 id="device-link-title">Sign in on another device</h2>
          </div>
          <IconButton label="Close" icon="x" autoFocus onClick={onClose} />
        </div>
        <p className="sheet-copy">
          On the device you want to sign in on, open collect and choose
          “Enter the code shown there”. This code is single-use and expires
          quickly.
        </p>
        {error ? (
          <p className="field-help-error" role="alert">
            {error}
          </p>
        ) : busy && !code ? (
          <p className="sheet-copy">Creating a code…</p>
        ) : code ? (
          <>
            <div className="device-code" aria-label={`Code ${code}`} aria-live="polite">
              {code.split("").map((digit, index) => (
                <span key={index}>{digit}</span>
              ))}
            </div>
            <p className="device-code-expiry" aria-live="polite">
              {expired
                ? "This code has expired. Request a new one."
                : `Expires in ${minutes}:${String(seconds).padStart(2, "0")}`}
            </p>
            <Button
              variant="secondary"
              icon="refresh"
              fullWidth
              onClick={() => void requestCode()}
              disabled={busy}
              busy={busy}
            >
              {busy ? "Creating…" : "New code"}
            </Button>
          </>
        ) : null}
        <p className="sheet-footnote">
          The code is shown only on this device and cannot be sent anywhere.
        </p>
      </section>
    </div>
  );
}
