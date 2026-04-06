import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyClan,
  fetchActiveWar,
  fetchWarHistory,
  fetchTopClans,
  createClan,
  joinClan,
  leaveClan,
  searchClans,
  fetchClanRoster,
  fetchWarContributions,
  fetchMyClanChallenges,
  sendWarChallenge,
  respondToChallenge,
} from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';

export function useMyClan() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['clan', session?.user?.id],
    queryFn: fetchMyClan,
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });
}

export function useActiveWar() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['active-war', session?.user?.id],
    queryFn: fetchActiveWar,
    enabled: !!session,
    staleTime: 1000 * 60,
  });
}

export function useSearchClans(query: string) {
  return useQuery({
    queryKey: ['search-clans', query],
    queryFn: () => searchClans(query),
    enabled: query.length >= 0, // always enabled — empty query returns popular clans
    staleTime: 1000 * 30,
  });
}

export function useClanRoster(clanId: string | undefined) {
  return useQuery({
    queryKey: ['clan-roster', clanId],
    queryFn: () => fetchClanRoster(clanId!),
    enabled: !!clanId,
    staleTime: 1000 * 60,
  });
}

export function useWarContributions(warId: string | undefined, clanId: string | undefined) {
  return useQuery({
    queryKey: ['war-contributions', warId, clanId],
    queryFn: () => fetchWarContributions(warId!, clanId!),
    enabled: !!warId && !!clanId,
    staleTime: 1000 * 30,
  });
}

export function useWarHistory(clanId: string | undefined) {
  return useQuery({
    queryKey: ['war-history', clanId],
    queryFn: () => fetchWarHistory(clanId!),
    enabled: !!clanId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTopClans() {
  return useQuery({
    queryKey: ['top-clans'],
    queryFn: () => fetchTopClans(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateClan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, tag, description }: { name: string; tag: string; description: string }) =>
      createClan(name, tag, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clan'], exact: false });
    },
  });
}

export function useJoinClan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clanId: string) => joinClan(clanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clan'], exact: false });
    },
  });
}

export function useMyClanChallenges() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['clan-challenges', session?.user?.id],
    queryFn: fetchMyClanChallenges,
    enabled: !!session,
    staleTime: 1000 * 30,
  });
}

export function useSendChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetClanId, warType }: { targetClanId: string; warType?: 'strength_only' | 'cardio_only' | 'mixed' }) =>
      sendWarChallenge(targetClanId, warType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clan-challenges'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['active-war'], exact: false });
    },
  });
}

export function useRespondToChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, accept }: { challengeId: string; accept: boolean }) =>
      respondToChallenge(challengeId, accept),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clan-challenges'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['active-war'], exact: false });
    },
  });
}

export function useLeaveClan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveClan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clan'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['active-war'], exact: false });
    },
  });
}
