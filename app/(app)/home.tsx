import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors, Arena, getArenaTier, Spacing, Radius } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGuestWorkoutStore, useWorkoutStore } from '@/stores/workout-store';
import { useAccent } from '@/stores/accent-store';
import { NotificationPanel } from '@/components/NotificationPanel';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ResourcePill } from '@/components/ui/ResourcePill';
import { MetricCard } from '@/components/ui/MetricCard';
import { useProfile } from '@/hooks/use-profile';
import { useEquippedCosmetics } from '@/hooks/use-equipped-cosmetics';
import { useEntrance } from '@/hooks/use-entrance';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useMyClan } from '@/hooks/use-clan';
import { useStreakMilestone } from '@/hooks/use-streak-milestone';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { usePressScale } from '@/hooks/use-press-scale';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import { WorkoutTypeModal } from '@/components/WorkoutTypeModal';
import type { ArenaTier } from '@/types';
import { CharacterDisplay3D } from '@/components/character/CharacterDisplay3D';

// ─── Palette (Victory Peak) — now pulls from theme Colors ──────────────────
const VP = {
  surface:     Colors.surface.DEFAULT,
  raised:      Colors.surface.container,
  active:      Colors.surface.containerHigh,
  highest:     Colors.surface.containerHighest,
  textPri:     Colors.text.primary,
  textSec:     Colors.text.secondary,
  textMuted:   Colors.text.muted,
  primary:     Colors.primary.DEFAULT,
  primaryDim:  Colors.primary.dim,
  gold:        Colors.secondary.DEFAULT,
  cyan:        Colors.tertiary.DEFAULT,
  error:       Colors.error.DEFAULT,
  tertiary:    Colors.tertiary.dim,
} as const;

// ─── Last Workout Stats Card ──────────────────────────────────────────────────
function LastWorkoutStatsCard({ workout }: { readonly workout: any }) {
  const durationMin = workout.duration_seconds
    ? Math.round(workout.duration_seconds / 60)
    : null;
  const score: number | null = workout.score ?? null;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(workout.created_at).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000);
    if (d >= 1) return `${d}d ago`;
    if (h >= 1) return `${h}h ago`;
    return 'Just now';
  })();

  return (
    <Card
      variant="default"
      style={{ marginBottom: 12, position: 'relative', overflow: 'hidden' }}
    >
      {/* Background icon watermark */}
      <View
        style={{
          position: 'absolute',
          right: -8,
          bottom: -8,
          opacity: 0.06,
        }}
        pointerEvents="none"
      >
        <FontAwesome name="bar-chart" size={80} color={VP.cyan} />
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: 'Epilogue-Bold',
            fontSize: 14,
            color: VP.textPri,
            fontStyle: 'italic',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Last Workout Stats
        </Text>
        <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.textMuted }}>
          {timeAgo}
        </Text>
      </View>

      {/* Stat trio */}
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {durationMin != null && (
          <View>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: VP.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
              Duration
            </Text>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: VP.cyan, fontStyle: 'italic' }}>
              {durationMin}m
            </Text>
          </View>
        )}
        {score != null && (
          <View>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: VP.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
              Power
            </Text>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: VP.cyan, fontStyle: 'italic' }}>
              {score}
            </Text>
          </View>
        )}
        <View>
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: VP.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>
            Type
          </Text>
          <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: VP.cyan, fontStyle: 'italic' }}>
            {workout.type === 'strength' ? '💪' : '🏃'}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ─── Helper: arena next threshold ────────────────────────────────────────────
function getNextArenaThreshold(currentTrophies: number): number {
  const arenas = Object.values(Arena);
  const next = arenas.find((a) => a.minTrophies > currentTrophies);
  return next?.minTrophies ?? arenas[arenas.length - 1].minTrophies;
}

