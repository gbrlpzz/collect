// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { Icon, type IconName } from "../icons/Icon";
import { Button } from "../ui/Button";

export interface CaptureCardProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  completed?: boolean;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CaptureCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  completed = false,
  busy = false,
  disabled = false,
  className = "",
}: CaptureCardProps) {
  return (
    <div className={`capture-card ${completed ? "capture-complete" : ""} ${className}`.trim()}>
      <div className="capture-icon">
        <Icon name={completed ? "check" : icon} size={20} />
      </div>
      <div className="capture-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <Button
        variant={completed ? "secondary" : "primary"}
        busy={busy}
        disabled={disabled}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
