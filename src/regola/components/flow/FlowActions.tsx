// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { Button } from "../ui/Button";

export interface FlowActionsProps {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  backLabel?: string;
  canContinue?: boolean;
  busy?: boolean;
  className?: string;
}

export function FlowActions({
  onBack,
  onContinue,
  continueLabel = "Continue",
  backLabel = "Back",
  canContinue = true,
  busy = false,
  className = "",
}: FlowActionsProps) {
  return (
    <div className={`flow-actions ${className}`.trim()}>
      {onBack && (
        <Button
          variant="secondary"
          className="flow-back"
          onClick={onBack}
          disabled={busy}
        >
          {backLabel}
        </Button>
      )}
      <Button
        variant="primary"
        className="flow-continue"
        onClick={onContinue}
        disabled={!canContinue || busy}
        busy={busy}
      >
        {continueLabel}
      </Button>
    </div>
  );
}
