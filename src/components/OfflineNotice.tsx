import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Banner kecil saat perangkat offline: halaman tetap terbuka, tetapi peta butuh internet. */
export function OfflineNotice() {
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="offline-notice"
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-amber-500/95 text-black shadow-lg max-w-[92vw]"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>You are offline. Saved pages still work, but the satellite map needs internet.</span>
    </div>
  );
}
