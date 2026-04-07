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
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) {
          console.warn('Onboarding check failed:', error.message);
          return false; // Don't block navigation if DB is unreachable
        }
        return !data?.display_name || data.display_name.trim() === '';
      } catch (err) {
        console.warn('Onboarding check error:', err);
        return false;
      }
    },
    enabled: !!session,
    staleTime: Infinity,
    retry: 1, // Only retry once to avoid blocking
  });
}
