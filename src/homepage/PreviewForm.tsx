import { useState } from "react";
import { Button } from "../components/ui";
import { Icon } from "../components/Icon";

/**
 * Research-preview access request. Inserts one row into the private
 * preview_requests queue (RLS: anonymous insert only — nothing is ever
 * readable from the browser). Access remains invite-only.
 */
const FORM_ENDPOINT =
  "https://lrqlrufwrytpwhgclmyo.supabase.co/rest/v1/preview_requests";
const FORM_KEY = "sb_publishable_BAsTV49V04O0WZVtVgohqg_BD5JReFE";

export function PreviewForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [useCase, setUseCase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedUseCase = useCase.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      setError("Enter a valid email address so we can reply.");
      return;
    }
    if (trimmedUseCase.length < 10) {
      setError(
        "Tell us a little about what you'd collect (at least a sentence).",
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
          name: name.trim() || null,
          email: trimmedEmail,
          organization: organization.trim() || null,
          use_case: trimmedUseCase,
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
          The research preview is invite-only and we read every request. You'll
          hear from us at <strong>{email.trim()}</strong>.
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
      <div className="hp-form-grid">
        <label className="field">
          <span>
            Name <em className="optional">optional</em>
          </span>
          <input
            className="field-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            autoComplete="name"
            maxLength={120}
          />
        </label>
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
          />
        </label>
      </div>
      <label className="field">
        <span>
          Organization <em className="optional">optional</em>
        </span>
        <input
          className="field-input"
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          type="text"
          autoComplete="organization"
          maxLength={160}
        />
      </label>
      <label className="field">
        <span>What would you collect with it?</span>
        <textarea
          className="field-input field-textarea"
          value={useCase}
          onChange={(event) => setUseCase(event.target.value)}
          rows={5}
          required
          minLength={10}
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
        <p className="hp-form-note">
          No account is created. Requests go to a private queue; access stays
          invite-only.
        </p>
      </div>
    </form>
  );
}
