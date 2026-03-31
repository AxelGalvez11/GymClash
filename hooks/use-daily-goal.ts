import { useQuery } from '@tanstack/react-query';
import { fetchOrCreateDailyGoal } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useDailyGoal() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['daily-goal', session?.user?.id],
    queryFn: fetchOrCreateDailyGoal,
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes — goal is per day
  });
}
