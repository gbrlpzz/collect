// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

import { ModalSurface } from "./ModalSurface";
import { Button } from "../ui/Button";

export interface ConfirmationDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible alert dialog replacing window.confirm().
 */
export function ConfirmationDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  return (
    <ModalSurface
      kind="dialog"
      role="alertdialog"
      onClose={onCancel}
      labelledBy="confirmation-dialog-title"
      describedBy="confirmation-dialog-message"
    >
      <div className="dialog-copy">
        <h2 id="confirmation-dialog-title">{title}</h2>
        <p id="confirmation-dialog-message">{message}</p>
      </div>
      <div className="dialog-actions">
        <Button
          variant={destructive ? "destructive" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" data-modal-autofocus onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </ModalSurface>
  );
}
