import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as crypto from 'expo-crypto';
import type { StrengthSet, WorkoutType } from '@/types';
import type { HeartRateSample } from '@/lib/health/types';

// ─── Guest Workout (stored locally, synced on sign-up) ──

export interface GuestWorkout {
  readonly type: WorkoutType;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_seconds: number;
  readonly sets: readonly StrengthSet[] | null;
  readonly route_data: { distance_km: number; avg_pace_min_per_km: number; elevation_gain_m: number } | null;
}

const MAX_GUEST_WORKOUTS = 5;

interface GuestWorkoutState {
  readonly guestWorkouts: readonly GuestWorkout[];
}

interface GuestWorkoutActions {
  readonly addGuestWorkout: (workout: GuestWorkout) => void;
  readonly clearGuestWorkouts: () => void;
}

export const useGuestWorkoutStore = create<GuestWorkoutState & GuestWorkoutActions>()(
  persist(
    (set) => ({
      guestWorkouts: [],
      addGuestWorkout: (workout) =>
        set((state) => ({
          guestWorkouts: state.guestWorkouts.length < MAX_GUEST_WORKOUTS
            ? [...state.guestWorkouts, workout]
            : state.guestWorkouts,
        })),
      clearGuestWorkouts: () => set({ guestWorkouts: [] }),
    }),
    {
      name: 'gymclash-guest-workouts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Active Workout Session ─────────────────────────────

interface ActiveWorkoutState {
  readonly isActive: boolean;
  readonly type: WorkoutType | null;
  readonly startedAt: string | null;
  readonly idempotencyKey: string | null;
  readonly strengthSets: readonly StrengthSet[];
  readonly distanceKm: number;
  readonly elapsedSeconds: number;
  readonly heartRateSamples: readonly HeartRateSample[];
}

interface WorkoutActions {
  readonly startWorkout: (type: WorkoutType) => void;
  readonly addStrengthSet: (set: StrengthSet) => void;
  readonly removeStrengthSet: (index: number) => void;
  readonly updateDistance: (km: number) => void;
  readonly updateElapsed: (seconds: number) => void;
  readonly setHeartRateSamples: (samples: readonly HeartRateSample[]) => void;
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
  heartRateSamples: [],
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
          heartRateSamples: [],
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

      setHeartRateSamples: (samples) => set({ heartRateSamples: samples }),

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
        // elapsedSeconds intentionally not persisted — always starts fresh
      }),
    }
  )
);
