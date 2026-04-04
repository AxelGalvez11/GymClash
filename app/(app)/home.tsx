import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Arena, getArenaTier } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGuestWorkoutStore, useWorkoutStore } from '@/stores/workout-store';
import { useAccent } from '@/stores/accent-store';
import { NotificationPanel } from '@/components/NotificationPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useProfile } from '@/hooks/use-profile';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useMyClan } from '@/hooks/use-clan';
import { useStreakMilestone } from '@/hooks/use-streak-milestone';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { WorkoutTypeModal } from '@/components/WorkoutTypeModal';
import type { ArenaTier } from '@/types';

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

// ─── Currency Badge ─────────────────────────────────────
function CurrencyBadge({
  label,
  value,
  icon,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly color: string;
}) {
  return (
    <View
      className="bg-[#1d1d37] rounded-2xl p-3 flex-1 items-center"
      style={chromaticShadow}
    >
      <FontAwesome name={icon} size={16} color={color} />
      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 18, color: '#ffffff', marginTop: 4 }}>
        {value}
      </Text>
      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 8, letterSpacing: 1, color: VP.textMuted, textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Compute next arena threshold ───────────────────────
function getNextArenaThreshold(currentTrophies: number): number {
  const arenas = Object.values(Arena);
  const next = arenas.find((a) => a.minTrophies > currentTrophies);
  return next?.minTrophies ?? arenas[arenas.length - 1].minTrophies;
}

