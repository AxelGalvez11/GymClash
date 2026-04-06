import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyProfile, updateProfile, updateBiodata } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useProfile() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: fetchMyProfile,
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidate all profile queries without specifying userId since it may change
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        exact: false,
      });
    },
  });
}

export function useUpdateBiodata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBiodata,
    onSuccess: () => {
      // Invalidate all profile queries without specifying userId since it may change
      queryClient.invalidateQueries({
        queryKey: ['profile'],
        exact: false,
      });
    },
  });
}
