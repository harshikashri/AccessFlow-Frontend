import { useCallback, useEffect, useRef } from 'react';

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export function useThrottledCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300,
  { leading = true, trailing = true }: ThrottleOptions = {},
): (...args: TArgs) => void {
  const callbackRef = useRef(callback);
  const timerRef = useRef<number | null>(null);
  const lastCallTimeRef = useRef<number | null>(null);
  const latestArgsRef = useRef<TArgs | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: TArgs) => {
      const now = Date.now();
      latestArgsRef.current = args;

      if (lastCallTimeRef.current === null) {
        lastCallTimeRef.current = now;
        if (leading) {
          latestArgsRef.current = null;
          callbackRef.current(...args);
          return;
        }
      }

      const elapsed = now - lastCallTimeRef.current;
      const remaining = Math.max(0, delay - elapsed);

      if (remaining === 0) {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
        lastCallTimeRef.current = now;
        latestArgsRef.current = null;
        callbackRef.current(...args);
        return;
      }

      if (trailing && timerRef.current === null) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          lastCallTimeRef.current = Date.now();
          const latestArgs = latestArgsRef.current;
          latestArgsRef.current = null;
          if (latestArgs) callbackRef.current(...latestArgs);
        }, remaining);
      }
    },
    [delay, leading, trailing],
  );
}
