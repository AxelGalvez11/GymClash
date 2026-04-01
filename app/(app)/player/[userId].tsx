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
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={Colors.brand.DEFAULT} size="large" />
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
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        <Pressable onPress={() => router.back()} className="py-4">
          <Text className="text-white/60 text-base">← Back</Text>
        </Pressable>

        {/* Header */}
        <Animated.View style={fadeCharacter.style} className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-surface-overlay items-center justify-center mb-3">
            <FontAwesome name="user" size={32} color={Colors.text.secondary} />
          </View>
          <Text className="text-white text-2xl font-bold">
            {profile.display_name || 'Warrior'}
          </Text>
          <Text className="text-lg font-bold mt-1" style={{ color: rankConfig.color }}>
            {rankConfig.label} — Level {profile.level ?? 1}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            <Text className="text-lg">{arenaConfig.badge}</Text>
            <Text className="font-bold" style={{ color: arenaConfig.accent }}>
              {arenaConfig.label}
            </Text>
            <Text className="text-text-secondary">· {trophies} 🏆</Text>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={fadeStats.style}>
        <View className="flex-row gap-3 mb-4">
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">Level</Text>
            <Text className="text-white text-2xl font-bold">{profile.level ?? 1}</Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">XP</Text>
            <Text className="text-white text-2xl font-bold">{profile.xp ?? 0}</Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">Streak</Text>
            <Text className="text-white text-2xl font-bold">{profile.current_streak ?? 0}</Text>
          </View>
        </View>

        {/* Report */}
        <Pressable
          className="border border-surface-border rounded-xl py-3 items-center active:bg-surface-raised mt-4"
          onPress={() => router.push(`/(app)/report/${userId}`)}
        >
          <Text className="text-text-secondary text-sm">Report User</Text>
        </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
