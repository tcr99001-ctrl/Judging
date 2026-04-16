import { useEffect, useRef, useState } from 'react';

export function useAutoEndTurn({
  enabled,
  roomData,
  userId,
  pendingForMe,
  lockUsed,
  blockUI,
  onEndTurn
}) {
  const ref = useRef({ key: '', inFlight: false, attempts: 0, timer: null });
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => () => {
    if (ref.current.timer) window.clearTimeout(ref.current.timer);
  }, []);

  useEffect(() => {
    if (!enabled || !roomData || !userId || !lockUsed || pendingForMe || blockUI) {
      if (ref.current.timer) window.clearTimeout(ref.current.timer);
      ref.current.key = '';
      ref.current.inFlight = false;
      ref.current.attempts = 0;
      ref.current.timer = null;
      return;
    }

    const key = `${roomData.turnIndex}:${userId}:${roomData.status}`;
    if (ref.current.key === key && ref.current.inFlight) return;

    ref.current.key = key;
    ref.current.inFlight = true;

    (async () => {
      try {
        await onEndTurn();
        if (ref.current.timer) window.clearTimeout(ref.current.timer);
        ref.current.timer = null;
        ref.current.attempts = 0;
      } catch {
        const nextAttempts = ref.current.attempts + 1;
        ref.current.attempts = nextAttempts;
        if (ref.current.timer) window.clearTimeout(ref.current.timer);
        const delay = Math.min(1200, 180 * (2 ** Math.max(0, nextAttempts - 1)));
        ref.current.timer = window.setTimeout(() => {
          ref.current.inFlight = false;
          setRetryNonce((current) => current + 1);
        }, delay);
        return;
      } finally {
        if (!ref.current.timer) ref.current.inFlight = false;
      }
    })();
  }, [enabled, roomData?.turnIndex, roomData?.status, userId, pendingForMe, lockUsed, blockUI, onEndTurn, retryNonce]);
}
