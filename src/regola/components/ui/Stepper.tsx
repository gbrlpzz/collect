// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ChangeEvent } from "react";
import { Icon } from "../icons/Icon";

export interface StepperProps {
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  value = 0,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  label,
  unit,
  disabled = false,
  className = "",
}: StepperProps) {
  const handleDecrement = () => {
    const next = Math.max(min, (value ?? 0) - step);
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, (value ?? 0) + step);
    onChange(next);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  const isMin = value !== undefined && value <= min;
  const isMax = value !== undefined && value >= max;

  return (
    <div className={`number-stepper ${className}`.trim()}>
      <button
        type="button"
        className="stepper-button"
        onClick={handleDecrement}
        disabled={disabled || isMin}
        aria-label={`Decrease ${label}`}
      >
        <Icon name="minus" size={16} strokeWidth={2.2} />
      </button>
      <input
        type="number"
        className="field-input"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onChange={handleInputChange}
      />
      {unit && <span className="stepper-unit">{unit}</span>}
      <button
        type="button"
        className="stepper-button"
        onClick={handleIncrement}
        disabled={disabled || isMax}
        aria-label={`Increase ${label}`}
      >
        <Icon name="plus" size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
