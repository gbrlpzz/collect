// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useEffect, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "../icons/Icon";

export type AudioPillState = "idle" | "recording" | "processing" | "result" | "empty" | "error";

export interface AudioPillProps {
  /** Current state of the audio pill */
  state: AudioPillState;
  /** Live audio level (0.0 to 1.0) */
  level?: number;
  /** Custom label override */
  label?: string;
  /** Custom icon override */
  icon?: IconName | ReactNode;
  /** Auto-dismiss delay in milliseconds for result/empty/error states (default: 1600ms) */
  dismissDelay?: number;
  /** Callback fired when the pill auto-dismisses */
  onDismiss?: () => void;
  /** Whether the pill is anchored to the top notch/menu bar */
  anchored?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Regola-grade transient audio indicator & Dynamic Island notch HUD.
 * Follows Apple Human Interface Guidelines: obsidian frosted glass,
 * 60 FPS multi-band audio visualizer, undulating processing dots,
 * and fluid state morphing.
 */
export function AudioPill({
  state,
  level = 0,
  label,
  icon,
  dismissDelay = 1600,
  onDismiss,
  anchored = false,
  className = "",
}: AudioPillProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedLevelRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Auto-dismiss for terminal states
  useEffect(() => {
    if (state === "result" || state === "empty" || state === "error") {
      const timer = window.setTimeout(() => {
        onDismiss?.();
      }, dismissDelay);
      return () => window.clearTimeout(timer);
    }
  }, [state, dismissDelay, onDismiss]);

  // 60 FPS live waveform rendering
  useEffect(() => {
    if (state !== "recording") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = 82;
    const height = 20;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const barCount = 19;
    const centerIndex = 9;
    const barW = 2.0;
    const gap = 2.2;
    const totalW = barCount * (barW + gap) - gap;
    const maxH = height - 4;
    const startX = (width - totalW) / 2;

    const render = () => {
      // Audio ballistics: fast attack, smooth exponential decay
      const target = Math.max(0, Math.min(1, level));
      if (target > smoothedLevelRef.current) {
        smoothedLevelRef.current += (target - smoothedLevelRef.current) * 0.40;
      } else {
        smoothedLevelRef.current += (target - smoothedLevelRef.current) * 0.10;
      }

      phaseRef.current += 0.08;
      const phase = phaseRef.current;
      const env = smoothedLevelRef.current;

      ctx.clearRect(0, 0, width, height);

      // Compute raw bar heights
      const heights: number[] = new Array(barCount);
      for (let i = 0; i < barCount; i++) {
        const dist = Math.abs(i - centerIndex) / centerIndex;
        const taper = Math.exp(-dist * dist * 1.8);
        const idleWave = Math.sin(phase * 1.8 + i * 0.45) * 1.2;
        const baseHeight = 3.0 + idleWave * taper;
        const voiceWave = 0.55 + 0.45 * Math.sin(phase * 3.5 + i * 0.85);
        const activeHeight = maxH * taper * env * voiceWave;
        heights[i] = Math.max(2.5, Math.min(maxH, baseHeight + activeHeight));
      }

      // Smooth adjacent heights
      const smoothed = [...heights];
      for (let i = 1; i < barCount - 1; i++) {
        smoothed[i] = (heights[i - 1] + 2 * heights[i] + heights[i + 1]) / 4;
      }

      // Draw rounded capsule bars
      let x = startX;
      for (let i = 0; i < barCount; i++) {
        const dist = Math.abs(i - centerIndex) / centerIndex;
        const alpha = 0.96 - dist * 0.22;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

        const h = smoothed[i];
        const y = (height - h) / 2;
        const r = barW / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, r);
        ctx.fill();

        x += barW + gap;
      }

      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, level]);

  if (state === "idle") return null;

  return (
    <div
      className={`audio-pill audio-pill-${state} ${anchored ? "audio-pill-anchored" : ""} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {/* 1. Recording State */}
      {state === "recording" && (
        <div className="audio-pill-content audio-pill-recording-stack">
          <span className="audio-pill-beacon" aria-hidden="true">
            <span className="audio-pill-beacon-halo" />
            <span className="audio-pill-beacon-dot" />
          </span>
          <canvas
            ref={canvasRef}
            className="audio-pill-waveform"
            style={{ width: "82px", height: "20px" }}
            aria-label="Live audio waveform"
          />
        </div>
      )}

      {/* 2. Processing State */}
      {state === "processing" && (
        <div className="audio-pill-content audio-pill-processing-stack">
          <span className="audio-pill-dots" aria-hidden="true">
            <span className="audio-pill-dot" style={{ animationDelay: "0ms" }} />
            <span className="audio-pill-dot" style={{ animationDelay: "180ms" }} />
            <span className="audio-pill-dot" style={{ animationDelay: "360ms" }} />
          </span>
          <span className="audio-pill-label">{label || "Transcribing…"}</span>
        </div>
      )}

      {/* 3. Result State */}
      {state === "result" && (
        <div className="audio-pill-content audio-pill-status-stack">
          <span className="audio-pill-status-icon audio-pill-icon-success" aria-hidden="true">
            {typeof icon === "string" ? <Icon name={icon as IconName} size={14} /> : icon || <Icon name="check" size={14} />}
          </span>
          <span className="audio-pill-label">{label || "Transcribed"}</span>
        </div>
      )}

      {/* 4. Empty State */}
      {state === "empty" && (
        <div className="audio-pill-content audio-pill-status-stack">
          <span className="audio-pill-status-icon audio-pill-icon-muted" aria-hidden="true">
            {typeof icon === "string" ? <Icon name={icon as IconName} size={14} /> : icon || <Icon name="chevron-down" size={14} />}
          </span>
          <span className="audio-pill-label">{label || "Nothing heard"}</span>
        </div>
      )}

      {/* 5. Error State */}
      {state === "error" && (
        <div className="audio-pill-content audio-pill-status-stack">
          <span className="audio-pill-status-icon audio-pill-icon-error" aria-hidden="true">
            {typeof icon === "string" ? <Icon name={icon as IconName} size={14} /> : icon || <Icon name="x" size={14} />}
          </span>
          <span className="audio-pill-label">{label || "Failed"}</span>
        </div>
      )}
    </div>
  );
}
