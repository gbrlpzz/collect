// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { SegmentedControl } from "./SegmentedControl";

export type TriStateValue = "yes" | "no" | "unsure" | null | undefined;

export interface TriStateControlProps {
  value: TriStateValue;
  onChange: (val: "yes" | "no" | "unsure") => void;
  label: string;
  yesLabel?: string;
  noLabel?: string;
  unsureLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function TriStateControl({
  value,
  onChange,
  label,
  yesLabel = "Yes",
  noLabel = "No",
  unsureLabel = "Unsure",
  className = "",
  disabled = false,
}: TriStateControlProps) {
  const options = [
    { value: "yes" as const, label: yesLabel },
    { value: "no" as const, label: noLabel },
    { value: "unsure" as const, label: unsureLabel },
  ];

  return (
    <SegmentedControl
      label={label}
      options={options}
      value={value ?? undefined}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
}
