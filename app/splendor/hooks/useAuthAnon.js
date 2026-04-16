import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

export function useAuthAnon(auth) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) { setUser(u); setReady(true); }
      else {
        try { await signInAnonymously(auth); }
        catch { setReady(true); }
      }
    });
    return () => unsub();
  }, [auth]);

  return { user, ready };
}
