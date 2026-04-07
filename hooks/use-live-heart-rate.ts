import { useCallback, useEffect, useRef, useState } from 'react';
import { createHealthAdapter } from '@/lib/health/create-health-adapter';
import type { HealthAdapter, HeartRateSample } from '@/lib/health/types';

interface UseLiveHeartRateReturn {
  readonly currentHeartRate: number | null;
  readonly heartRateSamples: readonly HeartRateSample[];
  readonly isConnected: boolean;
  readonly connect: () => Promise<boolean>;
}

/**
 * Polls the health adapter for latest HR samples during an active workout.
 * Exposes current heart rate, sample history, and connection state.
 */
export function useLiveHeartRate(
  isActive: boolean,
  pollIntervalMs: number = 5000
): UseLiveHeartRateReturn {
  const adapterRef = useRef<HealthAdapter>(createHealthAdapter());
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [heartRateSamples, setHeartRateSamples] = useState<
    readonly HeartRateSample[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const lastQueryTimeRef = useRef<string>(new Date().toISOString());

  const connect = useCallback(async (): Promise<boolean> => {
    const adapter = adapterRef.current;

    const available = await adapter.isAvailable();
    if (!available) {
      setIsConnected(false);
      return false;
    }

    const granted = await adapter.requestPermissions();
    setIsConnected(granted);
    return granted;
  }, []);

  // Poll for heart rate data while active + connected
  useEffect(() => {
    if (!isActive || !isConnected) return;

    const poll = async () => {
      const now = new Date().toISOString();
      const evidence = await adapterRef.current.collectEvidence(
        lastQueryTimeRef.current,
        now
      );
      lastQueryTimeRef.current = now;

      if (evidence.heartRateSamples.length > 0) {
        setHeartRateSamples((prev) => [
          ...prev,
          ...evidence.heartRateSamples,
        ]);

        const latest =
          evidence.heartRateSamples[evidence.heartRateSamples.length - 1];
        if (latest) {
          setCurrentHeartRate(latest.bpm);
        }
      }
    };

    // Initial poll
    void poll();

    const interval = setInterval(poll, pollIntervalMs);
    return () => clearInterval(interval);
  }, [isActive, isConnected, pollIntervalMs]);

  // Reset when workout ends
  useEffect(() => {
    if (!isActive) {
      setCurrentHeartRate(null);
      setHeartRateSamples([]);
      lastQueryTimeRef.current = new Date().toISOString();
    }
  }, [isActive]);

  return {
    currentHeartRate,
    heartRateSamples,
    isConnected,
    connect,
  };
}
