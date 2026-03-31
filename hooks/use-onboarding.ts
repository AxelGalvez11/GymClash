import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/services/supabase';

/**
 * Check if the current user needs onboarding.
 * A user needs onboarding if their display_name is still the default empty string.
 */
export function useNeedsOnboarding() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['needs-onboarding', session?.user?.id],
    queryFn: async () => {
      if (!session?.user) return false;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .single();
      return !data?.display_name || data.display_name === '';
    },
    enabled: !!session,
    staleTime: Infinity, // Only check once per session
  });
}
