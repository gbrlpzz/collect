// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

export interface FlowProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function FlowProgressBar({
  currentStep,
  totalSteps,
  className = "",
}: FlowProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (currentStep / Math.max(1, totalSteps)) * 100));

  return (
    <div
      className={`flow-progress-bar ${className}`.trim()}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={0}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}
