import { useCallback, useEffect, useRef, useState } from "react";
import type { ConfirmationDialogProps } from "../components/ui";

export type ConfirmationRequest = Pick<
  ConfirmationDialogProps,
  "title" | "message" | "confirmLabel" | "cancelLabel" | "destructive"
>;

/** Promise-based confirmation with unmount cleanup and a single active request. */
export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null,
  );
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const resolve = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setConfirmation(null);
  }, []);

  const request = useCallback((next: ConfirmationRequest) => {
    resolverRef.current?.(false);
    return new Promise<boolean>((resolver) => {
      resolverRef.current = resolver;
      setConfirmation(next);
    });
  }, []);

  useEffect(() => () => resolverRef.current?.(false), []);

  return { confirmation, request, resolve };
}
