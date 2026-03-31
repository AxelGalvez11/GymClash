import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useActiveWar } from '@/hooks/use-clan';
import { useDailyGoal } from '@/hooks/use-daily-goal';
import type { Rank as RankType, ArenaTier } from '@/types';

function ArenaHeader({ tier, trophies }: { tier: ArenaTier; trophies: number }) {
  const arenaConfig = Arena[tier];
  const nextArena = Object.values(Arena).find((a) => a.minTrophies > trophies);

  return (
    <View className="items-center py-4">
      <Text className="text-4xl">{arenaConfig.badge}</Text>
      <Text className="text-2xl font-bold mt-1" style={{ color: arenaConfig.accent }}>
        {arenaConfig.label}
      </Text>
      <View className="flex-row items-center gap-2 mt-1">
        <Text className="text-white text-lg font-bold">{trophies}</Text>
        <Text className="text-text-secondary text-sm">trophies</Text>
      </View>
      {nextArena && (
        <View className="w-full max-w-xs mt-2">
          <View className="h-2 bg-surface-overlay rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, ((trophies - arenaConfig.minTrophies) / (nextArena.minTrophies - arenaConfig.minTrophies)) * 100)}%`,
                backgroundColor: arenaConfig.accent,
              }}
            />
          </View>
          <Text className="text-text-muted text-xs text-center mt-1">
            {nextArena.minTrophies - trophies} to {nextArena.label}
          </Text>
        </View>
      )}
    </View>
  );
}

function DailyGoalCard({ goal }: { goal: any }) {
  if (!goal) return null;

  const isComplete = goal.completed;
  const goalLabel =
    goal.goal_type === 'strength_intensity'
      ? `Hit ${Math.round((goal.goal_metadata?.threshold_pct ?? 0.8) * 100)}% of your ${goal.goal_metadata?.exercise ?? ''} 1RM`
      : 'Complete any workout today';

  return (
    <View
      className="border rounded-xl p-4 mb-4"
      style={{
        borderColor: isComplete ? Colors.success + '60' : Colors.brand.DEFAULT + '40',
        backgroundColor: isComplete ? Colors.success + '10' : undefined,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-secondary text-xs uppercase mb-1">Daily Goal</Text>
          <Text className="text-white font-bold">{goalLabel}</Text>
        </View>
        {isComplete ? (
          <View className="bg-success/20 rounded-full px-3 py-1">
            <Text className="text-success font-bold text-xs">+6 🏆</Text>
          </View>
        ) : (
          <FontAwesome name="circle-o" size={20} color={Colors.text.muted} />
        )}
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color?: string;
}) {
  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-1">
      <View className="flex-row items-center gap-1 mb-1">
        <FontAwesome name={icon} size={12} color={color ?? Colors.text.secondary} />
        <Text className="text-text-secondary text-xs uppercase">{label}</Text>
      </View>
      <Text className="text-white text-xl font-bold">{value}</Text>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  subtitle,
  onPress,
  accentColor,
}: {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  subtitle: string;
  onPress: () => void;
  accentColor?: string;
}) {
  return (
    <Pressable
      className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center gap-3 active:opacity-80"
      onPress={onPress}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: (accentColor ?? Colors.brand.DEFAULT) + '20' }}
      >
        <FontAwesome name={icon} size={18} color={accentColor ?? Colors.brand.DEFAULT} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold">{label}</Text>
        <Text className="text-text-muted text-xs">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workouts } = useMyWorkouts(3);
  const { data: activeWar } = useActiveWar();
  const { data: dailyGoal } = useDailyGoal();

  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier];
  const rankKey = (profile?.rank ?? 'bronze') as RankType;
  const rankConfig = Rank[rankKey];

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={Colors.brand.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Arena Header with themed accent */}
        <View
          className="px-4 pb-4"
          style={{ borderBottomWidth: 2, borderBottomColor: arenaConfig.accent + '40' }}
        >
          <ArenaHeader tier={arenaTier} trophies={trophies} />
        </View>

        <View className="px-4 mt-4">
          {/* Stats Row */}
          <View className="flex-row gap-2 mb-4">
            <StatCard
              label="Rank"
              value={rankConfig.label}
              icon="shield"
              color={rankConfig.color}
            />
            <StatCard label="Level" value={String(profile?.level ?? 1)} icon="star" />
            <StatCard
              label="Streak"
              value={`${profile?.current_streak ?? 0}d`}
              icon="fire"
              color={Colors.warning}
            />
          </View>

          {/* Daily Goal */}
          <DailyGoalCard goal={dailyGoal} />

          {/* Quick Actions */}
          <Text className="text-white text-lg font-bold mb-3">Train</Text>
          <View className="gap-2 mb-6">
            <QuickAction
              label="Strength"
              icon="heartbeat"
              subtitle="Log sets, reps, and weight"
              onPress={() => router.push('/(app)/workout/strength')}
              accentColor={Colors.danger}
            />
            <QuickAction
              label="Run"
              icon="road"
              subtitle="Log distance and pace"
              onPress={() => router.push('/(app)/workout/scout')}
              accentColor={Colors.info}
            />
            <QuickAction
              label="Active Recovery"
              icon="leaf"
              subtitle="Stretching, yoga, mobility — maintain streak"
              onPress={() => router.push('/(app)/workout/recovery')}
              accentColor={Colors.success}
            />
          </View>

          {/* Daily goal complete message */}
          {dailyGoal?.completed && (
            <View className="bg-success/10 border border-success/30 rounded-xl p-4 mb-6">
              <Text className="text-success font-bold text-center">
                Daily goal complete! Rest up or keep training.
              </Text>
            </View>
          )}

          {/* Clan War */}
          {activeWar && (
            <>
              <Text className="text-white text-lg font-bold mb-3">Clan War</Text>
              <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-6">
                <Text className="text-text-secondary text-sm mb-2">
                  Week {activeWar.week_number}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-text-secondary text-xs">Your Clan</Text>
                    <Text className="text-white text-2xl font-bold">
                      {activeWar.clan_a_score?.total ?? activeWar.clan_b_score?.total ?? 0}
                    </Text>
                  </View>
                  <Text className="text-text-muted text-xl mx-4">vs</Text>
                  <View className="items-center flex-1">
                    <Text className="text-text-secondary text-xs">Opponent</Text>
                    <Text className="text-white text-2xl font-bold">
                      {activeWar.clan_b_score?.total ?? activeWar.clan_a_score?.total ?? 0}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}

          {/* Recent */}
          {workouts && workouts.length > 0 && (
            <>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-white text-lg font-bold">Recent</Text>
                <Pressable onPress={() => router.push('/(app)/history')}>
                  <Text className="text-brand text-sm">See all</Text>
                </Pressable>
              </View>
              <View className="gap-2">
                {workouts.map((w: any) => (
                  <View
                    key={w.id}
                    className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center"
                  >
                    <FontAwesome
                      name={
                        w.type === 'strength'
                          ? 'heartbeat'
                          : w.type === 'scout'
                          ? 'road'
                          : 'leaf'
                      }
                      size={16}
                      color={
                        w.type === 'strength'
                          ? Colors.danger
                          : w.type === 'scout'
                          ? Colors.info
                          : Colors.success
                      }
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-white font-bold capitalize">{w.type === 'active_recovery' ? 'Recovery' : w.type}</Text>
                      <Text className="text-text-muted text-xs">
                        {new Date(w.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-white font-bold">
                      {w.final_score != null ? Math.round(w.final_score) : '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
