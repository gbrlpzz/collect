// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { InputHTMLAttributes } from "react";
import { ClearButton } from "./ClearButton";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string | null;
  onClear?: () => void;
  requiredMark?: boolean;
}

export function TextInput({
  id,
  label,
  description,
  error,
  value,
  onClear,
  requiredMark,
  required,
  className = "",
  ...props
}: TextInputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const showClear = Boolean(onClear && value && String(value).length > 0);

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
      <div className={showClear ? "input-with-clear" : undefined}>
        <input
          id={inputId}
          className={`field-input ${className}`.trim()}
          value={value}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {showClear && onClear && <ClearButton onClick={onClear} />}
      </div>
      {error && (
        <p id={inputId ? `${inputId}-error` : undefined} className="field-error-message">
          {error}
        </p>
      )}
    </div>
  );
}
