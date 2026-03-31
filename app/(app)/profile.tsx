import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import type { Rank as RankType } from '@/types';

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

function useMyCosmetics() {
  return useQuery({
    queryKey: ['my-cosmetics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('cosmetic_inventory')
        .select('*')
        .eq('user_id', user.id)
        .order('acquired_at', { ascending: false });
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: season } = useActiveSeason();
  const { data: cosmetics } = useMyCosmetics();

  const rankKey = (profile?.rank ?? 'bronze') as RankType;
  const rankConfig = Rank[rankKey];
  const nextRank = Object.values(Rank).find((r) => r.minXp > (profile?.xp ?? 0));

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
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
          <Text
            className="text-lg font-bold mt-1"
            style={{ color: rankConfig.color }}
          >
            {rankConfig.label} — Level {profile?.level ?? 1}
          </Text>
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
                style={{
                  width: `${Math.min(100, ((profile?.xp ?? 0) / nextRank.minXp) * 100)}%`,
                }}
              />
            </View>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Current Streak
            </Text>
            <Text className="text-white text-2xl font-bold">
              {profile?.current_streak ?? 0}
            </Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Best Streak
            </Text>
            <Text className="text-white text-2xl font-bold">
              {profile?.longest_streak ?? 0}
            </Text>
          </View>
        </View>

        {/* Season */}
        {season && (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-lg">
                {season.name}
              </Text>
              <Text className="text-brand text-sm font-bold">
                Season {season.number}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-muted text-xs">
                {new Date(season.started_at).toLocaleDateString()} –{' '}
                {new Date(season.ended_at).toLocaleDateString()}
              </Text>
              <Text className="text-text-secondary text-xs">
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(season.ended_at).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                )}{' '}
                days left
              </Text>
            </View>
          </View>
        )}

        {/* Cosmetics */}
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">Collection</Text>
          {cosmetics && cosmetics.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {cosmetics.map((c: any) => (
                <View
                  key={c.id}
                  className="bg-surface-raised border border-surface-border rounded-xl p-3 items-center"
                  style={{ width: 80 }}
                >
                  <FontAwesome
                    name={
                      c.cosmetic_type === 'badge'
                        ? 'certificate'
                        : c.cosmetic_type === 'title'
                        ? 'tag'
                        : c.cosmetic_type === 'theme'
                        ? 'paint-brush'
                        : 'flag'
                    }
                    size={24}
                    color={Colors.brand.light}
                  />
                  <Text className="text-text-secondary text-xs mt-1 text-center" numberOfLines={1}>
                    {c.cosmetic_id}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-surface-raised border border-surface-border rounded-xl p-4">
              <Text className="text-text-muted text-center">
                No cosmetics yet. Complete seasons and achievements to earn rewards.
              </Text>
            </View>
          )}
        </View>

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
