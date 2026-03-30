import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import type { Rank as RankType } from '@/types';

export default function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();

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
      <View className="flex-1 px-4 pt-4">
        {/* Profile Header */}
        <View className="items-center mb-8">
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
        <View className="flex-row gap-3 mb-8">
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

        {/* Sign Out */}
        <Pressable
          className="border border-danger rounded-xl py-3 items-center active:bg-danger/10"
          onPress={handleSignOut}
        >
          <Text className="text-danger font-bold">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
