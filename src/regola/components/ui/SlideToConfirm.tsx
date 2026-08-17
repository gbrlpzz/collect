// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Icon } from "../icons/Icon";

export interface SlideToConfirmProps {
  label?: string;
  confirmedLabel?: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  className?: string;
}

/**
 * Slide to confirm high-stakes or irreversible actions.
 *
 * Apple HIG Note: Reserves deliberate horizontal drag gestures for irreversible
 * actions (e.g. checkout commitments, destructive operations) where an accidental
 * tap is risky. Follows HIG: 52pt action height, 46pt circular thumb, dynamic
 * green accent feedback when sliding, and full keyboard/assistive accessibility.
 */
export function SlideToConfirm({
  label = "Slide to confirm",
  confirmedLabel = "Confirmed",
  disabled = false,
  onConfirm,
  className = "",
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const THUMB = 46;
  const THRESHOLD = 0.92;

  const positionFrom = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = Math.max(1, rect.width - THUMB - 8);
    return Math.min(1, Math.max(0, (clientX - rect.left - THUMB / 2 - 4) / usable));
  };

  const finish = async (value: number) => {
    if (value >= THRESHOLD && !disabled) {
      setProgress(1);
      setConfirmed(true);
      await onConfirm();
    } else {
      setProgress(0);
    }
  };

  const startDrag = (startEvent: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || confirmed) return;
    startEvent.currentTarget.setPointerCapture(startEvent.pointerId);
    const move = (e: PointerEvent) => setProgress(positionFrom(e.clientX));
    const up = async (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      await finish(positionFrom(e.clientX));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const isSliding = progress > 0;
  const greenOpacity = Math.min(0.85, 0.12 + progress * 0.73);
  const trackFillColor = confirmed
    ? "#34c759"
    : isSliding
      ? `rgba(52, 199, 89, ${greenOpacity})`
      : "transparent";

  const handleBgColor = confirmed
    ? "#34c759"
    : progress > 0.6
      ? "#248a3d"
      : "var(--text)";

  return (
    <div
      ref={trackRef}
      className={`slider-container ${disabled ? "slider-disabled" : ""} ${className}`.trim()}
      style={{
        borderColor: isSliding || confirmed ? "rgba(52, 199, 89, 0.45)" : undefined,
        transition: "border-color 0.2s ease",
      }}
      role="group"
      aria-label={label}
    >
      <div
        aria-hidden="true"
        className="slider-progress-fill"
        style={{
          width: `${progress * 100}%`,
          backgroundColor: trackFillColor,
          transition: progress === 0 ? "width 180ms ease, background-color 180ms ease" : "none",
        }}
      />
      <span
        className="slider-label"
        style={{
          color: confirmed ? "#248a3d" : isSliding ? "var(--text)" : "var(--secondary)",
          fontWeight: confirmed ? 700 : 600,
        }}
      >
        {confirmed ? confirmedLabel : label}
      </span>
      <button
        type="button"
        aria-label={label}
        onPointerDown={startDrag}
        onClick={() => {
          if (!disabled && !confirmed) finish(1);
        }}
        disabled={disabled || confirmed}
        className="slider-handle"
        style={{
          left: `calc(3px + ${progress} * (100% - ${THUMB + 6}px))`,
          backgroundColor: handleBgColor,
          color: "#ffffff",
          boxShadow: confirmed
            ? "0 0 12px rgba(52, 199, 89, 0.5)"
            : isSliding
              ? "0 2px 8px rgba(52, 199, 89, 0.35)"
              : "0 2px 6px rgba(0, 0, 0, 0.16)",
          transition: progress === 0 ? "left 180ms ease, background-color 180ms ease" : "none",
        }}
      >
        <Icon name={confirmed ? "check" : "arrow-right"} size={18} />
      </button>
    </div>
  );
}
