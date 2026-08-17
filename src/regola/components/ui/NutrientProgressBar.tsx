// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

export interface NutrientProgressBarProps {
  label: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  color?: string;
  className?: string;
}

export function NutrientProgressBar({
  label,
  currentValue,
  targetValue,
  unit,
  color = "var(--text)",
  className = "",
}: NutrientProgressBarProps) {
  const percent = targetValue > 0 ? Math.min(150, Math.round((currentValue / targetValue) * 100)) : 0;
  const isOver = currentValue > targetValue && targetValue > 0;

  return (
    <div className={`nutrient-progress-bar ${className}`.trim()}>
      <div className="nutrient-progress-labels">
        <span className="nutrient-label">{label}</span>
        <span className="nutrient-value">
          <strong>{Math.round(currentValue)}</strong> / {targetValue} {unit}
          <span className={`nutrient-percent${isOver ? " nutrient-percent-over" : ""}`}>
            {" "}({percent}%)
          </span>
        </span>
      </div>

      <div
        className="nutrient-track"
        role="progressbar"
        aria-valuenow={currentValue}
        aria-valuemin={0}
        aria-valuemax={targetValue}
        aria-label={`${label} progress`}
      >
        <div
          className="nutrient-fill"
          style={{
            width: `${Math.min(100, percent)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
