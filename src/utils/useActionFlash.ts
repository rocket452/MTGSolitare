import { useEffect, useRef, useState } from "react";

type FlashState<T extends string> = {
  target: T;
};

export function useActionFlash<T extends string>(actionDelayMs = 80, flashDurationMs = 420) {
  const [flashState, setFlashState] = useState<FlashState<T> | null>(null);
  const actionTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (actionTimerRef.current !== null) {
        window.clearTimeout(actionTimerRef.current);
      }

      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const flashThenRun = (target: T, action: () => void) => {
    if (actionTimerRef.current !== null) {
      window.clearTimeout(actionTimerRef.current);
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }

    setFlashState({ target });

    actionTimerRef.current = window.setTimeout(() => {
      action();
      actionTimerRef.current = null;
    }, actionDelayMs);

    resetTimerRef.current = window.setTimeout(() => {
      setFlashState(null);
      resetTimerRef.current = null;
    }, flashDurationMs);
  };

  return {
    flashTarget: flashState?.target,
    flashThenRun,
  };
}
