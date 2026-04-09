"use client";

import { useEffect, useState } from "react";

export const OfflineBanner = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-amber-500/40 bg-amber-950/95 px-4 py-3 text-center text-amber-100 shadow-lg backdrop-blur-sm"
      role="status"
    >
      <p className="font-gaming text-xs tracking-wide">
        Sin conexión — los cambios pueden fallar hasta que vuelva la red.
      </p>
    </div>
  );
};
