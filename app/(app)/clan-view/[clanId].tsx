import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Rank } from '@/constants/theme';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
import { useShimmer } from '@/hooks/use-shimmer';
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

function SkeletonBlock() {
  const { animatedStyle } = useEntrance(0, 'fade-slide');
  const { shimmerStyle } = useShimmer(300);

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <Animated.View style={animatedStyle} className="px-4 pt-6 items-center">
        <View className="bg-[#1d1d37] rounded-full w-16 h-16 mb-4" />
        <View className="bg-[#1d1d37] rounded-xl w-48 h-7 mb-2" />
        <View className="bg-[#1d1d37] rounded-xl w-20 h-5 mb-6" />
        <View className="flex-row gap-3 w-full mb-6">
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-1 bg-[#1d1d37] rounded-xl h-20" style={{ overflow: 'hidden' }}>
              <Animated.View style={[shimmerStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(206,150,255,0.06)' }]} />
            </View>
          ))}
        </View>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="bg-[#1d1d37] rounded-xl w-full h-14 mb-2" style={{ overflow: 'hidden' }}>
            <Animated.View style={[shimmerStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(206,150,255,0.06)' }]} />
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

function MemberRow({ member, index }: { readonly member: any; readonly index: number }) {
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 60);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const rankConfig = Rank[(member.rank ?? 'rookie') as RankType] ?? Rank.rookie;
  const isLeader = member.role === 'leader';
  const { glowStyle } = useGlowPulse('#ffd709', 0.15, 0.5, 2400, isLeader);

  return (
    <Animated.View style={staggerStyle}>
      <Animated.View style={[pressStyle, isLeader ? glowStyle : undefined]}>
        <Pressable
          className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center mb-2"
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View className="w-8 h-8 rounded-full bg-[#23233f] items-center justify-center">
            <FontAwesome name={isLeader ? 'star' : 'user'} size={14} color={isLeader ? '#ffd709' : '#aaa8c3'} />
          </View>
          <View className="flex-1 ml-3">
            <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>{member.display_name || 'Warrior'}</Text>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
              Lv.{member.level} · <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text>
            </Text>
          </View>
          <Text style={{ color: ROLE_COLORS[member.role] ?? '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
            {member.role === 'leader' ? 'Leader' : member.role === 'officer' ? 'Officer' : 'Member'}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function ClanViewScreen() {
  const router = useRouter();
  const { clanId } = useLocalSearchParams<{ clanId: string }>();
  const { data: clan, isLoading: clanLoading } = useClanDetails(clanId);
  const { data: members, isLoading: membersLoading } = useClanMembers(clanId);

  const isLoading = clanLoading || membersLoading;

  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: infoStyle } = useEntrance(80, 'fade-scale');
  const { animatedStyle: statsStyle } = useEntrance(160, 'spring-up');
  const { animatedStyle: membersHeaderStyle } = useEntrance(220, 'fade-slide');

  if (isLoading) {
    return <SkeletonBlock />;
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
        <Animated.View
          style={headerStyle}
          className="flex-row items-center px-4 py-3"
        >
          <Pressable onPress={() => router.replace('/(app)/home' as any)} hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <Text className="ml-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>Clan Details</Text>
        </Animated.View>

        {/* Clan Info */}
        <Animated.View style={infoStyle} className="items-center py-6 px-4">
          <Text className="text-4xl mb-2">⚔️</Text>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 24 }}>{clan.name}</Text>
          <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>[{clan.tag}]</Text>
          {clan.description ? (
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', textAlign: 'center', marginTop: 8, paddingHorizontal: 16 }}>
              {clan.description}
            </Text>
          ) : null}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View style={statsStyle} className="flex-row px-4 mb-6 gap-3">
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center" style={{ borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>MEMBERS</Text>
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{clan.member_count ?? members?.length ?? 0}</Text>
          </View>
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center" style={{ borderWidth: 1, borderColor: 'rgba(255,215,9,0.15)' }}>
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>TROPHIES</Text>
            <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{totalTrophies}</Text>
          </View>
          <View className="flex-1 bg-[#1d1d37] rounded-xl p-3 items-center" style={{ borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>MAX</Text>
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{clan.max_members ?? 50}</Text>
          </View>
        </Animated.View>

        {/* Members */}
        <View className="px-4">
          <Animated.View style={membersHeaderStyle}>
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginBottom: 12 }}>Members</Text>
          </Animated.View>
          {(members ?? []).length === 0 ? (
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', textAlign: 'center', paddingVertical: 16 }}>
              No members found
            </Text>
          ) : (
            <View>
              {(members ?? []).map((m: any, i: number) => (
                <MemberRow key={m.user_id} member={m} index={i} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
