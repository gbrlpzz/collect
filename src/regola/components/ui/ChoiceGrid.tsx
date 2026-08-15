// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";
import { Icon } from "../icons/Icon";

export interface ChoiceOption<T extends string = string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  icon?: string;
}

export interface ChoiceButtonProps {
  label: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ChoiceButton({
  label,
  description,
  selected = false,
  onClick,
  disabled = false,
  className = "",
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`choice-button ${selected ? "choice-selected" : ""} ${className}`.trim()}
      aria-pressed={selected}
      onClick={onClick}
    >
      <div className="choice-copy">
        <span className="choice-label">{label}</span>
        {description && <span className="choice-description">{description}</span>}
      </div>
      {selected && (
        <span className="choice-check">
          <Icon name="check" size={18} strokeWidth={2.5} />
        </span>
      )}
    </button>
  );
}

export interface ChoiceGridProps<T extends string = string> {
  options: ChoiceOption<T>[];
  value: T | T[] | undefined;
  onChange: (val: T) => void;
  multiple?: boolean;
  label: string;
  className?: string;
  disabled?: boolean;
}

export function ChoiceGrid<T extends string = string>({
  options,
  value,
  onChange,
  multiple = false,
  label,
  className = "",
  disabled = false,
}: ChoiceGridProps<T>) {
  const isSelected = (optVal: T): boolean => {
    if (Array.isArray(value)) {
      return value.includes(optVal);
    }
    return value === optVal;
  };

  return (
    <div
      className={`choice-grid ${className}`.trim()}
      role={multiple ? "group" : "radiogroup"}
      aria-label={label}
    >
      {options.map((opt) => (
        <ChoiceButton
          key={opt.value}
          label={opt.label}
          description={opt.description}
          selected={isSelected(opt.value)}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
        />
      ))}
    </div>
  );
}
