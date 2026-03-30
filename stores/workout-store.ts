import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'expo-crypto';
import type { StrengthSet, WorkoutType } from '@/types';

interface ActiveWorkoutState {
  readonly isActive: boolean;
  readonly type: WorkoutType | null;
  readonly startedAt: string | null;
  readonly idempotencyKey: string | null;
  readonly strengthSets: readonly StrengthSet[];
  readonly distanceKm: number;
  readonly elapsedSeconds: number;
}

interface WorkoutActions {
  readonly startWorkout: (type: WorkoutType) => void;
  readonly addStrengthSet: (set: StrengthSet) => void;
  readonly removeStrengthSet: (index: number) => void;
  readonly updateDistance: (km: number) => void;
  readonly updateElapsed: (seconds: number) => void;
  readonly reset: () => void;
}

type WorkoutStore = ActiveWorkoutState & WorkoutActions;

const initialState: ActiveWorkoutState = {
  isActive: false,
  type: null,
  startedAt: null,
  idempotencyKey: null,
  strengthSets: [],
  distanceKm: 0,
  elapsedSeconds: 0,
};

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set) => ({
      ...initialState,

      startWorkout: (type) =>
        set({
          isActive: true,
          type,
          startedAt: new Date().toISOString(),
          idempotencyKey: crypto.randomUUID(),
          strengthSets: [],
          distanceKm: 0,
          elapsedSeconds: 0,
        }),

      addStrengthSet: (newSet) =>
        set((state) => ({
          strengthSets: [...state.strengthSets, newSet],
        })),

      removeStrengthSet: (index) =>
        set((state) => ({
          strengthSets: state.strengthSets.filter((_, i) => i !== index),
        })),

      updateDistance: (km) => set({ distanceKm: km }),

      updateElapsed: (seconds) => set({ elapsedSeconds: seconds }),

      reset: () => set(initialState),
    }),
    {
      name: 'gymclash-active-workout',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist fields needed for recovery — not the timer
      partialize: (state) => ({
        isActive: state.isActive,
        type: state.type,
        startedAt: state.startedAt,
        idempotencyKey: state.idempotencyKey,
        strengthSets: state.strengthSets,
        distanceKm: state.distanceKm,
        elapsedSeconds: state.elapsedSeconds,
      }),
    }
  )
);
