// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { Icon } from "../icons/Icon";

export interface ClearButtonProps {
  label?: string;
  onClick: () => void;
  className?: string;
}

/**
 * Trailing clear affordance for input fields with a guaranteed 44pt touch area.
 */
export function ClearButton({
  label = "Clear input",
  onClick,
  className = "",
}: ClearButtonProps) {
  return (
    <button
      type="button"
      className={`clear-button ${className}`.trim()}
      aria-label={label}
      onClick={onClick}
    >
      <Icon name="x" size={15} />
    </button>
  );
}