// ─── Main Screen ────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const accent = useAccent();
  const { isGuest } = useAuthStore();
  const { guestWorkouts } = useGuestWorkoutStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: workouts } = useMyWorkouts(3);
  const { data: myClan } = useMyClan();
  const { isActive: isWorkingOut } = useWorkoutStore();
  const { isMilestone, tier } = useStreakMilestone(profile?.current_streak ?? 0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showArenaInfo, setShowArenaInfo] = useState(false);
  const prevMilestoneRef = useRef(false);

  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier] ?? Arena.rustyard;
  const nextArenaThreshold = getNextArenaThreshold(trophies);

  // Currency values — lifting/cardio derived from workout counts, diamonds from gym_coins
  const liftingPoints = profile?.strength_workout_count ?? 0;
  const cardioPoints = profile?.scout_workout_count ?? 0;
  const diamondPoints = profile?.gym_coins ?? 0;

  // Display name
  const displayName = isGuest ? 'Guest' : (profile?.display_name || 'Warrior');

  // Streak milestone celebration
  useEffect(() => {
    if (isMilestone && !prevMilestoneRef.current) {
      setShowMilestone(true);
    }
    prevMilestoneRef.current = isMilestone;
  }, [isMilestone]);

  // Pulsing glow on GYMCLASH title
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, [glowAnim]);

  // Section animations
  const heroAnim = useFadeSlide(0);
  const statsAnim = useFadeSlide(100);
  const arenaAnim = useFadeSlide(200);
  const ctaAnim = useFadeSlide(300);

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
        {/* Top bar: currency pills + settings cog */}
        <View
          className="flex-row items-center justify-between px-4 pt-2 pb-3"
          style={{ backgroundColor: VP.raised }}
        >
          {/* Currency pills */}
          <View className="flex-row items-center gap-2 flex-1">
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}>
              <FontAwesome name="heart" size={12} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>{liftingPoints}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(129,236,255,0.15)', borderWidth: 1, borderColor: 'rgba(129,236,255,0.3)' }}>
              <FontAwesome name="fire" size={12} color="#81ecff" />
              <Text style={{ color: '#81ecff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>{cardioPoints}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(206,150,255,0.15)', borderWidth: 1, borderColor: 'rgba(206,150,255,0.3)' }}>
              <FontAwesome name="diamond" size={12} color="#ce96ff" />
              <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>{diamondPoints}</Text>
            </View>
          </View>

          <Pressable
            className="w-10 h-10 rounded-full bg-[#1d1d37] items-center justify-center active:scale-[0.98]"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.push('/(app)/settings' as any)}
          >
            <FontAwesome name="cog" size={16} color={VP.textSec} />
          </Pressable>
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

        {/* GYMCLASH logo — big + glowing */}
        <Animated.View style={heroAnim.style} className="items-center px-5 pt-6 pb-1">
          <Animated.Text
            style={{
              fontFamily: 'Epilogue-Bold',
              fontSize: 38,
              letterSpacing: 8,
              color: '#ffd709',
              textShadowColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,215,9,0.4)', 'rgba(255,215,9,1)'],
              }),
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 32],
              }),
            }}
          >
            GYM CLASH
          </Animated.Text>
        </Animated.View>

        <View className="px-5">
          {/* Username + Level */}
          <Animated.View style={statsAnim.style} className="items-center mb-1 mt-2">
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: VP.textPri }}>
              {displayName}
            </Text>
          </Animated.View>

          <Animated.View style={statsAnim.style} className="items-center mb-5">
            <View className="flex-row items-center gap-1.5">
              <FontAwesome name="star" size={12} color={VP.primary} />
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 13, color: VP.textSec }}>
                Level {profile?.level ?? 1}
              </Text>
            </View>
          </Animated.View>

          {/* 5. Arena Progression */}
          <Animated.View style={arenaAnim.style}>
            <Pressable onPress={() => setShowArenaInfo(true)} className="active:scale-[0.98]">
              <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
                    {arenaConfig.badge} {arenaConfig.label}
                  </Text>
                  <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
                    {trophies} / {nextArenaThreshold} trophies
                  </Text>
                </View>
                <ProgressBar current={trophies} max={nextArenaThreshold} color={VP.primary} height="md" />
              </View>
            </Pressable>
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

          {/* Daily Challenges */}
          <Animated.View style={ctaAnim.style}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 10, paddingHorizontal: 4 }}>
              Daily Challenges
            </Text>
            <View className="flex-row gap-2 mb-5">
              {[
                { name: 'Push-Up Power', progress: 25, goal: 50, color: '#ef4444' },
                { name: 'Squat Master', progress: 10, goal: 30, color: '#a434ff' },
                { name: 'Plank Pro', progress: 90, goal: 300, color: '#81ecff' },
              ].map((c) => (
                <View key={c.name} className="flex-1 bg-[#1d1d37] rounded-xl p-3" style={{ borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
                  <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 4 }}>{c.name}</Text>
                  <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 9, marginBottom: 6 }}>
                    ({c.progress}/{c.goal})
                  </Text>
                  <View className="h-1.5 rounded-full bg-[#23233f] overflow-hidden">
                    <View className="h-1.5 rounded-full" style={{ width: `${Math.min((c.progress / c.goal) * 100, 100)}%`, backgroundColor: c.color }} />
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* INITIATE WORKOUT — primary CTA */}
          <Animated.View style={ctaAnim.style}>
            <Pressable
              className="rounded-[2rem] py-5 mb-5 items-center active:scale-[0.98]"
              style={{
                backgroundColor: '#7c3aed',
                shadowColor: '#81ecff',
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 20,
                shadowOpacity: 0.3,
                elevation: 12,
                borderWidth: 1,
                borderColor: 'rgba(129,236,255,0.3)',
              }}
              onPress={() => setShowWorkoutModal(true)}
            >
              <View className="flex-row items-center gap-3">
                <FontAwesome name="fire" size={22} color="#81ecff" />
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 20, color: '#ffffff', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Initiate Workout
                </Text>
              </View>
            </Pressable>
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

      <Modal visible={showArenaInfo} animationType="slide" transparent>
        <View className="flex-1 bg-[rgba(12,12,31,0.9)] justify-end">
          <View className="bg-[#1d1d37] rounded-t-2xl px-6 pt-6 pb-10 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 18 }}>The Arena System</Text>
              <Pressable onPress={() => setShowArenaInfo(false)}>
                <FontAwesome name="times" size={18} color="#74738b" />
              </Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, marginBottom: 16 }}>
                Climb through the arenas by earning trophies from workouts and clan wars. Your ultimate goal: reach The Colosseum and achieve Olympian rank!
              </Text>
              {[
                { name: 'Rustyard', trophies: '0-299', color: '#74738b', desc: 'Where every warrior begins. Prove yourself.' },
                { name: 'Iron Forge', trophies: '300-699', color: '#8b8b8b', desc: 'The grind starts here. Consistency is key.' },
                { name: 'Titan Vault', trophies: '700-1199', color: '#ce96ff', desc: 'Elite territory. Only the dedicated reach this.' },
                { name: 'The Colosseum', trophies: '1200+', color: '#ffd709', desc: 'The summit. Legends train here. Become Olympian.' },
              ].map((a) => (
                <View key={a.name} className="bg-[#23233f] rounded-xl p-4 mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text style={{ color: a.color, fontFamily: 'Epilogue-Bold', fontSize: 16 }}>{a.name}</Text>
                    <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>{a.trophies} 🏆</Text>
                  </View>
                  <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>{a.desc}</Text>
                </View>
              ))}
              <View className="bg-[#23233f] rounded-xl p-4 mt-2">
                <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 14, marginBottom: 4 }}>🏅 Become Olympian</Text>
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
                  Level up individually through consistent training. The highest rank — Olympian — is reserved for warriors who dominate both lifting and cardio.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMilestones} animationType="slide" transparent>
        <View className="flex-1 bg-[rgba(12,12,31,0.9)] justify-end">
          <View className="bg-[#1d1d37] rounded-t-2xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 18 }}>Milestones</Text>
              <Pressable onPress={() => setShowMilestones(false)}>
                <FontAwesome name="times" size={18} color="#74738b" />
              </Pressable>
            </View>
            <View className="gap-3">
              {[
                { label: 'First Workout', done: (workouts?.length ?? 0) > 0 },
                { label: 'Join a Clan', done: !!myClan },
                { label: '7-Day Streak', done: (profile?.current_streak ?? 0) >= 7 },
                { label: '10 Workouts', done: (workouts?.length ?? 0) >= 10 },
                { label: 'Win a Clan War', done: false },
              ].map((m) => (
                <View key={m.label} className="flex-row items-center gap-3 bg-[#23233f] rounded-xl p-3">
                  <FontAwesome name={m.done ? 'check-circle' : 'circle-o'} size={18} color={m.done ? '#22c55e' : '#74738b'} />
                  <Text style={{ color: m.done ? '#e5e3ff' : '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
