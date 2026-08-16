import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../Icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "quiet" | "destructive";
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
  fullWidth?: boolean;
  busy?: boolean;
}

/**
 * The shared action primitive. Native buttons have an explicit type so an
 * action never submits an unrelated form by accident.
 */
export function Button({
  variant = "secondary",
  icon,
  iconAfter,
  children,
  fullWidth = false,
  className = "",
  type = "button",
  busy = false,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      className={`button button-${variant}${fullWidth ? " button-full" : ""}${busy ? " button-busy" : ""} ${className}`.trim()}
      {...props}
    >
      {busy ? (
        <span className="button-spinner" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={17} />
      ) : null}
      <span>{children}</span>
      {!busy && iconAfter && <Icon name={iconAfter} size={17} />}
    </button>
  );
}

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "aria-label"
> {
  label: string;
  icon: IconName;
}

export function IconButton({
  label,
  icon,
  className = "",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      {...props}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}

/** A native-style clear affordance for editable text. */
export function ClearButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="clear-button"
      aria-label={label}
      onClick={onClick}
    >
      <Icon name="x" size={16} />
    </button>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
}

/** A compact, accessible choice among a small set of mutually exclusive values. */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
  describedBy,
  required = false,
  invalid = false,
  autoFocus = false,
}: {
  options: SegmentOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  describedBy?: string;
  required?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div
      className={`segmented-control ${className ?? ""}`.trim()}
      role="group"
      aria-label={label}
      aria-describedby={describedBy || undefined}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
    >
      {options.map((option, index) => {
        const selected = value === option.value;
        return (
          <button
            type="button"
            key={option.value}
            className={selected ? "segmented-control-selected" : ""}
            aria-pressed={selected}
            autoFocus={autoFocus && index === 0}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
