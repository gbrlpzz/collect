import { useEffect, useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";

/**
 * Research-preview access request — the page's call to action. Email is the
 * only required field; the use case is optional but welcomed. Inserts one
 * row into the private preview_requests queue (RLS: anonymous insert only —
 * nothing is ever readable from the browser).
 */
const FORM_ENDPOINT =
  "https://lrqlrufwrytpwhgclmyo.supabase.co/rest/v1/preview_requests";
const FORM_KEY = "sb_publishable_BAsTV49V04O0WZVtVgohqg_BD5JReFE";

export function PreviewForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [useCase, setUseCase] = useState("");
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
    const trimmedUseCase = useCase.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Enter a valid email address so we can reply.");
      return;
    }
    if (trimmedUseCase.length > 0 && trimmedUseCase.length < 10) {
      setError("If you add a use case, give it a sentence or two.");
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
          use_case: trimmedUseCase || null,
          source: "homepage",
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSent(true);
    } catch {
      setError(
        "Couldn't reach the server right now. Please try again in a moment.",
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
          We read every request. You'll hear from us at{" "}
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
          placeholder="you@your-institution.org"
        />
      </label>
      <label className="field">
        <span>
          What would you collect with it? <em className="optional">optional</em>
        </span>
        <textarea
          className="field-input field-textarea"
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="e.g. We run a building survey in a valley with patchy coverage — three teams, photos + GPS, published as a dataset."
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
        <p className="hp-form-note">We reply to every request.</p>
      </div>
    </form>
  );
}
