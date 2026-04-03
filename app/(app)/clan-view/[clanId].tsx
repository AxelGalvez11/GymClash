import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Colors, Rank } from '@/constants/theme';
import type { Rank as RankType } from '@/types';

function useClanDetails(clanId: string | undefined) {
  return useQuery({
    queryKey: ['clan-detail', clanId],
    queryFn: async () => {
      if (!clanId) return null;
      const { data, error } = await supabase
        .from('clans')
        .select('*')
        .eq('id', clanId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clanId,
  });
}

function useClanMembers(clanId: string | undefined) {
  return useQuery({
    queryKey: ['clan-members', clanId],
    queryFn: async () => {
      if (!clanId) return [];
      const { data, error } = await supabase
        .rpc('get_clan_roster', { p_clan_id: clanId });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clanId,
  });
}

const ROLE_COLORS: Record<string, string> = {
  leader: '#ffd709',
  officer: '#ce96ff',
  member: '#74738b',
};

export default function ClanViewScreen() {
  const router = useRouter();
  const { clanId } = useLocalSearchParams<{ clanId: string }>();
  const { data: clan, isLoading: clanLoading } = useClanDetails(clanId);
  const { data: members, isLoading: membersLoading } = useClanMembers(clanId);

  const isLoading = clanLoading || membersLoading;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  if (!clan) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Clan not found</Text>
        <Pressable className="mt-4" onPress={() => router.replace('/(app)/home' as any)}>
          <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const totalTrophies = (members ?? []).reduce((sum: number, m: any) => sum + (m.trophy_rating ?? 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(206,150,255,0.15)' }}>
          <Pressable onPress={() => router.replace('/(app)/home' as any)} hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <Text className="ml-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>Clan Details</Text>
        </View>

        {/* Clan Info */}
        <View className="items-center py-6 px-4">
          <Text className="text-4xl mb-2">⚔️</Text>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 24 }}>{clan.name}</Text>
          <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>[{clan.tag}]</Text>
          {clan.description ? (
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', textAlign: 'center', marginTop: 8, paddingHorizontal: 16 }}>
              {clan.description}
            </Text>
          ) : null}
        </View>

        {/* Stats Row */}
        <View className="flex-row px-4 mb-6 gap-3">
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center">
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>MEMBERS</Text>
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{clan.member_count ?? members?.length ?? 0}</Text>
          </View>
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center">
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>TROPHIES</Text>
            <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{totalTrophies}</Text>
          </View>
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center">
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>MAX</Text>
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{clan.max_members ?? 50}</Text>
          </View>
        </View>

        {/* Members */}
        <View className="px-4">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginBottom: 12 }}>Members</Text>
          {(members ?? []).length === 0 ? (
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', textAlign: 'center', paddingVertical: 16 }}>
              No members found
            </Text>
          ) : (
            <View className="gap-2">
              {(members ?? []).map((m: any) => {
                const rankConfig = Rank[(m.rank ?? 'rookie') as RankType] ?? Rank.rookie;
                return (
                  <View key={m.user_id} className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-[#23233f] items-center justify-center">
                      <FontAwesome name="user" size={14} color="#aaa8c3" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>{m.display_name || 'Warrior'}</Text>
                      <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
                        Lv.{m.level} · <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text>
                      </Text>
                    </View>
                    <Text style={{ color: ROLE_COLORS[m.role] ?? '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
                      {m.role === 'leader' ? 'Leader' : m.role === 'officer' ? 'Officer' : 'Member'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
