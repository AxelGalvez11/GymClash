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
        {/* Top bar: settings cog only */}
        <View
          className="flex-row items-center justify-between px-5 pt-2 pb-3"
          style={{ backgroundColor: VP.raised }}
        >
          <Pressable
            className="w-11 h-11 rounded-full bg-[#1d1d37] items-center justify-center active:scale-[0.98]"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => router.push('/(app)/settings/index' as any)}
          >
            <FontAwesome name="cog" size={18} color={VP.textSec} />
          </Pressable>

          <Pressable
            className="w-11 h-11 rounded-full bg-[#1d1d37] items-center justify-center active:scale-[0.98]"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setShowMilestones(true)}
          >
            <FontAwesome name="trophy" size={16} color="#ffd709" />
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
        <Animated.View style={heroAnim.style} className="items-center px-5 pt-4 pb-2">
          <Animated.Text
            style={{
              fontFamily: 'Epilogue-Bold',
              fontSize: 28,
              letterSpacing: 6,
              color: '#ffd709',
              textShadowColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255,215,9,0.3)', 'rgba(255,215,9,0.8)'],
              }),
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 24],
              }),
            }}
          >
            GYMCLASH
          </Animated.Text>
        </Animated.View>

        <View className="px-5">
          {/* 1. Name */}
          <Animated.View style={statsAnim.style} className="items-center mb-2">
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: VP.textPri }}>
              {displayName}
            </Text>
          </Animated.View>

          {/* 2. Trophy count with icon */}
          <Animated.View style={statsAnim.style} className="flex-row items-center justify-center gap-2 mb-1">
            <FontAwesome name="trophy" size={16} color={VP.gold} />
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 18, color: VP.gold }}>
              {trophies}
            </Text>
          </Animated.View>

          {/* 3. Player level */}
          <Animated.View style={statsAnim.style} className="items-center mb-5">
            <View className="flex-row items-center gap-1.5">
              <FontAwesome name="star" size={12} color={VP.primary} />
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 13, color: VP.textSec }}>
                Level {profile?.level ?? 1}
              </Text>
            </View>
          </Animated.View>

          {/* 4. Currency badges — lifting, cardio, diamonds */}
          <Animated.View style={statsAnim.style} className="flex-row gap-2 mb-4">
            <CurrencyBadge label="Lifting" value={liftingPoints} icon="heartbeat" color={Colors.danger} />
            <CurrencyBadge label="Cardio" value={cardioPoints} icon="road" color={VP.cyan} />
            <CurrencyBadge label="Diamonds" value={diamondPoints} icon="diamond" color={VP.gold} />
          </Animated.View>

          {/* 5. Arena Progression */}
          <Animated.View style={arenaAnim.style}>
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

          {/* 7. INITIATE WORKOUT — primary CTA */}
          <Animated.View style={ctaAnim.style}>
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
