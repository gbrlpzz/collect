import { useCallback, useEffect, useRef, useState } from "react";

/** One accessible, replaceable transient message with explicit dismissal. */
export function useTransientMessage(timeoutMs = 3_600) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
    setMessage(null);
  }, []);

  const show = useCallback(
    (nextMessage: string) => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
      setMessage(nextMessage);
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

  return { message, show, dismiss };
}
