import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyProfile, updateProfile, updateBiodata } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useProfile() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: fetchMyProfile,
    enabled: !!session,
    staleTime: 1000 * 60,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['profile', session?.user?.id],
      });
    },
  });
}

export function useUpdateBiodata() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: updateBiodata,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['profile', session?.user?.id],
      });
    },
  });
}
