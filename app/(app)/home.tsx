import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGuestWorkoutStore, useWorkoutStore } from '@/stores/workout-store';
import { useAccent } from '@/stores/accent-store';
import { CharacterDisplay } from '@/components/ui/CharacterDisplay';
import { Card } from '@/components/ui/Card';
import { StreakFlame } from '@/components/StreakFlame';
import { useProfile } from '@/hooks/use-profile';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useActiveWar, useMyClan } from '@/hooks/use-clan';
import { useDailyGoal } from '@/hooks/use-daily-goal';
import { usePlayerType } from '@/hooks/use-player-type';
import { useStreakMilestone } from '@/hooks/use-streak-milestone';
import { PlayerTypeBadge } from '@/components/PlayerTypeBadge';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import type { Rank as RankType, ArenaTier } from '@/types';

// ─── Sub-Components ─────────────────────────────────────

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
        <FontAwesome name={icon} size={10} color={color ?? Colors.text.muted} />
        <Text className="text-text-muted text-xs uppercase" style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1 }}>
          {label}
        </Text>
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
  accentColor: string;
}) {
  return (
    <Pressable
      className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center gap-3 active:opacity-70"
      onPress={onPress}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: accentColor + '15' }}
      >
        <FontAwesome name={icon} size={16} color={accentColor} />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm">{label}</Text>
        <Text className="text-text-muted text-xs">{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={12} color={Colors.text.muted} />
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const accent = useAccent();
  const { isGuest } = useAuthStore();
  const { guestWorkouts } = useGuestWorkoutStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workouts } = useMyWorkouts(3);
  const { data: activeWar } = useActiveWar();
  const { data: myClan } = useMyClan();
  const { data: dailyGoal } = useDailyGoal();
  const { isActive: isWorkingOut } = useWorkoutStore();
  const { playerType } = usePlayerType();
  const { isMilestone, tier } = useStreakMilestone(profile?.current_streak ?? 0);
  const [showMilestone, setShowMilestone] = useState(false);
  const prevMilestoneRef = useRef(false);

  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier] ?? Arena.rustyard;
  const rankKey = (profile?.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;

  // Streak milestone celebration
  useEffect(() => {
    if (isMilestone && !prevMilestoneRef.current) {
      setShowMilestone(true);
    }
    prevMilestoneRef.current = isMilestone;
  }, [isMilestone]);

  // Section animations
  const heroAnim = useFadeSlide(0);
  const statsAnim = useFadeSlide(100);
  const actionsAnim = useFadeSlide(200);
  const recentAnim = useFadeSlide(300);

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={accent.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Top bar: settings + coins */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <Pressable
            className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center active:opacity-60"
            onPress={() => router.push('/(app)/settings' as any)}
          >
            <FontAwesome name="cog" size={16} color={Colors.text.secondary} />
          </Pressable>

          <Text className="text-white/40" style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 2 }}>
            GYMCLASH
          </Text>

          {profile?.gym_coins != null && (
            <View className="flex-row items-center gap-1.5 bg-surface-raised rounded-full px-3 py-1.5">
              <FontAwesome name="circle" size={6} color={Colors.warning} />
              <Text className="text-white text-xs font-bold">{profile.gym_coins}</Text>
            </View>
          )}
          {profile?.gym_coins == null && <View className="w-9" />}
        </View>

        {/* Guest banner */}
        {isGuest && (
          <Pressable
            className="mx-5 mb-3 rounded-xl py-2.5 items-center active:opacity-70"
            style={{ backgroundColor: accent.DEFAULT + '15', borderWidth: 0.5, borderColor: accent.DEFAULT + '30' }}
            onPress={() => router.push('/(auth)/login?mode=signup')}
          >
            <Text className="text-xs font-bold" style={{ color: accent.DEFAULT, fontFamily: 'SpaceMono', letterSpacing: 1 }}>
              GUEST · {5 - guestWorkouts.length} WORKOUTS LEFT
            </Text>
          </Pressable>
        )}

        {/* Hero: character + arena + trophies */}
        <Animated.View style={heroAnim.style} className="items-center px-5 pb-4">
          <CharacterDisplay
            level={profile?.level ?? 1}
            strengthCount={profile?.strength_workout_count ?? 0}
            scoutCount={profile?.scout_workout_count ?? 0}
            isWorkingOut={isWorkingOut}
            playerType={playerType}
            size="lg"
          />
          <Text className="text-white text-lg font-bold mt-3">
            {profile?.display_name || 'Warrior'}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <PlayerTypeBadge playerType={playerType} size="sm" />
            <Text className="text-text-muted text-xs">·</Text>
            <Text style={{ color: arenaConfig.accent, fontFamily: 'SpaceMono', fontSize: 11 }}>
              {arenaConfig.badge} {arenaConfig.label}
            </Text>
            <Text className="text-text-muted text-xs">·</Text>
            <Text className="text-white/70 text-xs">{trophies} 🏆</Text>
          </View>

          {/* Trophy progress bar */}
          {(() => {
            const nextArena = Object.values(Arena).find((a) => a.minTrophies > trophies);
            if (!nextArena) return null;
            const progress = Math.min(100, ((trophies - arenaConfig.minTrophies) / (nextArena.minTrophies - arenaConfig.minTrophies)) * 100);
            return (
              <View className="w-full max-w-xs mt-3">
                <View className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: accent.DEFAULT }}
                  />
                </View>
                <Text className="text-text-muted text-center mt-1" style={{ fontSize: 9, fontFamily: 'SpaceMono' }}>
                  {nextArena.minTrophies - trophies} to {nextArena.label}
                </Text>
              </View>
            );
          })()}
        </Animated.View>

        <View className="px-5">
          {/* Stats row */}
          <Animated.View style={statsAnim.style} className="flex-row gap-2 mb-4">
            <StatCard label="Rank" value={rankConfig.label} icon="shield" color={rankConfig.color} />
            <StatCard label="Level" value={String(profile?.level ?? 1)} icon="star" />
            <View className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-1 items-center justify-center">
              <StreakFlame count={profile?.current_streak ?? 0} size="md" />
            </View>
          </Animated.View>

          {/* Flagged workout alert */}
          {!isGuest && workouts && (() => {
            const flagged = workouts.filter((w: any) =>
              ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(w.validation_status)
            );
            if (flagged.length === 0) return null;
            return (
              <Pressable
                className="bg-danger/10 border border-danger/20 rounded-xl p-3 mb-4 flex-row items-center gap-2 active:opacity-70"
                onPress={() => router.push(`/(app)/review/${flagged[0].id}` as any)}
              >
                <FontAwesome name="exclamation-triangle" size={14} color={Colors.danger} />
                <Text className="text-danger text-xs font-bold flex-1">
                  {flagged.length} workout{flagged.length > 1 ? 's' : ''} flagged
                </Text>
                <FontAwesome name="chevron-right" size={10} color={Colors.danger} />
              </Pressable>
            );
          })()}

          {/* Clan info card — shown when user is in a clan */}
          {myClan && (
            <Pressable
              className="mb-4 active:opacity-70"
              onPress={() => router.push('/(app)/clan')}
            >
              <Card
                padding="lg"
                className="overflow-hidden"
                style={{ borderLeftWidth: 3, borderLeftColor: accent.DEFAULT }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: accent.DEFAULT + '15' }}
                  >
                    <FontAwesome name="shield" size={16} color={accent.DEFAULT} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white font-bold text-sm">{myClan.name}</Text>
                      <Text className="text-text-muted text-xs">[{myClan.tag}]</Text>
                    </View>
                    <Text className="text-text-muted text-xs">
                      {myClan.member_count} member{myClan.member_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={Colors.text.muted} />
                </View>

                {/* Active war score line */}
                {activeWar && (() => {
                  const isClansA = myClan.id === activeWar.clan_a_id;
                  const myScore = isClansA ? activeWar.clan_a_score : activeWar.clan_b_score;
                  const opponentScore = isClansA ? activeWar.clan_b_score : activeWar.clan_a_score;
                  return (
                    <View
                      className="flex-row items-center justify-between mt-3 pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: Colors.surface.border }}
                    >
                      <Text className="text-text-muted text-xs uppercase" style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1 }}>
                        War · Wk {activeWar.week_number}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-white text-xs font-bold">{myScore?.total ?? 0}</Text>
                        <Text className="text-text-muted text-xs">vs</Text>
                        <Text className="text-white text-xs font-bold">{opponentScore?.total ?? 0}</Text>
                      </View>
                    </View>
                  );
                })()}
              </Card>
            </Pressable>
          )}

          {/* Daily goal */}
          {dailyGoal && (
            <View
              className="rounded-xl p-4 mb-4 border"
              style={{
                borderColor: dailyGoal.completed ? Colors.success + '30' : accent.DEFAULT + '20',
                backgroundColor: dailyGoal.completed ? Colors.success + '08' : 'transparent',
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-text-muted text-xs uppercase mb-1" style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1 }}>
                    Daily Goal
                  </Text>
                  <Text className="text-white text-sm font-bold">
                    {dailyGoal.goal_type === 'strength_intensity'
                      ? `Hit ${Math.round((dailyGoal.goal_metadata?.threshold_pct ?? 0.8) * 100)}% of your ${dailyGoal.goal_metadata?.exercise ?? ''} 1RM`
                      : 'Complete any workout today'}
                  </Text>
                </View>
                {dailyGoal.completed ? (
                  <View className="bg-success/20 rounded-full px-3 py-1">
                    <Text className="text-success font-bold text-xs">+6 🏆</Text>
                  </View>
                ) : (
                  <FontAwesome name="circle-o" size={18} color={Colors.text.muted} />
                )}
              </View>
            </View>
          )}

          {/* Biodata prompt */}
          {workouts && workouts.length > 0 && profile && !profile.body_weight_kg && (
            <Pressable
              className="rounded-xl p-3 mb-4 flex-row items-center gap-3 active:opacity-70"
              style={{ backgroundColor: accent.DEFAULT + '10', borderWidth: 0.5, borderColor: accent.DEFAULT + '25' }}
              onPress={() => router.push('/(app)/settings/biodata')}
            >
              <FontAwesome name="user-plus" size={14} color={accent.DEFAULT} />
              <View className="flex-1">
                <Text className="text-white text-sm font-bold">Personalize scores</Text>
                <Text className="text-text-muted text-xs">Add body data for fairer scoring</Text>
              </View>
              <FontAwesome name="chevron-right" size={10} color={Colors.text.muted} />
            </Pressable>
          )}

          {/* Quick actions */}
          <Animated.View style={actionsAnim.style}>
            <Text className="text-white text-sm font-bold mb-3 uppercase" style={{ fontFamily: 'SpaceMono', letterSpacing: 2, fontSize: 10 }}>
              Train
            </Text>
            <View className="gap-2 mb-5">
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
            </View>
          </Animated.View>

          {/* Clan war / no clan */}
          {!activeWar && !myClan && (
            <Pressable
              className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-5 flex-row items-center gap-3 active:opacity-70"
              onPress={() => router.push('/(app)/clan')}
            >
              <FontAwesome name="shield" size={18} color={accent.DEFAULT} />
              <View className="flex-1">
                <Text className="text-white font-bold text-sm">No clan yet</Text>
                <Text className="text-text-muted text-xs">Find a Clan to compete</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={Colors.text.muted} />
            </Pressable>
          )}

          {activeWar && (() => {
            const isClansA = myClan?.id === activeWar.clan_a_id;
            const myScore = isClansA ? activeWar.clan_a_score : activeWar.clan_b_score;
            const opponentScore = isClansA ? activeWar.clan_b_score : activeWar.clan_a_score;
            return (
              <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-5">
                <Text className="text-text-muted text-xs uppercase mb-2" style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1 }}>
                  Clan War · Week {activeWar.week_number}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-text-muted text-xs">You</Text>
                    <Text className="text-white text-2xl font-bold">{myScore?.total ?? 0}</Text>
                  </View>
                  <Text className="text-text-muted text-lg mx-3">vs</Text>
                  <View className="items-center flex-1">
                    <Text className="text-text-muted text-xs">Opp</Text>
                    <Text className="text-white text-2xl font-bold">{opponentScore?.total ?? 0}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Recent workouts */}
          <Animated.View style={recentAnim.style}>
            {(!workouts || workouts.length === 0) && (
              <View className="bg-surface-raised border border-surface-border rounded-xl p-6 items-center">
                <Text className="text-2xl mb-2">💪</Text>
                <Text className="text-white font-bold text-sm mb-1">No workouts yet</Text>
                <Text className="text-text-muted text-xs text-center">
                  Log your first workout to start earning trophies
                </Text>
              </View>
            )}
            {workouts && workouts.length > 0 && (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white text-sm font-bold uppercase" style={{ fontFamily: 'SpaceMono', letterSpacing: 2, fontSize: 10 }}>
                    Recent
                  </Text>
                  <Pressable onPress={() => router.push('/(app)/history')}>
                    <Text className="text-xs" style={{ color: accent.DEFAULT }}>See all</Text>
                  </Pressable>
                </View>
                <View className="gap-2">
                  {workouts.map((w: any) => (
                    <View
                      key={w.id}
                      className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center"
                    >
                      <FontAwesome
                        name={w.type === 'strength' ? 'heartbeat' : w.type === 'scout' ? 'road' : 'leaf'}
                        size={14}
                        color={w.type === 'strength' ? Colors.danger : w.type === 'scout' ? Colors.info : Colors.success}
                      />
                      <View className="flex-1 ml-3">
                        <Text className="text-white font-bold text-sm">{w.type === 'active_recovery' ? 'Recovery' : w.type}</Text>
                        <Text className="text-text-muted text-xs">{new Date(w.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text className="text-white font-bold">
                        {w.final_score != null ? Math.round(w.final_score) : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Streak milestone celebration */}
      <ConfettiBurst
        visible={showMilestone}
        onComplete={() => setShowMilestone(false)}
      />
      {showMilestone && (
        <Pressable
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000 }}
          onPress={() => setShowMilestone(false)}
        >
          <View className="bg-surface-raised rounded-2xl p-8 items-center mx-8 border border-surface-border">
            <Text className="text-4xl mb-3">{tier.emoji}</Text>
            <Text className="text-white text-xl font-bold mb-1">{tier.label} Streak!</Text>
            <Text className="text-text-muted text-sm text-center">
              {profile?.current_streak ?? 0} day streak — keep it up!
            </Text>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
