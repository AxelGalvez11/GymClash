import { useMemo } from 'react';
import { useMyWorkouts } from './use-workouts';
import { detectPlayerType } from '@/lib/player-type/detect';
import type { PlayerType, PlayerTypeDetectionInput } from '@/types';

export function usePlayerType(): {
  readonly playerType: PlayerType;
  readonly isLoading: boolean;
} {
  const { data: workouts, isLoading } = useMyWorkouts(100);

  const playerType = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return detectPlayerType({ workouts: [] });
    }

    const input: PlayerTypeDetectionInput = {
      workouts: workouts.map((w) => ({
        type: w.type,
        sets: w.sets ?? null,
        route_data: w.route_data ?? null,
        completed_at: w.completed_at ?? w.started_at,
      })),
    };

    return detectPlayerType(input);
  }, [workouts]);

  return { playerType, isLoading };
}
