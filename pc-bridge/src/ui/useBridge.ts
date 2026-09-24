// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';

/** Lädt asynchron echte Daten über die Bridge, fällt sonst auf den Fallback zurück. */
export function useBridge<T>(fn: () => Promise<T>, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let on = true;
    fn()
      .then((r) => { if (on && r !== undefined && r !== null) setValue(r); })
      .catch(() => { /* Fallback behalten */ });
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
