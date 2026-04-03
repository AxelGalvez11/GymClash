import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGuestWorkoutStore, useWorkoutStore } from '@/stores/workout-store';
import { useAccent } from '@/stores/accent-store';
import { useNotificationStore } from '@/stores/notification-store';
import { CharacterDisplay } from '@/components/ui/CharacterDisplay';
import { Card } from '@/components/ui/Card';
import { StreakFlame } from '@/components/StreakFlame';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useProfile } from '@/hooks/use-profile';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useActiveWar, useMyClan } from '@/hooks/use-clan';
import { useDailyGoal } from '@/hooks/use-daily-goal';
import { usePlayerType } from '@/hooks/use-player-type';
import { useStreakMilestone } from '@/hooks/use-streak-milestone';
import { PlayerTypeBadge } from '@/components/PlayerTypeBadge';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { WorkoutTypeModal } from '@/components/WorkoutTypeModal';
import type { Rank as RankType, ArenaTier } from '@/types';

// ─── Victory Peak palette ───────────────────────────────
const VP = {
  surface:    '#0c0c1f',
  raised:     '#17172f',
  active:     '#1d1d37',
  highest:    '#23233f',
  textPri:    '#e5e3ff',
  textSec:    '#aaa8c3',
  textMuted:  '#74738b',
  primary:    '#ce96ff',
  primaryDim: '#a434ff',
  gold:       '#ffd709',
  cyan:       '#81ecff',
} as const;

