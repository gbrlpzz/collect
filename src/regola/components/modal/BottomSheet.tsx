// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import type { ReactNode } from "react";
import { ModalSurface } from "./ModalSurface";
import { IconButton } from "../ui/IconButton";

export interface BottomSheetProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  showHandle?: boolean;
}

export function BottomSheet({
  title,
  children,
  onClose,
  className = "",
  showHandle = true,
}: BottomSheetProps) {
  const titleId = "bottom-sheet-title";

  return (
    <ModalSurface
      kind="sheet"
      role="dialog"
      onClose={onClose}
      labelledBy={titleId}
      className={className}
    >
      {showHandle && <div className="sheet-handle" />}
      <div className="sheet-heading">
        <h2 id={titleId}>{title}</h2>
        <IconButton label="Close sheet" icon="x" size={18} onClick={onClose} />
      </div>
      <div className="sheet-content">{children}</div>
    </ModalSurface>
  );
}
