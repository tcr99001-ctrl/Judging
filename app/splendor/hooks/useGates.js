import { useEffect, useState } from 'react';

export function useGates({ pending, userId }) {
  const [showDiscard, setShowDiscard] = useState(false);
  const [showNoble, setShowNoble] = useState(false);

  const pendingForMe = pending && pending.playerId === userId;

  useEffect(() => {
    if (!pendingForMe) {
      setShowDiscard(false);
      setShowNoble(false);
      return;
    }
    if (pending.type === 'discard') { setShowDiscard(true); setShowNoble(false); }
    else if (pending.type === 'noble') { setShowNoble(true); setShowDiscard(false); }
  }, [pendingForMe, pending?.type]);

  return { pendingForMe, showDiscard, showNoble, setShowDiscard, setShowNoble };
}
