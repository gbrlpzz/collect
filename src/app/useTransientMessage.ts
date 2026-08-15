import { useCallback, useEffect, useRef, useState } from "react";

export type ToastTone = "success" | "failure";

export interface TransientMessage {
  message: string | null;
  tone: ToastTone;
  show: (nextMessage: string, tone?: ToastTone) => void;
  dismiss: () => void;
}

/** One accessible, replaceable transient message with explicit dismissal.
 * The tone decides the icon and the live-region role: failures must never be
 * announced as routine successes. */
export function useTransientMessage(timeoutMs = 3_600): TransientMessage {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<ToastTone>("success");
  const timerRef = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setMessage(null);
  }, []);

  const show = useCallback(
    (nextMessage: string, nextTone: ToastTone = "success") => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      setMessage(nextMessage);
      setTone(nextTone);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined;
        setMessage(null);
      }, timeoutMs);
    },
    [timeoutMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { message, tone, show, dismiss };
}