const chromaticShadow = {
  shadowColor: VP.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  shadowOpacity: 0.15,
  elevation: 8,
} as const;

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
    <View
      className="bg-[#1d1d37] rounded-2xl p-3 flex-1"
      style={chromaticShadow}
    >
      <View className="flex-row items-center gap-1 mb-1">
        <FontAwesome name={icon} size={10} color={color ?? VP.textMuted} />
        <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: VP.textMuted, textTransform: 'uppercase' }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 20, color: '#ffffff', fontWeight: 'bold' }}>{value}</Text>
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
      className="bg-[#1d1d37] rounded-2xl p-4 flex-row items-center gap-3 active:scale-[0.98]"
      style={chromaticShadow}
      onPress={onPress}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center"
        style={{ backgroundColor: accentColor + '15' }}
      >
        <FontAwesome name={icon} size={16} color={accentColor} />
      </View>
      <View className="flex-1">
        <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: VP.textPri, fontWeight: 'bold' }}>{label}</Text>
        <Text style={{ color: VP.textMuted, fontSize: 12 }}>{subtitle}</Text>
      </View>
      <FontAwesome name="chevron-right" size={12} color={VP.textMuted} />
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
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { unreadCount } = useNotificationStore();
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
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color={accent.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Top bar: gradient bg, settings + coins */}
        <View
          className="flex-row items-center justify-between px-5 pt-2 pb-3"
          style={{ backgroundColor: VP.raised }}
        >
          <Pressable
            className="w-9 h-9 rounded-full bg-[#1d1d37] items-center justify-center active:scale-[0.98]"
            onPress={() => router.push('/(app)/settings/index' as any)}
          >
            <FontAwesome name="cog" size={16} color={VP.textSec} />
          </Pressable>

          <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 9, letterSpacing: 2, color: VP.gold }}>
            GYMCLASH
          </Text>

          <View className="flex-row items-center gap-3">
            {/* Notification bell */}
            <Pressable onPress={() => setShowNotifications(true)} className="relative active:scale-[0.98]">
              <FontAwesome name="bell" size={18} color={VP.textSec} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ef4444] items-center justify-center">
                  <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Lexend-SemiBold' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {profile?.gym_coins != null && (
              <View className="flex-row items-center gap-1.5 bg-[#23233f] rounded-full px-3 py-1.5">
                <FontAwesome name="circle" size={6} color={VP.gold} />
                <Text className="text-xs font-bold" style={{ color: '#ffffff' }}>{profile.gym_coins}</Text>
              </View>
            )}
            {profile?.gym_coins == null && <View className="w-9" />}
          </View>
        </View>

        {/* Guest banner */}
        {isGuest && (
          <Pressable
            className="mx-5 mb-3 bg-[#a434ff]/15 rounded-2xl p-4 active:scale-[0.98]"
            style={{ borderWidth: 1, borderColor: '#a434ff' }}
            onPress={() => router.push('/(auth)/login?mode=signup')}
          >
            <View className="flex-row items-center gap-3">
              <FontAwesome name="user-plus" size={18} color="#a434ff" />
              <View className="flex-1">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14 }}>
                  Create Account
                </Text>
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
                  {5 - guestWorkouts.length} guest workouts left · Sign up to unlock clans, wars, and leaderboards
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#a434ff" />
            </View>
          </Pressable>
        )}

        {/* Hero: character + radial glow + arena + trophies */}
        <Animated.View style={heroAnim.style} className="items-center px-5 pb-4">
          {/* Radial glow behind character */}
          <View
            className="absolute"
            style={{
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: VP.primary,
              opacity: 0.1,
              transform: [{ scale: 2 }],
              top: -60,
            }}
          />
          <CharacterDisplay
            level={profile?.level ?? 1}
            strengthCount={profile?.strength_workout_count ?? 0}
            scoutCount={profile?.scout_workout_count ?? 0}
            isWorkingOut={isWorkingOut}
            playerType={playerType}
            size="lg"
          />
          <Text className="text-lg font-bold mt-3" style={{ color: VP.textPri }}>
            {profile?.display_name || 'Warrior'}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <PlayerTypeBadge playerType={playerType} size="sm" />
            <Text style={{ color: VP.textMuted, fontSize: 12 }}>·</Text>
            <Text style={{ color: arenaConfig.accent, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
              {arenaConfig.badge} {arenaConfig.label}
            </Text>
            <Text style={{ color: VP.textMuted, fontSize: 12 }}>·</Text>
            <Text style={{ color: VP.gold, fontSize: 12 }}>{trophies} 🏆</Text>
          </View>

          {/* Trophy progress bar */}
          {(() => {
            const nextArena = Object.values(Arena).find((a) => a.minTrophies > trophies);
            if (!nextArena) return null;
            const progress = Math.min(100, ((trophies - arenaConfig.minTrophies) / (nextArena.minTrophies - arenaConfig.minTrophies)) * 100);
            return (
              <View className="w-full max-w-xs mt-3">
                <View className="h-1.5 bg-[#17172f] rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, backgroundColor: VP.primary }}
                  />
                </View>
                <Text className="text-center mt-1" style={{ fontSize: 9, fontFamily: 'Lexend-SemiBold', color: VP.textMuted }}>
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
            <View
              className="bg-[#1d1d37] rounded-2xl p-3 flex-1 items-center justify-center"
              style={chromaticShadow}
            >
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
                className="bg-danger/10 rounded-2xl p-3 mb-4 flex-row items-center gap-2 active:scale-[0.98]"
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
              className="mb-4 active:scale-[0.98]"
              onPress={() => router.push('/(app)/clan')}
            >
              <Card
                padding="lg"
                className="overflow-hidden bg-[#1d1d37] rounded-2xl"
                style={{ borderLeftWidth: 3, borderLeftColor: VP.primary, ...chromaticShadow }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: VP.primary + '15' }}
                  >
                    <FontAwesome name="shield" size={16} color={VP.primary} />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-sm" style={{ color: VP.textPri }}>{myClan.name}</Text>
                      <Text className="text-xs" style={{ color: VP.textMuted }}>[{myClan.tag}]</Text>
                    </View>
                    <Text className="text-xs" style={{ color: VP.textMuted }}>
                      {myClan.member_count} member{myClan.member_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={12} color={VP.textMuted} />
                </View>

                {/* Active war score line */}
                {activeWar && (() => {
                  const isClansA = myClan.id === activeWar.clan_a_id;
                  const myScore = isClansA ? activeWar.clan_a_score : activeWar.clan_b_score;
                  const opponentScore = isClansA ? activeWar.clan_b_score : activeWar.clan_a_score;
                  return (
                    <View
                      className="flex-row items-center justify-between mt-3 pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: VP.highest }}
                    >
                      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: VP.textMuted, textTransform: 'uppercase' }}>
                        War · Wk {activeWar.week_number}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs font-bold" style={{ color: '#ffffff' }}>{myScore?.total ?? 0}</Text>
                        <Text className="text-xs" style={{ color: VP.textMuted }}>vs</Text>
                        <Text className="text-xs font-bold" style={{ color: '#ffffff' }}>{opponentScore?.total ?? 0}</Text>
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
              className="rounded-2xl p-4 mb-4"
              style={{
                backgroundColor: dailyGoal.completed ? Colors.success + '08' : VP.active,
                borderLeftWidth: dailyGoal.completed ? 3 : 0,
                borderLeftColor: Colors.success,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: VP.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
                    Daily Goal
                  </Text>
                  <Text className="text-sm font-bold" style={{ color: VP.textPri }}>
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
                  <FontAwesome name="circle-o" size={18} color={VP.textMuted} />
                )}
              </View>
            </View>
          )}

          {/* Biodata prompt */}
          {workouts && workouts.length > 0 && profile && !profile.body_weight_kg && (
            <Pressable
              className="rounded-2xl p-3 mb-4 flex-row items-center gap-3 active:scale-[0.98]"
              style={{ backgroundColor: VP.primary + '10' }}
              onPress={() => router.push('/(app)/settings/biodata')}
            >
              <FontAwesome name="user-plus" size={14} color={VP.primary} />
              <View className="flex-1">
                <Text className="text-sm font-bold" style={{ color: VP.textPri }}>Personalize scores</Text>
                <Text className="text-xs" style={{ color: VP.textMuted }}>Add body data for fairer scoring</Text>
              </View>
              <FontAwesome name="chevron-right" size={10} color={VP.textMuted} />
            </Pressable>
          )}

          {/* INITIATE WORKOUT — primary CTA */}
          <Pressable
            className="rounded-[2rem] py-5 mb-5 items-center active:scale-[0.98]"
            style={{
              backgroundColor: VP.primary,
              shadowColor: VP.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 40,
              shadowOpacity: 0.4,
              elevation: 12,
            }}
            onPress={() => setShowWorkoutModal(true)}
          >
            <View className="flex-row items-center gap-3">
              <FontAwesome name="fire" size={24} color={VP.surface} />
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, fontWeight: '900', color: VP.surface, letterSpacing: -0.5, textTransform: 'uppercase' }}>
                INITIATE WORKOUT
              </Text>
            </View>
          </Pressable>

          {/* Clan war / no clan */}
          {!activeWar && !myClan && (
            <Pressable
              className="bg-[#1d1d37] rounded-2xl p-4 mb-5 flex-row items-center gap-3 active:scale-[0.98]"
              style={chromaticShadow}
              onPress={() => router.push('/(app)/clan')}
            >
              <FontAwesome name="shield" size={18} color={VP.primary} />
              <View className="flex-1">
                <Text className="font-bold text-sm" style={{ color: VP.textPri }}>No clan yet</Text>
                <Text className="text-xs" style={{ color: VP.textMuted }}>Find a Clan to compete</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={VP.textMuted} />
            </Pressable>
          )}

          {activeWar && (() => {
            const isClansA = myClan?.id === activeWar.clan_a_id;
            const myScore = isClansA ? activeWar.clan_a_score : activeWar.clan_b_score;
            const opponentScore = isClansA ? activeWar.clan_b_score : activeWar.clan_a_score;
            return (
              <View
                className="bg-[#1d1d37] rounded-2xl p-4 mb-5"
                style={chromaticShadow}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: VP.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
                  Clan War · Week {activeWar.week_number}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="items-center flex-1">
                    <Text className="text-xs" style={{ color: VP.textMuted }}>You</Text>
                    <Text className="text-2xl font-bold" style={{ color: '#ffffff' }}>{myScore?.total ?? 0}</Text>
                  </View>
                  <Text className="text-lg mx-3" style={{ color: VP.textMuted }}>vs</Text>
                  <View className="items-center flex-1">
                    <Text className="text-xs" style={{ color: VP.textMuted }}>Opp</Text>
                    <Text className="text-2xl font-bold" style={{ color: '#ffffff' }}>{opponentScore?.total ?? 0}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Recent workouts */}
          <Animated.View style={recentAnim.style}>
            {(!workouts || workouts.length === 0) && (
              <View className="bg-[#1d1d37] rounded-2xl p-6 items-center" style={chromaticShadow}>
                <Text className="text-2xl mb-2">💪</Text>
                <Text className="font-bold text-sm mb-1" style={{ color: VP.textPri }}>No workouts yet</Text>
                <Text className="text-xs text-center" style={{ color: VP.textMuted }}>
                  Log your first workout to start earning trophies
                </Text>
              </View>
            )}
            {workouts && workouts.length > 0 && (
              <>
                <View className="flex-row items-center justify-between mb-3">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 2, color: VP.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                    Recent
                  </Text>
                  <Pressable onPress={() => router.push('/(app)/history')}>
                    <Text className="text-xs" style={{ color: VP.primary }}>See all</Text>
                  </Pressable>
                </View>
                <View className="gap-2">
                  {workouts.map((w: any) => (
                    <View
                      key={w.id}
                      className="bg-[#1d1d37] rounded-2xl p-3 flex-row items-center"
                      style={chromaticShadow}
                    >
                      <FontAwesome
                        name={w.type === 'strength' ? 'heartbeat' : w.type === 'scout' ? 'road' : 'leaf'}
                        size={14}
                        color={w.type === 'strength' ? Colors.danger : w.type === 'scout' ? VP.cyan : Colors.success}
                      />
                      <View className="flex-1 ml-3">
                        <Text className="font-bold text-sm" style={{ color: VP.textPri }}>{w.type === 'active_recovery' ? 'Recovery' : w.type}</Text>
                        <Text className="text-xs" style={{ color: VP.textMuted }}>{new Date(w.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Text className="font-bold" style={{ color: '#ffffff' }}>
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
          <View className="bg-[#1d1d37] rounded-2xl p-8 items-center mx-8" style={chromaticShadow}>
            <Text className="text-4xl mb-3">{tier.emoji}</Text>
            <Text className="text-xl font-bold mb-1" style={{ color: VP.textPri }}>{tier.label} Streak!</Text>
            <Text className="text-sm text-center" style={{ color: VP.textMuted }}>
              {profile?.current_streak ?? 0} day streak — keep it up!
            </Text>
          </View>
        </Pressable>
      )}

      <WorkoutTypeModal
        visible={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        onSelectStrength={() => {
          setShowWorkoutModal(false);
          router.push('/(app)/workout/strength');
        }}
        onSelectCardio={() => {
          setShowWorkoutModal(false);
          router.push('/(app)/workout/scout');
        }}
      />

      <NotificationPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </SafeAreaView>
  );
}
