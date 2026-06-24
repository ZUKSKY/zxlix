"use client";

import { useEffect, useState } from "react";

// Returns true only after the component has mounted on the client.
// Use this to gate any read of persisted (localStorage) state so the first
// client render matches the server HTML and avoids hydration mismatches.
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard must flip after client mount.
    setHydrated(true);
  }, []);
  return hydrated;
}
