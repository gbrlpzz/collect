// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  label: string;
  className?: string;
  describedBy?: string;
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Accessible Apple HIG segmented control for mutually exclusive options.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  label,
  className = "",
  describedBy,
  required = false,
  invalid = false,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`segmented-control ${className}`.trim()}
      role="group"
      aria-label={label}
      aria-describedby={describedBy || undefined}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            disabled={disabled}
            className={isSelected ? "segmented-control-selected" : ""}
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
