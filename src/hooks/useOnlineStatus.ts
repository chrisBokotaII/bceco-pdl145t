import { useEffect, useState } from 'react';

const SIM_OFFLINE_KEY = 'bceco_pdl145t_simulated_offline';

export function useOnlineStatus() {
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOfflineState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIM_OFFLINE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setSimulatedOffline = (val: boolean) => {
    setSimulatedOfflineState(val);
    try {
      localStorage.setItem(SIM_OFFLINE_KEY, val ? 'true' : 'false');
    } catch {
      // ignore storage errors
    }
  };

  return {
    browserOnline,
    simulatedOffline,
    setSimulatedOffline,
    isOnline: browserOnline && !simulatedOffline,
  };
}
