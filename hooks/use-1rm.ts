import { useQuery } from '@tanstack/react-query';
import { fetchMy1RMRecords } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useMy1RMRecords() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['1rm-records', session?.user?.id],
    queryFn: fetchMy1RMRecords,
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}
