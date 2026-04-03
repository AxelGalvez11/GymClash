import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutType, StrengthSet, EvidenceSource } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface QueuedWorkout {
  readonly id: string;
  readonly type: WorkoutType;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_seconds: number;
  readonly sets: readonly StrengthSet[] | null;
  readonly route_data: {
    distance_km: number;
    avg_pace_min_per_km: number;
    elevation_gain_m: number;
  } | null;
  readonly source: EvidenceSource;
  readonly idempotency_key: string;
  readonly queued_at: string;
  readonly sync_attempts: number;
  readonly last_sync_error: string | null;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface OfflineQueueState {
  readonly queue: readonly QueuedWorkout[];
  readonly syncStatus: SyncStatus;
  readonly lastSyncAt: string | null;
}

interface OfflineQueueActions {
  readonly addToQueue: (
    workout: Omit<QueuedWorkout, 'id' | 'queued_at' | 'sync_attempts' | 'last_sync_error'>,
  ) => void;
  readonly removeFromQueue: (id: string) => void;
  readonly updateSyncAttempt: (id: string, error: string | null) => void;
  readonly setSyncStatus: (status: SyncStatus) => void;
  readonly setLastSyncAt: (timestamp: string) => void;
  readonly clearSynced: () => void;
}

// ─── Constants ──────────────────────────────────────────

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────

export function isStaleWorkout(workout: QueuedWorkout): boolean {
  const queuedAt = new Date(workout.queued_at).getTime();
  return Date.now() - queuedAt >= SEVENTY_TWO_HOURS_MS;
}

// ─── Store ──────────────────────────────────────────────

export const useOfflineQueueStore = create<OfflineQueueState & OfflineQueueActions>()(
  persist(
    (set) => ({
      queue: [],
      syncStatus: 'idle',
      lastSyncAt: null,

      addToQueue: (workout) =>
        set((state) => ({
          queue: [
            ...state.queue,
            {
              ...workout,
              id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              queued_at: new Date().toISOString(),
              sync_attempts: 0,
              last_sync_error: null,
            },
          ],
        })),

      removeFromQueue: (id) =>
        set((state) => ({
          queue: state.queue.filter((w) => w.id !== id),
        })),

      updateSyncAttempt: (id, error) =>
        set((state) => ({
          queue: state.queue.map((w) =>
            w.id === id
              ? { ...w, sync_attempts: w.sync_attempts + 1, last_sync_error: error }
              : w,
          ),
        })),

      setSyncStatus: (syncStatus) => set({ syncStatus }),

      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),

      clearSynced: () =>
        set((state) => ({
          queue: state.queue.filter(
            (w) => !isStaleWorkout(w) && w.sync_attempts < 5
          ),
        })),
    }),
    {
      name: 'gymclash-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
