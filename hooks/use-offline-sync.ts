import { useEffect, useCallback } from 'react';
import { useOfflineQueueStore, isStaleWorkout } from '@/stores/offline-queue-store';
import { createWorkout } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

// TODO: Install @react-native-community/netinfo and subscribe to connectivity
// changes for automatic reconnect detection. Until then, sync is triggered
// on mount (when session exists) and can be called manually via syncQueue().

const MAX_SYNC_ATTEMPTS = 5;

/**
 * Hook that attempts to sync queued offline workouts.
 * Should be mounted once at the app level (e.g., in _layout.tsx or home screen).
 *
 * Without @react-native-community/netinfo, sync is attempted:
 * - On mount when a session exists and the queue is non-empty
 * - Manually via the returned `syncQueue` callback
 */
export function useOfflineSync() {
  const session = useAuthStore((s) => s.session);
  const queue = useOfflineQueueStore((s) => s.queue);
  const setSyncStatus = useOfflineQueueStore((s) => s.setSyncStatus);
  const removeFromQueue = useOfflineQueueStore((s) => s.removeFromQueue);
  const updateSyncAttempt = useOfflineQueueStore((s) => s.updateSyncAttempt);
  const setLastSyncAt = useOfflineQueueStore((s) => s.setLastSyncAt);

  const syncQueue = useCallback(async () => {
    if (!session || queue.length === 0) return;
    const currentStatus = useOfflineQueueStore.getState().syncStatus;
    if (currentStatus === 'syncing') return;

    setSyncStatus('syncing');

    let hadErrors = false;

    for (const workout of queue) {
      // Skip stale workouts — they need manual review
      if (isStaleWorkout(workout)) continue;
      // Skip workouts that have failed too many times
      if (workout.sync_attempts >= MAX_SYNC_ATTEMPTS) continue;

      try {
        await createWorkout({
          type: workout.type,
          started_at: workout.started_at,
          completed_at: workout.completed_at,
          duration_seconds: workout.duration_seconds,
          sets: workout.sets ? [...workout.sets] : null,
          route_data: workout.route_data,
          source: workout.source,
          idempotency_key: workout.idempotency_key,
        });
        removeFromQueue(workout.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        updateSyncAttempt(workout.id, message);
        hadErrors = true;
      }
    }

    setLastSyncAt(new Date().toISOString());
    setSyncStatus(hadErrors ? 'error' : 'idle');
  }, [session, queue, setSyncStatus, removeFromQueue, updateSyncAttempt, setLastSyncAt]);

  // Attempt sync on mount and when session changes
  useEffect(() => {
    if (session && queue.length > 0) {
      void syncQueue();
    }
    // Only trigger on session change, not every queue change (to avoid loops)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return { syncQueue, pendingCount: queue.length };
}
