// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useState, type FormEvent } from "react";
import { ModalSurface } from "./ModalSurface";
import { Button } from "../ui/Button";
import { ClearButton } from "../ui/ClearButton";

export interface EmailPromptProps {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSubmit: (email: string) => void;
  onCancel: () => void;
}

export function EmailPrompt({
  title,
  message,
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  onSubmit,
  onCancel,
}: EmailPromptProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (address) onSubmit(address);
  };

  return (
    <ModalSurface
      kind="dialog"
      onClose={onCancel}
      labelledBy="email-prompt-title"
    >
      <form onSubmit={handleSubmit}>
        <div className="dialog-copy">
          <h2 id="email-prompt-title">{title}</h2>
          {message && <p>{message}</p>}
          <div style={{ marginTop: "16px" }}>
            <label className="field-label" htmlFor="email-prompt-input">
              Email address
            </label>
            <div className="input-with-clear" style={{ marginTop: "6px" }}>
              <input
                id="email-prompt-input"
                className="field-input"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                data-modal-autofocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              {email && (
                <ClearButton
                  label="Clear email"
                  onClick={() => setEmail("")}
                />
              )}
            </div>
          </div>
        </div>
        <div className="dialog-actions">
          <Button type="submit" variant="primary" disabled={!email.trim()}>
            {confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </form>
    </ModalSurface>
  );
}
