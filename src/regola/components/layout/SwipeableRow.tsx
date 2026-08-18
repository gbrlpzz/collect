// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface SwipeableRowProps {
  children: ReactNode;
  action: ReactNode;
  actionWidth?: number;
  revealThreshold?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Swipeable list row adhering to Apple HIG swipe action interactions.
 * Uses native non-passive DOM touch listeners (Dispatch standard) for zero gesture latency
 * and guaranteed discrimination between regular taps and deliberate swipes.
 */
export function SwipeableRow({
  children,
  action,
  actionWidth = 76,
  revealThreshold = 40,
  onOpen,
  onClose,
  onClick,
  className = "",
}: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [_open, setOpen] = useState(false);

  const openDirectionRef = useRef<number>(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const curDxRef = useRef<number>(0);
  const axisRef = useRef<"x" | "y" | null>(null);
  const draggingRef = useRef<boolean>(false);
  const movedRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);

  const resetOpenState = (animate = true) => {
    openDirectionRef.current = 0;
    curDxRef.current = 0;
    setOpen(false);
    if (rowRef.current) {
      rowRef.current.style.transition = animate
        ? "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)"
        : "none";
      rowRef.current.style.transform = "translateX(0)";
    }
    onClose?.();
  };

  const revealAction = (direction: number = -1, animate = true) => {
    openDirectionRef.current = direction;
    curDxRef.current = direction * actionWidth;
    setOpen(true);
    if (rowRef.current) {
      rowRef.current.style.transition = animate
        ? "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)"
        : "none";
      rowRef.current.style.transform = `translateX(${direction * actionWidth}px)`;
    }
    onOpen?.();
  };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const isActionTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      return !!el?.closest?.(".swipe-action-backdrop, button, [role='button']");
    };

    const onDown = (x: number, y: number) => {
      if (draggingRef.current) return;
      startXRef.current = x;
      startYRef.current = y;
      axisRef.current = null;
      movedRef.current = false;
      curDxRef.current = openDirectionRef.current * actionWidth;
      draggingRef.current = true;
    };

    const onMove = (x: number, y: number, e: TouchEvent | PointerEvent) => {
      if (!draggingRef.current || startXRef.current == null || startYRef.current == null) return;
      const dx = x - startXRef.current;
      const dy = y - startYRef.current;

      if (!axisRef.current) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axisRef.current === "y") {
          draggingRef.current = false;
          return;
        }
      }

      if (axisRef.current !== "x") return;

      if (Math.abs(dx) >= 12) {
        movedRef.current = true;
      }

      if (e.cancelable) e.preventDefault();

      const rawNext = curDxRef.current + dx;
      const next = rawNext < -actionWidth
        ? -actionWidth + (rawNext + actionWidth) * 0.25
        : rawNext > 0
          ? rawNext * 0.25
          : rawNext;

      row.style.transition = "none";
      row.style.transform = `translateX(${next}px)`;
    };

    const onEnd = (x?: number) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;

      const finalX = typeof x === "number" ? x : startXRef.current;
      const dx = finalX != null && startXRef.current != null ? finalX - startXRef.current : 0;

      if (axisRef.current === "x" && movedRef.current) {
        suppressClickRef.current = true;
        const finalDx = curDxRef.current + dx;
        if (finalDx <= -revealThreshold) {
          revealAction(-1, true);
        } else {
          resetOpenState(true);
        }
      } else {
        if (openDirectionRef.current !== 0 && !movedRef.current) {
          resetOpenState(true);
          suppressClickRef.current = true;
        } else {
          row.style.transition = "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)";
          row.style.transform = `translateX(${openDirectionRef.current * actionWidth}px)`;
        }
      }
    };

    const onCancel = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      row.style.transition = "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)";
      row.style.transform = `translateX(${openDirectionRef.current * actionWidth}px)`;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isActionTarget(e.target)) return;
      const t = e.touches && e.touches[0];
      if (t) onDown(t.clientX, t.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches && e.touches[0];
      if (t) onMove(t.clientX, t.clientY, e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isActionTarget(e.target)) return;
      const t = e.changedTouches && e.changedTouches[0];
      onEnd(t ? t.clientX : undefined);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (isActionTarget(e.target)) return;
      onDown(e.clientX, e.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      onMove(e.clientX, e.clientY, e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      onEnd(e.clientX);
    };

    const handleClick = (e: MouseEvent) => {
      if (isActionTarget(e.target)) return;
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (openDirectionRef.current !== 0) {
        resetOpenState(true);
        e.stopPropagation();
        return;
      }
      onClick?.();
    };

    row.addEventListener("touchstart", handleTouchStart, { passive: true });
    row.addEventListener("touchmove", handleTouchMove, { passive: false });
    row.addEventListener("touchend", handleTouchEnd, { passive: true });
    row.addEventListener("touchcancel", onCancel, { passive: true });

    row.addEventListener("pointerdown", handlePointerDown);
    row.addEventListener("pointermove", handlePointerMove);
    row.addEventListener("pointerup", handlePointerUp);
    row.addEventListener("pointercancel", onCancel);

    row.addEventListener("click", handleClick);

    return () => {
      row.removeEventListener("touchstart", handleTouchStart);
      row.removeEventListener("touchmove", handleTouchMove);
      row.removeEventListener("touchend", handleTouchEnd);
      row.removeEventListener("touchcancel", onCancel);

      row.removeEventListener("pointerdown", handlePointerDown);
      row.removeEventListener("pointermove", handlePointerMove);
      row.removeEventListener("pointerup", handlePointerUp);
      row.removeEventListener("pointercancel", onCancel);

      row.removeEventListener("click", handleClick);
    };
  }, [onClick, actionWidth, revealThreshold]);

  return (
    <div className={`swipeable-row-container ${className}`.trim()}>
      <div
        className="swipe-action-backdrop"
        style={{ width: actionWidth }}
        onClick={() => resetOpenState(false)}
      >
        {action}
      </div>

      <div
        ref={rowRef}
        className="swipeable-row-front"
      >
        {children}
      </div>
    </div>
  );
}