// ─── Daily Quest Row ──────────────────────────────────────────────────────────
function QuestRow({
  done,
  label,
}: {
  readonly done: boolean;
  readonly label: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: done ? 1 : 0.55 }}>
      <FontAwesome
        name={done ? 'check-circle' : 'circle-o'}
        size={14}
        color={done ? VP.gold : VP.textMuted}
      />
      <Text
        style={{
          fontFamily: 'BeVietnamPro-Regular',
          fontSize: 12,
          color: done ? VP.textPri : VP.textSec,
          textDecorationLine: done ? 'line-through' : 'none',
          flex: 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const accent = useAccent();
  const { isGuest } = useAuthStore();
  const { guestWorkouts } = useGuestWorkoutStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: equippedCosmetics = [] } = useEquippedCosmetics();
  const { data: workouts } = useMyWorkouts(3);
  const { data: myClan } = useMyClan();
  const { isActive: isWorkingOut } = useWorkoutStore();
  const { isMilestone, tier } = useStreakMilestone(profile?.current_streak ?? 0);
  const [showMilestone, setShowMilestone] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showArenaInfo, setShowArenaInfo] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const prevMilestoneRef = useRef(false);

  const trophies        = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig     = Arena[arenaTier] ?? Arena.sweat_zone;
  const nextArenaThreshold = getNextArenaThreshold(trophies);

  const liftingPoints  = profile?.strength_workout_count ?? 0;
  const cardioPoints   = profile?.scout_workout_count ?? 0;
  const diamondPoints  = profile?.gym_coins ?? 0;

  const todayStr       = new Date().toDateString();
  const todayWorkouts  = (workouts ?? []).filter(
    (w) => new Date(w.created_at).toDateString() === todayStr,
  );
  const todayScout     = todayWorkouts.filter((w) => w.type === 'scout').length;
  const todayStrength  = todayWorkouts.filter((w) => w.type === 'strength').length;
  const todayAny       = todayWorkouts.length;

  const displayName    = isGuest ? 'Guest' : (profile?.display_name || 'Warrior');
  const userLevel      = profile?.level ?? 1;
  const xpCurrent      = profile?.xp ?? 0;
  const xpMax          = (userLevel * 100) + 100;
  const xpPct          = Math.min(xpCurrent / xpMax, 1);

  const questsDone     = [todayScout >= 1, todayStrength >= 1, todayAny >= 1].filter(Boolean).length;
  const questsTotal    = 3;

  // Streak milestone celebration trigger
  useEffect(() => {
    if (isMilestone && !prevMilestoneRef.current) {
      setShowMilestone(true);
    }
    prevMilestoneRef.current = isMilestone;
  }, [isMilestone]);

  // ── Entrance animations ──
  const topBarEntrance    = useEntrance(0,   'fade-slide', 280);
  const heroEntrance      = useEntrance(60,  'fade-slide', 320);
  const leftColEntrance   = useEntrance(80,  'fade-slide', 280);
  const rightColEntrance  = useEntrance(100, 'fade-slide', 280);
  const ctaEntrance       = useEntrance(140, 'fade-slide', 280);
  const bentoEntrance     = useEntrance(180, 'fade-slide', 280);

  // ── Glow pulse on CTA wrapper ──
  const { glowStyle: ctaGlow } = useGlowPulse(VP.primary, 0.25, 0.55, 2400);

  // ── CTA press-scale ──
  const ctaPress = usePressScale(0.95);

  // ── Flagged workouts ──
  const flaggedWorkouts = !isGuest && workouts
    ? workouts.filter((w: any) =>
        ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(
          w.validation_status,
        ),
      )
    : [];

  if (profileLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: VP.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={accent.DEFAULT} size="large" />
      </View>
    );
  }

  return (
    <ScreenBackground glowPosition="top" glowOpacity={0.14}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ TOP APP BAR ══════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: Spacing.xl,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.md,
              backgroundColor: 'rgba(23,23,47,0.85)',
              shadowColor: VP.primary,
              shadowOpacity: 0.1,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            },
            topBarEntrance.animatedStyle,
          ]}
        >
          {/* Avatar → Settings */}
          <Pressable
            onPress={() => router.push('/(app)/settings' as any)}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: Radius.pill,
              backgroundColor: VP.active,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: VP.primary,
              shadowColor: VP.primary,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
            }}
          >
            <FontAwesome name="user" size={18} color={VP.primary} />
          </Pressable>

          {/* Centered title */}
          <Text
            style={{
              fontFamily: 'Epilogue-Bold',
              fontSize: 20,
              color: VP.gold,
              letterSpacing: 2,
              textTransform: 'uppercase',
              textShadowColor: 'rgba(255,215,9,0.4)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
            }}
          >
            GYMCLASH
          </Text>

          {/* Trophy pill */}
          <ResourcePill
            value={trophies}
            icon="🏆"
            color={VP.gold}
            animated
            onPress={() => setShowArenaInfo(true)}
          />
        </Animated.View>

        {/* ══ GUEST BANNER ═════════════════════════════════════════════════════ */}
        {isGuest && (
          <Pressable
            style={{
              marginHorizontal: Spacing.xl,
              marginTop: Spacing.sm,
              backgroundColor: 'rgba(164,52,255,0.12)',
              borderRadius: Radius.lg,
              padding: Spacing.md,
              minHeight: 44,
              borderWidth: 1,
              borderColor: 'rgba(206,150,255,0.35)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.md,
            }}
            onPress={() => router.push('/(auth)/login?mode=signup')}
          >
            <FontAwesome name="user-plus" size={16} color={VP.primaryDim} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: 'Epilogue-Bold', fontSize: 13, color: VP.textPri }}
              >
                Create Account
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: VP.textMuted, marginTop: 1 }}
              >
                {5 - guestWorkouts.length} guest workouts left · Unlock clans &amp; wars
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={11} color={VP.primaryDim} />
          </Pressable>
        )}

        {/* ══ HERO SECTION (character + daily challenges button) ═════════════ */}
        <Animated.View
          style={[
            { marginTop: Spacing.md, marginHorizontal: Spacing.xl, alignItems: 'center', position: 'relative' },
            heroEntrance.animatedStyle,
          ]}
        >
          {/* Radial hero glow behind character */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '10%',
              left: '15%',
              right: '15%',
              bottom: '10%',
              borderRadius: 999,
              backgroundColor: 'rgba(206,150,255,0.08)',
            }}
          />

          {/* Daily Challenges icon button — upper right — shows dropdown */}
          <Pressable
            onPress={() => setShowChallenges((v) => !v)}
            style={{
              position: 'absolute',
              top: 4,
              right: 0,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: VP.active,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: questsDone === questsTotal ? 'rgba(255,215,9,0.5)' : 'rgba(206,150,255,0.25)',
            }}
          >
            <FontAwesome name="bolt" size={16} color={questsDone === questsTotal ? VP.gold : VP.primary} />
            {questsDone < questsTotal && (
              <View style={{
                position: 'absolute', top: -2, right: -2,
                width: 16, height: 16, borderRadius: 8,
                backgroundColor: VP.primaryDim,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#fff' }}>
                  {questsDone}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Daily Challenges dropdown */}
          {showChallenges && (
            <View style={{
              position: 'absolute', top: 48, right: 0, zIndex: 20,
              backgroundColor: VP.highest, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: 'rgba(206,150,255,0.25)',
              width: 220,
              shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 }, elevation: 12,
            }}>
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 11, color: VP.textPri, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                Daily Challenges
              </Text>
              <View style={{ gap: 8 }}>
                <QuestRow done={todayStrength >= 1} label="Complete a strength workout" />
                <QuestRow done={todayScout >= 1} label="Complete a cardio workout" />
                <QuestRow done={todayAny >= 1} label="Any workout today" />
              </View>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.gold, marginTop: 10, textAlign: 'center' }}>
                {questsDone}/{questsTotal} completed
              </Text>
            </View>
          )}

          {/* Level badge above character */}
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: '#a434ff',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: -18,
            zIndex: 10,
            borderWidth: 2, borderColor: '#ce96ff',
            shadowColor: '#a434ff', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
          }}>
            <Text style={{ color: '#fff', fontFamily: 'Epilogue-Bold', fontSize: 14 }}>{userLevel}</Text>
          </View>

          {/* 3D Character (falls back to emoji on web/GL failure) */}
          <View
            style={{
              width: 280,
              height: 320,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 24,
              backgroundColor: 'rgba(206,150,255,0.05)',
              overflow: 'visible',
            }}
          >
            <CharacterDisplay3D
              level={userLevel}
              strengthCount={profile?.strength_workout_count ?? 0}
              scoutCount={profile?.scout_workout_count ?? 0}
              isWorkingOut={useWorkoutStore.getState().isActive}
              size="xl"
              sex={(profile?.biological_sex as 'male' | 'female' | null) ?? null}
              equipment={equippedCosmetics}
            />
          </View>

          {/* Username below character */}
          <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 18, color: VP.textPri, marginTop: 8 }}>
            {displayName}
          </Text>
        </Animated.View>

        {/* ═══ 1. ARENA PROGRESSION ═══════════════════════════════════════════ */}
        <Pressable
          onPress={() => setShowArenaInfo(true)}
          style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.lg }}
        >
          <Card
            variant="default"
            style={{ borderWidth: 1, borderColor: 'rgba(206,150,255,0.12)' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.textMuted }}>
                {arenaConfig.badge} {arenaConfig.label}
              </Text>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.textMuted }}>
                {trophies} / {nextArenaThreshold} 🏆
              </Text>
            </View>
            <ProgressBar current={trophies} max={nextArenaThreshold} color={VP.primary} height="md" />
          </Card>
        </Pressable>

        {/* ═══ 2. INITIATE WORKOUT — MEGA CTA ════════════════════════════════ */}
        <Animated.View
          style={[
            {
              marginHorizontal: Spacing.xl,
              marginTop: Spacing.lg,
              borderRadius: Radius.xl,
            },
            ctaEntrance.animatedStyle,
            ctaGlow,
            ctaPress.animatedStyle,
          ]}
        >
          <Pressable
            style={{ borderRadius: 32, overflow: 'hidden' }}
            onPress={() => setShowWorkoutModal(true)}
            onPressIn={ctaPress.onPressIn}
            onPressOut={ctaPress.onPressOut}
          >
            <LinearGradient
              colors={[VP.primary, VP.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 22,
                paddingHorizontal: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 32,
              }}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 32 }}
                pointerEvents="none"
              />
              <View
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: VP.gold, opacity: 0.45, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
                pointerEvents="none"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FontAwesome name="fire" size={26} color={VP.gold} />
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Initiate Workout
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ═══ 3. QUESTS BAR ═══════════════════════════════════════════════════ */}
        <Pressable
          onPress={() => router.push('/(app)/quests' as any)}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: VP.active, borderRadius: Radius.lg, padding: Spacing.md,
            minHeight: 44,
            marginHorizontal: Spacing.xl, marginTop: Spacing.md,
            borderWidth: 1, borderColor: 'rgba(206,150,255,0.25)', gap: Spacing.md,
          }}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(164,52,255,0.18)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: 'rgba(206,150,255,0.3)',
          }}>
            <FontAwesome name="map" size={16} color={VP.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: VP.textPri }}>Quests</Text>
            <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.textMuted, marginTop: 2 }}>
              Navigate checkpoints · Earn rewards
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={10} color={VP.primary} />
        </Pressable>

        {/* ═══ 4. CLAN BAR ════════════════════════════════════════════════════ */}
        <Pressable
          onPress={() => myClan ? router.push('/(app)/clan' as any) : undefined}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: VP.active,
            borderRadius: Radius.lg,
            padding: Spacing.md,
            minHeight: 44,
            marginHorizontal: Spacing.xl,
            marginTop: Spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(206,150,255,0.15)',
            gap: Spacing.md,
          }}
        >
          <FontAwesome name="shield" size={18} color={VP.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: VP.textPri }}
            >
              {myClan?.name ?? 'No Clan'}
            </Text>
          </View>
          {myClan?.active_war_id ? (
            <Pressable
              onPress={() => router.push(`/(app)/war-details/${myClan.active_war_id}` as any)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(255,110,132,0.15)', borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 5,
              }}
            >
              <Text style={{ fontSize: 12 }}>⚔️</Text>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.error, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                War Active
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.textMuted }}>
              No active war
            </Text>
          )}
          <FontAwesome name="chevron-right" size={10} color={VP.textMuted} />
        </Pressable>

        {/* ═══ FLAGGED WORKOUT ALERT ══════════════════════════════════════════ */}
        {flaggedWorkouts.length > 0 && (
          <Pressable
            style={{
              marginHorizontal: Spacing.xl, marginTop: Spacing.md,
              backgroundColor: 'rgba(255,110,132,0.1)', borderRadius: Radius.md, padding: Spacing.md,
              minHeight: 44,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
              borderWidth: 1, borderColor: 'rgba(255,110,132,0.3)',
            }}
            onPress={() => router.push(`/(app)/review/${flaggedWorkouts[0].id}` as any)}
          >
            <FontAwesome name="exclamation-triangle" size={14} color={Colors.danger} />
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: Colors.danger, flex: 1, minWidth: 0 }}
            >
              {flaggedWorkouts.length} workout{flaggedWorkouts.length > 1 ? 's' : ''} flagged for review
            </Text>
            <FontAwesome name="chevron-right" size={10} color={Colors.danger} />
          </Pressable>
        )}

        {/* ═══ 5. SHOP + RANKINGS BOXES ═══════════════════════════════════════ */}
        <Animated.View
          style={[
            { flexDirection: 'row', marginHorizontal: Spacing.xl, marginTop: Spacing.md, gap: Spacing.md },
            bentoEntrance.animatedStyle,
          ]}
        >
          {/* Shop */}
          <Card
            variant="elevated"
            style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(206,150,255,0.2)' }}
            onPress={() => router.push('/(app)/shop' as any)}
          >
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: VP.textPri, fontStyle: 'italic', textTransform: 'uppercase', marginBottom: 6 }}>
              Shop
            </Text>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: VP.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
              Limited Skin
            </Text>
            <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.textPri, marginBottom: 10 }}>
              Neon Ronin V2
            </Text>
            <View style={{ backgroundColor: VP.gold, borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#000', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                View Deals
              </Text>
            </View>
          </Card>

          {/* Rankings */}
          <Card
            variant="elevated"
            style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(0,212,236,0.2)' }}
            onPress={() => router.push('/(app)/leaderboard' as any)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FontAwesome name="trophy" size={14} color={VP.cyan} />
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: VP.textPri, fontStyle: 'italic', textTransform: 'uppercase' }}>
                Rankings
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.textPri }} numberOfLines={1}>
                  1. TitanX
                </Text>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.gold }}>
                  5.2k 🏆
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(70,70,92,0.15)' }}>
                <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.primary }} numberOfLines={1}>
                  2. {displayName}
                </Text>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.gold }}>
                  {trophies} 🏆
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Last Workout Stats */}
        {!isGuest && workouts && workouts.length > 0 && (
          <View style={{ marginHorizontal: Spacing.xl, marginTop: Spacing.md }}>
            <LastWorkoutStatsCard workout={workouts[0]} />
          </View>
        )}
      </ScrollView>

      {/* ══ OVERLAYS ═══════════════════════════════════════════════════════════ */}

      {/* Streak milestone celebration */}
      <ConfettiBurst visible={showMilestone} onComplete={() => setShowMilestone(false)} />
      {showMilestone && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => setShowMilestone(false)}
        >
          <View
            style={{
              backgroundColor: VP.active,
              borderRadius: 20,
              padding: 32,
              alignItems: 'center',
              marginHorizontal: 32,
              shadowColor: VP.primary,
              shadowOpacity: 0.35,
              shadowRadius: 32,
              shadowOffset: { width: 0, height: 0 },
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{tier.emoji}</Text>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 20, color: VP.textPri, marginBottom: 4 }}>
              {tier.label} Streak!
            </Text>
            <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: VP.textMuted, textAlign: 'center' }}>
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

      {/* Arena info modal */}
      <Modal visible={showArenaInfo} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.9)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: VP.active,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Epilogue-Bold', color: VP.textPri, fontSize: 18 }}>
                The Arena System
              </Text>
              <Pressable onPress={() => setShowArenaInfo(false)}>
                <FontAwesome name="times" size={18} color={VP.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: VP.textSec, marginBottom: 16 }}>
                Climb through the arenas by earning trophies from workouts and clan wars. Your ultimate goal: reach The Colosseum and achieve Olympian rank!
              </Text>
              {Object.entries(Arena).map(([key, a]) => {
                const isCurrent = key === arenaTier;
                const isLocked = a.minTrophies > trophies;
                return (
                  <View
                    key={key}
                    style={{
                      backgroundColor: isCurrent ? 'rgba(206,150,255,0.12)' : VP.highest,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: isCurrent ? 1 : 0,
                      borderColor: isCurrent ? VP.primary : 'transparent',
                      opacity: isLocked ? 0.5 : 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{a.badge}</Text>
                        <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 15, color: isCurrent ? VP.primary : a.accent }}>
                          {a.label}
                        </Text>
                      </View>
                      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: VP.textMuted }}>
                        {a.minTrophies} 🏆
                      </Text>
                    </View>
                    {a.description && (
                      <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.textSec }}>
                        {a.description}
                      </Text>
                    )}
                    {isCurrent && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <FontAwesome name="map-marker" size={10} color={VP.primary} />
                        <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: VP.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                          You are here
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Milestones modal */}
      <Modal visible={showMilestones} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.9)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: VP.active,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Epilogue-Bold', color: VP.textPri, fontSize: 18 }}>Milestones</Text>
              <Pressable onPress={() => setShowMilestones(false)}>
                <FontAwesome name="times" size={18} color={VP.textMuted} />
              </Pressable>
            </View>
            {(() => {
              const milestoneList = [
                { label: 'First Workout',  done: (workouts?.length ?? 0) > 0,          diamonds: 10  },
                { label: 'Join a Clan',    done: !!myClan,                              diamonds: 15  },
                { label: '7-Day Streak',   done: (profile?.current_streak ?? 0) >= 7,  diamonds: 25  },
                { label: '10 Workouts',    done: (workouts?.length ?? 0) >= 10,         diamonds: 50  },
                { label: 'Win a Clan War', done: false,                                 diamonds: 100 },
              ];
              const completedCount = milestoneList.filter((m) => m.done).length;
              const pct = completedCount / milestoneList.length;
              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: VP.textSec }}>
                      {completedCount} of {milestoneList.length} complete
                    </Text>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: VP.primary }}>
                      {Math.round(pct * 100)}%
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: VP.highest, overflow: 'hidden', marginBottom: 16 }}>
                    <LinearGradient
                      colors={[VP.primary, VP.primaryDim]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ height: 6, borderRadius: 3, width: `${pct * 100}%` as any }}
                    />
                  </View>
                  <View style={{ gap: 10 }}>
                    {milestoneList.map((m) => (
                      <View
                        key={m.label}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          backgroundColor: m.done ? '#1a2a1a' : VP.highest,
                          borderRadius: 14,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: m.done ? 'rgba(34,197,94,0.25)' : 'rgba(206,150,255,0.08)',
                        }}
                      >
                        <FontAwesome
                          name={m.done ? 'check-circle' : 'lock'}
                          size={20}
                          color={m.done ? '#22c55e' : VP.textMuted}
                        />
                        <Text
                          style={{
                            fontFamily: m.done ? 'Epilogue-Bold' : 'BeVietnamPro-Regular',
                            fontSize: 14,
                            color: m.done ? VP.textPri : VP.textMuted,
                            flex: 1,
                          }}
                        >
                          {m.label}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 3,
                            backgroundColor: 'rgba(206,150,255,0.12)',
                            borderRadius: 8,
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                          }}
                        >
                          <FontAwesome name="diamond" size={8} color={VP.primary} />
                          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: VP.primary }}>
                            {m.diamonds}
                          </Text>
                        </View>
                        {m.done && (
                          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: '#22c55e', letterSpacing: 0.5 }}>
                            DONE
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}
