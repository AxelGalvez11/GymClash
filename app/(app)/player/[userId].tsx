import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { fetchPublicProfile } from '@/services/api';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import type { Rank as RankType, ArenaTier } from '@/types';

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });

  if (isLoading || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  // Entrance animations
  const fadeCharacter = useFadeSlide(0);
  const fadeStats = useFadeSlide(100);

  const rankKey = (profile.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;
  const trophies = profile.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier];

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        <Pressable onPress={() => router.replace('/(app)/home' as any)} className="py-4 active:scale-[0.98]">
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} Back</Text>
        </Pressable>

        {/* Header */}
        <Animated.View style={fadeCharacter.style} className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-[#23233f] items-center justify-center mb-3">
            <FontAwesome name="user" size={32} color="#aaa8c3" />
          </View>
          <Text className="text-2xl" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>
            {profile.display_name || 'Warrior'}
          </Text>
          <Text className="text-lg mt-1" style={{ color: rankConfig.color, fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>
            {rankConfig.label} -- Level {profile.level ?? 1}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            <Text className="text-lg">{arenaConfig.badge}</Text>
            <Text style={{ color: arenaConfig.accent, fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>
              {arenaConfig.label}
            </Text>
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>-- {trophies} trophies</Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={fadeStats.style}>
        <View className="flex-row gap-3 mb-4">
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text className="text-xs uppercase mb-1" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>Level</Text>
            <Text className="text-2xl" style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{profile.level ?? 1}</Text>
          </View>
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text className="text-xs uppercase mb-1" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>XP</Text>
            <Text className="text-2xl" style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{profile.xp ?? 0}</Text>
          </View>
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text className="text-xs uppercase mb-1" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>Streak</Text>
            <Text className="text-2xl" style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{profile.current_streak ?? 0}</Text>
          </View>
        </View>

        {/* Report */}
        <Pressable
          className="bg-[#1d1d37] rounded-xl py-3 items-center mt-4 active:scale-[0.98]"
          onPress={() => router.push(`/(app)/report/${userId}`)}
        >
          <Text className="text-sm" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Report User</Text>
        </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
