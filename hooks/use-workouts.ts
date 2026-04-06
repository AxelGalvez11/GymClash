import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyWorkouts,
  fetchWorkoutWithValidation,
  createWorkout,
  type CreateWorkoutInput,
} from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useMyWorkouts(limit = 20) {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['workouts', session?.user?.id, limit],
    queryFn: () => fetchMyWorkouts(limit),
    enabled: !!session,
    staleTime: 1000 * 30,
  });
}

export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => fetchWorkoutWithValidation(workoutId!),
    enabled: !!workoutId,
    staleTime: 1000 * 60 * 5, // 5 minutes — workout details are stable
  });
}

export function useSubmitWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkoutInput) => createWorkout(input),
    onSuccess: () => {
      // Invalidate all workout and profile queries using exact: false
      queryClient.invalidateQueries({ queryKey: ['workouts'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['profile'], exact: false });
      // Also invalidate 1RM records as they may be affected by new workout
      queryClient.invalidateQueries({ queryKey: ['1rm-records'], exact: false });
    },
  });
}
