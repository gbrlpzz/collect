import { useEffect, useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";

/**
 * Access request & inquiry form — the page's primary call to action.
 * Email and inquiry details are required so we can properly route and respond.
 * Inserts one row into the private preview_requests queue (RLS: anonymous insert only).
 */
const FORM_ENDPOINT =
  "https://lrqlrufwrytpwhgclmyo.supabase.co/rest/v1/preview_requests";
const FORM_KEY = "sb_publishable_BAsTV49V04O0WZVtVgohqg_BD5JReFE";

export function PreviewForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [inquiry, setInquiry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (initialEmail && !sent) setEmail(initialEmail);
  }, [initialEmail, sent]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedInquiry = inquiry.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Enter a valid work email address.");
      return;
    }
    if (trimmedInquiry.length < 5) {
      setError(
        "Please tell us a little about your project, fieldwork, or question.",
      );
      return;
    }

    setSending(true);
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          apikey: FORM_KEY,
          Authorization: `Bearer ${FORM_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          name: null,
          email: trimmedEmail,
          organization: null,
          use_case: trimmedInquiry,
          source: "homepage",
        }),
      });
      if (!response.ok) {
        let code = "";
        try {
          const data = (await response.json()) as { code?: string };
          code = data?.code ?? "";
        } catch {
          // non-JSON error body
        }
        throw new Error(`HTTP ${response.status}${code ? `:${code}` : ""}`);
      }
      setSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isDuplicate = message.includes("42501") || message.includes("409");
      setError(
        isDuplicate
          ? "This address is already on the preview list — we'll be in touch."
          : "Couldn't reach the server right now. Please try again in a moment.",
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="hp-form-success" role="status">
        <span className="hp-success-mark" aria-hidden="true">
          <Icon name="check" size={20} />
        </span>
        <h3>Request received.</h3>
        <p>
          We review every request. You'll hear from us at{" "}
          <strong>{email.trim()}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form
      className="hp-form"
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      <label className="field">
        <span>Work email</span>
        <input
          className="field-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          placeholder="you@example.com"
        />
      </label>
      <label className="field">
        <span>Tell us about your project, fieldwork, or question</span>
        <textarea
          className="field-input field-textarea"
          value={inquiry}
          onChange={(event) => setInquiry(event.target.value)}
          required
          rows={4}
          maxLength={4000}
          placeholder="e.g. Field survey across 3 research teams, custom schema requirements, self-hosting setup, or general question."
        />
      </label>
      {error && (
        <p className="hp-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="hp-form-actions">
        <Button
          variant="primary"
          type="submit"
          disabled={sending}
          busy={sending}
        >
          {sending ? "Sending…" : "Request access"}
        </Button>
        <p className="hp-form-note">We review and respond to every request.</p>
      </div>
    </form>
  );
}
