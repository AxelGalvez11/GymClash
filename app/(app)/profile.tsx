import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useMy1RMRecords } from '@/hooks/use-1rm';
import { CharacterDisplay } from '@/components/ui/CharacterDisplay';
import { useAccent } from '@/stores/accent-store';
import type { Rank as RankType, ArenaTier } from '@/types';

type AccountTier = 'unverified' | 'verified' | 'ranked_eligible';

function computeAccountTier(profile: any, workoutCount: number): AccountTier {
  const hasBiodata = profile?.body_weight_kg && profile?.height_cm && profile?.birth_date && profile?.biological_sex;
  if (!hasBiodata) return 'unverified';

  // Ranked-eligible: verified + 10 workouts + account age >= 14 days
  const accountAge = profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  if (workoutCount >= 10 && accountAge >= 14) return 'ranked_eligible';

  return 'verified';
}

const TIER_CONFIG: Record<AccountTier, { label: string; color: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }> = {
  unverified: { label: 'Unverified', color: Colors.text.muted, icon: 'circle-o' },
  verified: { label: 'Verified', color: Colors.success, icon: 'check-circle' },
  ranked_eligible: { label: 'Ranked', color: Colors.brand.DEFAULT, icon: 'star' },
};

function useActiveSeason() {
  return useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'active')
        .single();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: season } = useActiveSeason();
  const { data: records } = useMy1RMRecords();
  const { data: workouts } = useMyWorkouts(100);

  const accent = useAccent();
  const accountTier = computeAccountTier(profile, workouts?.length ?? 0);
  const tierConfig = TIER_CONFIG[accountTier];

  const rankKey = (profile?.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;
  const nextRank = Object.values(Rank).find((r) => r.minXp > (profile?.xp ?? 0));
  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier] ?? Arena.rustyard;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={accent.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-8">
        {/* Profile Header */}
        <View className="items-center mb-6">
          <View className="mb-3">
            <CharacterDisplay
              level={profile?.level ?? 1}
              strengthCount={profile?.strength_workout_count ?? 0}
              scoutCount={profile?.scout_workout_count ?? 0}
              size="lg"
            />
          </View>
          <Text className="text-white text-2xl font-bold">
            {profile?.display_name || 'Warrior'}
          </Text>
          <Text className="text-lg font-bold mt-1" style={{ color: rankConfig.color }}>
            {rankConfig.label} — Level {profile?.level ?? 1}
          </Text>
          {/* Arena badge */}
          <View className="flex-row items-center gap-2 mt-2">
            <Text className="text-lg">{arenaConfig.badge}</Text>
            <Text className="font-bold" style={{ color: arenaConfig.accent }}>
              {arenaConfig.label}
            </Text>
            <Text className="text-text-secondary">· {trophies} 🏆</Text>
          </View>
          {/* Account tier badge */}
          <Pressable
            className="flex-row items-center gap-1.5 mt-2 px-3 py-1 rounded-full border"
            style={{ borderColor: tierConfig.color + '40' }}
            onPress={accountTier === 'unverified'
              ? () => router.push('/(app)/settings/biodata')
              : undefined}
          >
            <FontAwesome name={tierConfig.icon} size={12} color={tierConfig.color} />
            <Text className="text-xs font-bold" style={{ color: tierConfig.color }}>
              {tierConfig.label}
            </Text>
            {accountTier === 'unverified' && (
              <Text className="text-text-muted text-xs"> — Complete biodata</Text>
            )}
          </Pressable>
        </View>

        {/* XP Progress */}
        {nextRank && (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-text-secondary text-sm">XP Progress</Text>
              <Text className="text-white text-sm font-bold">
                {profile?.xp ?? 0} / {nextRank.minXp}
              </Text>
            </View>
            <View className="h-3 bg-surface-overlay rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, ((profile?.xp ?? 0) / nextRank.minXp) * 100)}%`, backgroundColor: accent.DEFAULT }}
              />
            </View>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">Streak</Text>
            <Text className="text-white text-2xl font-bold">{profile?.current_streak ?? 0}</Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">Best</Text>
            <Text className="text-white text-2xl font-bold">{profile?.longest_streak ?? 0}</Text>
          </View>
        </View>

        {/* 1RM Records */}
        {records && records.length > 0 && (
          <View className="mb-4">
            <Text className="text-white text-lg font-bold mb-3">Personal Records</Text>
            <View className="gap-2">
              {records.slice(0, 5).map((r: any) => (
                <View key={r.id} className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center">
                  <FontAwesome name="trophy" size={14} color={Colors.warning} />
                  <Text className="text-white font-bold ml-3 flex-1">{r.exercise}</Text>
                  <Text className="text-white font-bold">{Math.round(r.best_estimated_1rm)} kg</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Season */}
        {season && (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white font-bold">{season.name}</Text>
              <Text className="text-white text-sm font-bold">Season {season.number}</Text>
            </View>
            <Text className="text-text-muted text-xs">
              {Math.max(0, Math.ceil((new Date(season.ended_at).getTime() - Date.now()) / 86400000))} days left
            </Text>
          </View>
        )}

        {/* Cardio Stats */}
        {(profile?.max_heart_rate || profile?.estimated_vo2max) && (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
            <Text className="text-white font-bold mb-2">Cardio Profile</Text>
            {profile?.max_heart_rate && (
              <View className="flex-row justify-between py-1">
                <Text className="text-text-secondary">Max Heart Rate</Text>
                <Text className="text-white font-bold">{profile.max_heart_rate} bpm</Text>
              </View>
            )}
            {profile?.estimated_vo2max && (
              <View className="flex-row justify-between py-1">
                <Text className="text-text-secondary">Est. VO2max</Text>
                <Text className="text-white font-bold">{Math.round(profile.estimated_vo2max * 10) / 10} ml/kg/min</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Links */}
        <View className="gap-2 mb-6">
          <Pressable
            className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center"
            onPress={() => router.push('/(app)/history')}
          >
            <FontAwesome name="history" size={18} color={Colors.text.secondary} />
            <Text className="text-white font-bold ml-3 flex-1">Workout History</Text>
            <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
          </Pressable>
          <Pressable
            className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center"
            onPress={() => router.push('/(app)/shop' as any)}
          >
            <FontAwesome name="shopping-bag" size={18} color={Colors.warning} />
            <Text className="text-white font-bold ml-3 flex-1">Shop</Text>
            <View className="flex-row items-center gap-1 mr-2">
              <FontAwesome name="circle" size={8} color={Colors.warning} />
              <Text className="text-white text-xs font-bold">{profile?.gym_coins ?? 0}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
          </Pressable>
          <Pressable
            className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center"
            onPress={() => router.push('/(app)/settings')}
          >
            <FontAwesome name="cog" size={18} color={Colors.text.secondary} />
            <Text className="text-white font-bold ml-3 flex-1">Settings</Text>
            <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
