import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useActiveWar } from '@/hooks/use-clan';
import type { Rank as RankType } from '@/types';

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}) {
  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1">
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name={icon} size={14} color={Colors.text.secondary} />
        <Text className="text-text-secondary text-xs uppercase">{label}</Text>
      </View>
      <Text className="text-white text-2xl font-bold">{value}</Text>
    </View>
  );
}

function QuickActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      className="bg-brand rounded-xl py-4 px-6 flex-row items-center justify-center gap-3 active:bg-brand-dark"
      onPress={onPress}
    >
      <FontAwesome name={icon} size={18} color="#fff" />
      <Text className="text-white text-base font-bold">{label}</Text>
    </Pressable>
  );
}

function WorkoutRow({
  type,
  date,
  score,
  status,
  workoutId,
}: {
  type: string;
  date: string;
  score: number | null;
  status: string;
  workoutId: string;
}) {
  const router = useRouter();
  const isFlagged = status === 'held_for_review' || status === 'rejected' || status === 'excluded_from_clan_score';

  return (
    <Pressable
      className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center"
      onPress={isFlagged ? () => router.push(`/(app)/review/${workoutId}`) : undefined}
    >
      <FontAwesome
        name={type === 'strength' ? 'heartbeat' : 'road'}
        size={18}
        color={Colors.brand.DEFAULT}
      />
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold capitalize">{type}</Text>
        <Text className="text-text-muted text-xs">{new Date(date).toLocaleDateString()}</Text>
      </View>
      <View className="items-end">
        <Text className="text-white font-bold">{score != null ? Math.round(score) : '—'}</Text>
        {isFlagged && (
          <Text className="text-warning text-xs">Flagged</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workouts, isLoading: workoutsLoading } = useMyWorkouts(5);
  const { data: activeWar } = useActiveWar();

  const rankKey = (profile?.rank ?? 'bronze') as RankType;
  const rankConfig = Rank[rankKey];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <View>
            <Text className="text-white text-2xl font-bold">Dashboard</Text>
            {profile && (
              <Text className="text-text-secondary text-sm">
                {profile.current_streak > 0
                  ? `${profile.current_streak} day streak 🔥`
                  : 'Start a streak today!'}
              </Text>
            )}
          </View>
          {profile && (
            <View className="rounded-full px-4 py-2" style={{ backgroundColor: rankConfig.color + '20' }}>
              <Text className="font-bold" style={{ color: rankConfig.color }}>
                {rankConfig.label}
              </Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        {profileLoading ? (
          <ActivityIndicator color={Colors.brand.DEFAULT} className="my-6" />
        ) : (
          <View className="flex-row gap-3 mb-6">
            <StatCard label="Level" value={String(profile?.level ?? 1)} icon="star" />
            <StatCard label="XP" value={String(profile?.xp ?? 0)} icon="bolt" />
            <StatCard label="Streak" value={String(profile?.current_streak ?? 0)} icon="fire" />
          </View>
        )}

        {/* Quick Actions */}
        <Text className="text-white text-lg font-bold mb-3">Start a Workout</Text>
        <View className="gap-3 mb-6">
          <QuickActionButton
            label="Log Strength Workout"
            icon="heartbeat"
            onPress={() => router.push('/(app)/workout/strength')}
          />
          <QuickActionButton
            label="Log Run"
            icon="road"
            onPress={() => router.push('/(app)/workout/scout')}
          />
        </View>

        {/* Clan War Status */}
        <Text className="text-white text-lg font-bold mb-3">Clan War</Text>
        {activeWar ? (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-6">
            <Text className="text-text-secondary text-sm mb-1">
              Weekly Battle — Week {activeWar.week_number}
            </Text>
            <View className="flex-row items-center justify-between">
              <View className="items-center flex-1">
                <Text className="text-white text-2xl font-bold">
                  {activeWar.clan_a_score?.total ?? 0}
                </Text>
              </View>
              <Text className="text-text-muted text-xl mx-4">vs</Text>
              <View className="items-center flex-1">
                <Text className="text-white text-2xl font-bold">
                  {activeWar.clan_b_score?.total ?? 0}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-6">
            <Text className="text-text-muted text-center py-2">
              Join a clan to participate in weekly wars
            </Text>
          </View>
        )}

        {/* Recent Activity */}
        <Text className="text-white text-lg font-bold mb-3">Recent Activity</Text>
        {workoutsLoading ? (
          <ActivityIndicator color={Colors.brand.DEFAULT} />
        ) : workouts && workouts.length > 0 ? (
          <View className="gap-2">
            {workouts.map((w: any) => (
              <WorkoutRow
                key={w.id}
                type={w.type}
                date={w.created_at}
                score={w.final_score}
                status={w.validation_status ?? w.status}
                workoutId={w.id}
              />
            ))}
          </View>
        ) : (
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4">
            <Text className="text-text-muted text-center py-4">
              No workouts logged yet. Start training!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
