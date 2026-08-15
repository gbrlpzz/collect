// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";
import { FlowProgressBar } from "./FlowProgressBar";
import { FlowActions } from "./FlowActions";
import { useVisualViewport } from "../../hooks/useVisualViewport";

export interface GuidedFlowProps {
  topBar?: ReactNode;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  backLabel?: string;
  canContinue?: boolean;
  busy?: boolean;
  className?: string;
}

/**
 * 1-Question-Per-Screen guided flow container following the Apple setup geometry model.
 * Responsive visualViewport integration keeps the action capsule docked directly above
 * the software keyboard.
 */
export function GuidedFlow({
  topBar,
  currentStep,
  totalSteps,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  backLabel = "Back",
  canContinue = true,
  busy = false,
  className = "",
}: GuidedFlowProps) {
  useVisualViewport();

  return (
    <div className={`flow-container ${className}`.trim()}>
      {topBar && <div className="flow-topbar">{topBar}</div>}
      <FlowProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      <div className="flow-body">{children}</div>
      <FlowActions
        onBack={onBack}
        onContinue={onContinue}
        continueLabel={continueLabel}
        backLabel={backLabel}
        canContinue={canContinue}
        busy={busy}
      />
    </div>
  );
}
