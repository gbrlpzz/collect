// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export interface SwipeableRowProps {
  children: ReactNode;
  action: ReactNode;
  actionWidth?: number;
  fullSwipeThreshold?: number;
  onFullSwipe?: () => void;
  onClick?: () => void;
  className?: string;
}

/**
 * Swipeable list row adhering to Apple HIG list swipe actions.
 * Swiping left reveals contextual actions underneath (e.g. Swap, Delete, Archive).
 * Includes robust click-vs-swipe discrimination to prevent accidental triggers.
 */
export function SwipeableRow({
  children,
  action,
  actionWidth = 76,
  fullSwipeThreshold = 130,
  onFullSwipe,
  onClick,
  className = "",
}: SwipeableRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  // Increased threshold: require more deliberate movement to classify as horizontal swipe
  const HORIZONTAL_DETECT_THRESHOLD = 18;
  // Minimum swipe distance before considering it a real gesture
  const MIN_SWIPE_DISTANCE = 30;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button:not(.swipeable-row-front)")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalRef.current = null;
    setIsSwiping(true);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    if (isHorizontalRef.current === null) {
      if (Math.abs(deltaX) > HORIZONTAL_DETECT_THRESHOLD || Math.abs(deltaY) > HORIZONTAL_DETECT_THRESHOLD) {
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalRef.current) return;

    if (deltaX < 0) {
      const clamped = deltaX < -actionWidth
        ? -actionWidth + (deltaX + actionWidth) * 0.4
        : deltaX;
      setOffsetX(clamped);
    } else if (offsetX < 0) {
      setOffsetX(Math.min(0, deltaX - actionWidth));
    }
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If horizontal was detected AND it was a deliberate swipe (minimum distance)
    if (isHorizontalRef.current && distance >= MIN_SWIPE_DISTANCE) {
      const deltaX = e.clientX - startXRef.current;
      if (deltaX <= -fullSwipeThreshold && onFullSwipe) {
        setOffsetX(0);
        onFullSwipe();
      } else if (deltaX < -actionWidth / 2) {
        setOffsetX(-actionWidth);
      } else {
        setOffsetX(0);
      }
    } else {
      // Regular tap/click
      if (offsetX < 0) {
        setOffsetX(0);
      } else {
        onClick?.();
      }
    }
  };

  return (
    <div className={`swipeable-row-container ${className}`.trim()}>
      <div className="swipe-action-backdrop" style={{ width: actionWidth }}>
        {action}
      </div>

      <div
        className="swipeable-row-front"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {children}
      </div>
    </div>
  );
}
