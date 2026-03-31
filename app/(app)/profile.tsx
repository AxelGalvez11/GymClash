import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useMy1RMRecords } from '@/hooks/use-1rm';
import type { Rank as RankType, ArenaTier } from '@/types';

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

  const rankKey = (profile?.rank ?? 'bronze') as RankType;
  const rankConfig = Rank[rankKey];
  const nextRank = Object.values(Rank).find((r) => r.minXp > (profile?.xp ?? 0));
  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier];

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Error', error.message);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={Colors.brand.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-4" contentContainerClassName="pb-8">
        {/* Profile Header */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-surface-overlay items-center justify-center mb-3">
            <FontAwesome name="user" size={32} color={Colors.text.secondary} />
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
                className="h-full bg-brand rounded-full"
                style={{ width: `${Math.min(100, ((profile?.xp ?? 0) / nextRank.minXp) * 100)}%` }}
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
                  <Text className="text-brand font-bold">{Math.round(r.best_estimated_1rm)} kg</Text>
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
              <Text className="text-brand text-sm font-bold">Season {season.number}</Text>
            </View>
            <Text className="text-text-muted text-xs">
              {Math.max(0, Math.ceil((new Date(season.ended_at).getTime() - Date.now()) / 86400000))} days left
            </Text>
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
            onPress={() => router.push('/(app)/settings/biodata')}
          >
            <FontAwesome name="sliders" size={18} color={Colors.text.secondary} />
            <Text className="text-white font-bold ml-3 flex-1">Body Data</Text>
            <Text className="text-text-muted text-xs mr-2">
              {profile?.body_weight_kg ? `${profile.body_weight_kg} kg` : 'Not set'}
            </Text>
            <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
          </Pressable>
        </View>

        {/* Sign Out */}
        <Pressable
          className="border border-danger rounded-xl py-3 items-center active:bg-danger/10"
          onPress={handleSignOut}
        >
          <Text className="text-danger font-bold">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
