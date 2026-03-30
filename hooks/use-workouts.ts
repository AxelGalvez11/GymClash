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
  });
}

export function useSubmitWorkout() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (input: CreateWorkoutInput) => createWorkout(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
