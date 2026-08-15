// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string | null;
  requiredMark?: boolean;
}

export function Textarea({
  id,
  label,
  description,
  error,
  requiredMark,
  required,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="field-group">
      {label && (
        <div className="field-label-row">
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
          {(requiredMark || required) && (
            <span className="field-required">Required</span>
          )}
        </div>
      )}
      {description && <p className="field-description">{description}</p>}
      <textarea
        id={inputId}
        className={`field-textarea ${className}`.trim()}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={inputId ? `${inputId}-error` : undefined} className="field-error-message">
          {error}
        </p>
      )}
    </div>
  );
}
