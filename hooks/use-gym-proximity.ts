import { useCallback, useEffect, useRef, useState } from 'react';
import type { GymLocationResult } from '@/types';
import { createMockGymAdapter } from '@/lib/gps/mock-gym-adapter';

// TODO: Replace with real expo-location when native GPS is wired up.
const MOCK_LATITUDE = 0;
const MOCK_LONGITUDE = 0;

const adapter = createMockGymAdapter();

export function useGymProximity() {
  const [result, setResult] = useState<GymLocationResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isMounted = useRef(true);

  // Cleanup guard — prevents state updates after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const check = useCallback(async () => {
    setIsChecking(true);

    try {
      const gymResult = await adapter.checkProximity(
        MOCK_LATITUDE,
        MOCK_LONGITUDE,
      );

      if (isMounted.current) {
        setResult(gymResult);
      }
    } finally {
      if (isMounted.current) {
        setIsChecking(false);
      }
    }
  }, []);

  return { result, isChecking, check } as const;
}
