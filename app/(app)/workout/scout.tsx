import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  interpolateColor,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { calculateScoutRawScore } from '@/lib/scoring/raw-score';
import { TrophyRewards } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useGpsTracking } from '@/hooks/use-gps-tracking';
import { useLiveHeartRate } from '@/hooks/use-live-heart-rate';
import { HeartRateZoneBox } from '@/components/workout/HeartRateZoneBox';
import { TerritoryMap } from '@/components/workout/TerritoryMap';
import { VictoryScreen } from '@/components/VictoryScreen';
import { CardioModeSelector } from '@/components/CardioModeSelector';
import { GpsDropOverlay } from '@/components/GpsDropOverlay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WorkoutCountdown } from '@/components/WorkoutCountdown';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import DevicePrompt from '@/components/DevicePrompt';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';

// ─── Design tokens — pulls from theme ──────────────────────────────────────
import { Colors } from '@/constants/theme';

const SURFACE = Colors.surface.DEFAULT;
const CARD_BG = Colors.surface.containerHigh;
const MUTED = Colors.text.muted;
const TEXT_PRIMARY = Colors.text.primary;
const ACCENT_PURPLE = Colors.primary.DEFAULT;
const ACCENT_CYAN = Colors.tertiary.DEFAULT;
const ACCENT_DIM = Colors.primary.dim;
const DANGER = Colors.error.DEFAULT;
const GPS_TEAL = '#0d2b2e'; // intentional custom map background
const GPS_ROUTE_PURPLE = 'rgba(164,52,255,0.5)';
const GPS_ROUTE_CYAN = 'rgba(129,236,255,0.4)';

const SHADOW_PURPLE = Platform.OS === 'ios'
  ? { shadowColor: ACCENT_PURPLE, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }
  : { elevation: 5 };
const SHADOW_CYAN = Platform.OS === 'ios'
  ? { shadowColor: ACCENT_CYAN, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }
  : { elevation: 8 };

// ─── Stat Card with neon border ─────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  index,
  variant = 'purple',
}: {
  label: string;
  value: string;
  unit: string;
  index: number;
  variant?: 'purple' | 'cyan';
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * 80;
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300, easing }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isCyan = variant === 'cyan';
  const borderColor = isCyan ? ACCENT_CYAN : ACCENT_PURPLE;
  const shadow = isCyan ? SHADOW_CYAN : SHADOW_PURPLE;

  return (
    <Reanimated.View
      style={[
        containerStyle,
        {
          flex: 1,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: isCyan ? 'rgba(129,236,255,0.5)' : 'rgba(206,150,255,0.3)',
          overflow: 'hidden',
          ...shadow,
        },
      ]}
    >
      {/* Subtle inner glow gradient */}
      <LinearGradient
        colors={[
          isCyan ? 'rgba(129,236,255,0.06)' : 'rgba(206,150,255,0.04)',
          CARD_BG,
        ]}
        style={{
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: borderColor,
            fontSize: 10,
            fontFamily: 'Lexend-SemiBold',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: TEXT_PRIMARY,
            fontSize: 26,
            fontFamily: 'Lexend-Bold',
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            color: MUTED,
            fontSize: 11,
            fontFamily: 'BeVietnamPro-Regular',
            marginTop: 2,
          }}
        >
          {unit}
        </Text>
      </LinearGradient>
    </Reanimated.View>
  );
}

// ─── Gradient-bordered Pause Button ─────────────────────────────────────────

function PauseButton({
  isPaused,
  onPress,
}: {
  isPaused: boolean;
  onPress: () => void;
}) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);

  return (
    <Reanimated.View style={[pressStyle, { borderRadius: 14, marginBottom: 16 }]}>
      {/* Gradient border wrapper */}
      <LinearGradient
        colors={isPaused ? ['#22c55e', '#10B981'] : [ACCENT_PURPLE, ACCENT_CYAN]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius: 14,
          padding: 2, // border thickness
        }}
      >
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onPress}
          style={{
            width: '100%',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: isPaused ? '#22c55e' : CARD_BG,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome
              name={isPaused ? 'play' : 'pause'}
              size={14}
              color={isPaused ? '#fff' : TEXT_PRIMARY}
            />
            <Text
              style={{
                color: isPaused ? '#fff' : TEXT_PRIMARY,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 14,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {isPaused ? 'RESUME' : 'PAUSE'}
            </Text>
          </View>
        </Pressable>
      </LinearGradient>
    </Reanimated.View>
  );
}

// ─── Header pill buttons ────────────────────────────────────────────────────

function CancelPill({ onPress }: { onPress: () => void }) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.92);

  return (
    <Reanimated.View style={pressStyle}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'rgba(239,68,68,0.12)',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: 'rgba(239,68,68,0.3)',
        }}
      >
        <FontAwesome name="times" size={12} color={DANGER} />
        <Text style={{ color: DANGER, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
          Cancel
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

function FinishPill({
  isPending,
  elapsedSeconds,
  onPress,
}: {
  isPending: boolean;
  elapsedSeconds: number;
  onPress: () => void;
}) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.92);
  const intensity = Math.min(elapsedSeconds / 1200, 1);
  const minOpacity = 0.15 + intensity * 0.2;
  const maxOpacity = 0.3 + intensity * 0.4;
  const { glowStyle } = useGlowPulse(ACCENT_DIM, minOpacity, maxOpacity, 1800, true);

  return (
    <Reanimated.View style={[pressStyle, glowStyle, { borderRadius: 20 }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={isPending}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 8,
          opacity: isPending ? 0.6 : 1,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[ACCENT_DIM, ACCENT_PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 20,
          }}
        />
        <FontAwesome name="check" size={12} color="#fff" />
        <Text style={{ color: '#fff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
          {isPending ? 'Saving...' : 'Finish'}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── GPS Map Section ────────────────────────────────────────────────────────

function GpsMapSection({
  gps,
  gpsPulse,
  formatPace,
}: {
  gps: ReturnType<typeof useGpsTracking>;
  gpsPulse: SharedValue<number>;
  formatPace: (pace: number) => string;
}) {
  const sectionOpacity = useSharedValue(0);
  const sectionTranslateY = useSharedValue(20);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    sectionOpacity.value = withDelay(300, withTiming(1, { duration: 320, easing }));
    sectionTranslateY.value = withDelay(300, withTiming(0, { duration: 320, easing }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: sectionOpacity.value,
    transform: [{ translateY: sectionTranslateY.value }],
  }));

  const pulseDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gpsPulse.value }],
  }));

  return (
    <Reanimated.View
      style={[
        animatedStyle,
        {
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(129,236,255,0.15)',
          ...SHADOW_CYAN,
        },
      ]}
    >
      {/* Header row */}
      <View
        style={{
          backgroundColor: CARD_BG,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: TEXT_PRIMARY, fontSize: 16, fontFamily: 'Epilogue-Bold' }}>
          GPS Tracking
        </Text>
        {gps.status === 'tracking' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Reanimated.View
              style={[
                pulseDotStyle,
                {
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#10B981',
                },
              ]}
            />
            <Text
              style={{
                color: '#10B981',
                fontSize: 10,
                fontFamily: 'Lexend-SemiBold',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              LIVE TRACKING
            </Text>
          </View>
        )}
      </View>

      {/* Real GPS map */}
      {gps.status === 'error' ? (
        <View style={{ backgroundColor: GPS_TEAL, paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center' }}>
          <FontAwesome name="exclamation-triangle" size={24} color="#ff6e84" style={{ marginBottom: 8 }} />
          <Text style={{ color: '#ff6e84', fontSize: 13, fontFamily: 'BeVietnamPro-Regular', marginBottom: 4 }}>
            GPS unavailable
          </Text>
          <Text style={{ color: MUTED, fontSize: 12, fontFamily: 'BeVietnamPro-Regular' }}>
            Check location permissions and try again
          </Text>
        </View>
      ) : (
        <TerritoryMap points={gps.points} height={260} />
      )}

      {/* Stats below map */}
      {gps.status === 'tracking' && (
        <View style={{ backgroundColor: CARD_BG, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text
            style={{
              color: TEXT_PRIMARY,
              fontSize: 28,
              fontFamily: 'Lexend-Bold',
              letterSpacing: -0.5,
            }}
          >
            {gps.distance.toFixed(2)} km
          </Text>
          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              fontFamily: 'BeVietnamPro-Regular',
              marginTop: 2,
            }}
          >
            Pace: {formatPace(gps.pace)} min/km {'\u00B7'} {gps.points.length} points
          </Text>
        </View>
      )}
    </Reanimated.View>
  );
}

// ─── Timer display ──────────────────────────────────────────────────────────

function TimerDisplay({
  timerPulse,
  elapsedSeconds,
  timerStyle,
}: {
  timerPulse: SharedValue<number>;
  elapsedSeconds: number;
  timerStyle: any;
}) {
  const glowStyle = useAnimatedStyle(() => ({
    textShadowColor: interpolateColor(
      timerPulse.value,
      [0, 1],
      ['rgba(129,236,255,0)', 'rgba(129,236,255,0.8)'],
    ),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  }));

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;

  return (
    <Reanimated.View style={[timerStyle, { alignItems: 'center', marginBottom: 28 }]}>
      <Reanimated.Text
        style={[
          glowStyle,
          {
            color: TEXT_PRIMARY,
            fontSize: 64,
            fontFamily: 'SpaceMono',
            letterSpacing: 4,
          },
        ]}
      >
        {`${mins}:${secs.toString().padStart(2, '0')}`}
      </Reanimated.Text>
    </Reanimated.View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────

export default function ScoutWorkoutScreen() {
  const router = useRouter();
  const { isGuest } = useAuthStore();
  const [mode, setMode] = useState<'device' | 'select' | 'territory'>('device');
  const {
    isActive,
    startWorkout,
    startedAt,
    idempotencyKey,
    elapsedSeconds,
    updateElapsed,
    reset,
  } = useWorkoutStore();
  const { addGuestWorkout, guestWorkouts } = useGuestWorkoutStore();

  const queryClient = useQueryClient();
  const submitWorkout = useSubmitWorkout();
  const { data: profile } = useProfile();
  const maxHR = profile?.max_heart_rate ?? (profile?.birth_date ? 220 - Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null);

  const gps = useGpsTracking();
  const liveHR = useLiveHeartRate(isActive);
  const [showVictory, setShowVictory] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [victoryData, setVictoryData] = useState({ score: 0, trophies: 12, streak: 0, isPB: false, currencyEarned: 0 });
  const [gpsDropped, setGpsDropped] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const timerStopped = useRef(false);
  const timerPulse = useSharedValue(0);
  const gpsPulse = useSharedValue(1);

  // ── Section entrance animations ──────────────────────────────────────────
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);
  const timerOpacity = useSharedValue(0);
  const timerScale = useSharedValue(0.9);
  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(20);
  const pauseOpacity = useSharedValue(0);
  const pauseTranslateY = useSharedValue(16);
  const hrOpacity = useSharedValue(0);
  const hrTranslateY = useSharedValue(16);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const timerStyle = useAnimatedStyle(() => ({
    opacity: timerOpacity.value,
    transform: [{ scale: timerScale.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));
  const pauseStyle = useAnimatedStyle(() => ({
    opacity: pauseOpacity.value,
    transform: [{ translateY: pauseTranslateY.value }],
  }));
  const hrStyle = useAnimatedStyle(() => ({
    opacity: hrOpacity.value,
    transform: [{ translateY: hrTranslateY.value }],
  }));

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    headerOpacity.value = withDelay(0, withTiming(1, { duration: 280, easing }));
    headerTranslateY.value = withDelay(0, withTiming(0, { duration: 280, easing }));
    timerOpacity.value = withDelay(80, withTiming(1, { duration: 320, easing }));
    timerScale.value = withDelay(80, withSpring(1, { damping: 12, stiffness: 180 }));
    statsOpacity.value = withDelay(180, withTiming(1, { duration: 280, easing }));
    statsTranslateY.value = withDelay(180, withTiming(0, { duration: 280, easing }));
    pauseOpacity.value = withDelay(260, withTiming(1, { duration: 260, easing }));
    pauseTranslateY.value = withDelay(260, withTiming(0, { duration: 260, easing }));
    hrOpacity.value = withDelay(320, withTiming(1, { duration: 260, easing }));
    hrTranslateY.value = withDelay(320, withTiming(0, { duration: 260, easing }));
  }, []);

  // Start workout and GPS on mount, connect health adapter
  useEffect(() => {
    if (mode !== 'territory') return;
    if (!isActive) startWorkout('scout');
    if (gps.status === 'idle') gps.startTracking();
    if (!liveHR.isConnected) void liveHR.connect();
  }, [isActive, startWorkout, mode, gps, liveHR]);

  // Elapsed time tracker
  useEffect(() => {
    if (mode !== 'territory' || timerStopped.current || isPaused || showCountdown) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, mode, isPaused, showCountdown]);

  // GPS signal drop watch
  useEffect(() => {
    if (mode === 'territory' && gps.error) {
      setGpsDropped(true);
    } else if (!gps.error) {
      setGpsDropped(false);
    }
  }, [gps.error, mode]);

  // Timer pulse glow
  useEffect(() => {
    timerPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 }),
      ),
      -1,
      false,
    );
  }, []);

  // GPS pulse
  useEffect(() => {
    gpsPulse.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, []);

  // Reset mode when workout cancelled externally
  useEffect(() => {
    if (!isActive && mode !== 'device') {
      setMode('device');
      setShowCountdown(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const currentDistance = gps.distance;
  const currentPace = gps.pace > 0 ? gps.pace : 0;

  const provisionalScore =
    currentDistance > 0 && currentPace > 0
      ? calculateScoutRawScore({
          distance_km: currentDistance,
          avg_pace_min_per_km: currentPace,
          elevation_gain_m: 0,
        })
      : 0;

  async function handleFinishWorkout() {
    timerStopped.current = true;
    const km = gps.distance;
    if (!km || km <= 0) {
      Alert.alert('Error', 'No distance recorded. Make sure GPS is active.');
      return;
    }
    if (!startedAt || !idempotencyKey) return;

    const now = new Date().toISOString();
    const pace = elapsedSeconds / 60 / km;

    if (isGuest) {
      if (guestWorkouts.length >= 5) {
        Alert.alert(
          'Guest Limit Reached',
          'Sign up to log unlimited workouts and compete in clan wars.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/(auth)/login?mode=signup') },
          ]
        );
        return;
      }
      addGuestWorkout({
        type: 'scout',
        started_at: startedAt,
        completed_at: now,
        duration_seconds: elapsedSeconds,
        sets: null,
        route_data: {
          distance_km: km,
          avg_pace_min_per_km: Math.round(pace * 100) / 100,
          elevation_gain_m: 0,
        },
      });
      reset();
      Alert.alert(
        'Run Saved Locally',
        `${guestWorkouts.length + 1}/5 guest workouts used. Sign up to sync to server.`,
        [{ text: 'OK', onPress: () => router.replace('/(app)/home') }]
      );
      return;
    }

    try {
      await submitWorkout.mutateAsync({
        type: 'scout',
        started_at: startedAt,
        completed_at: now,
        duration_seconds: elapsedSeconds,
        sets: null,
        route_data: {
          distance_km: km,
          avg_pace_min_per_km: Math.round(pace * 100) / 100,
          elevation_gain_m: 0,
        },
        source: 'manual',
        idempotency_key: idempotencyKey,
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setVictoryData({
        score: provisionalScore,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false,
        currencyEarned: Math.round(provisionalScore * 0.1),
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit run. Please try again.');
    }
  }

  function handleConcludePress() {
    if (submitWorkout.isPending) return;
    setShowFinishConfirm(true);
  }

  function handleDiscard() {
    setShowDiscardConfirm(true);
  }

  function formatPace(paceMinPerKm: number): string {
    if (paceMinPerKm <= 0) return '--:--';
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ── Pre-territory mode screens ────────────────────────────────────────────

  if (mode === 'device') {
    return (
      <DevicePrompt
        workoutType="cardio"
        onContinueWithDevice={() => setMode('select')}
        onContinueWithout={() => setMode('select')}
        onBack={() => router.replace('/(app)/home' as any)}
      />
    );
  }

  if (mode === 'select') {
    return (
      <CardioModeSelector
        onSelectTerritory={() => setMode('territory')}
        onSelectTreadmill={() => router.push('/(app)/workout/treadmill')}
        onBack={() => setMode('device')}
      />
    );
  }

  // ── Territory mode (main run tracker) ─────────────────────────────────────

  return (
    <ScreenBackground glowColor={ACCENT_PURPLE} glowOpacity={0.1} glowPosition="top">
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header: Cancel / Finish pills */}
        <Reanimated.View
          style={[
            headerStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
            },
          ]}
        >
          <CancelPill onPress={handleDiscard} />
          <FinishPill
            isPending={submitWorkout.isPending}
            elapsedSeconds={elapsedSeconds}
            onPress={handleConcludePress}
          />
        </Reanimated.View>

        {/* Large timer */}
        <TimerDisplay
          timerPulse={timerPulse}
          elapsedSeconds={elapsedSeconds}
          timerStyle={timerStyle}
        />

        {/* Guest indicator */}
        {isGuest && (
          <View
            style={{
              backgroundColor: 'rgba(255,215,9,0.1)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,215,9,0.2)',
            }}
          >
            <Text
              style={{
                color: '#ffd709',
                fontSize: 12,
                textAlign: 'center',
                fontFamily: 'Lexend-SemiBold',
              }}
            >
              Guest mode — {5 - guestWorkouts.length} workouts remaining
            </Text>
          </View>
        )}

        {/* Stat cards row */}
        <Reanimated.View style={[statsStyle, { flexDirection: 'row', gap: 10, marginBottom: 24 }]}>
          <StatCard
            label="Distance"
            value={currentDistance > 0 ? currentDistance.toFixed(2) : '0.00'}
            unit="km"
            index={0}
            variant="purple"
          />
          <StatCard
            label="Pace"
            value={formatPace(currentPace)}
            unit="min/km"
            index={1}
            variant="purple"
          />
          <StatCard
            label="Score"
            value={Math.round(provisionalScore).toString()}
            unit="est."
            index={2}
            variant="cyan"
          />
        </Reanimated.View>

        {/* Pause button with gradient border */}
        <Reanimated.View style={pauseStyle}>
          <PauseButton isPaused={isPaused} onPress={() => setIsPaused((v) => !v)} />
        </Reanimated.View>

        {/* Heart rate zone */}
        <Reanimated.View style={hrStyle}>
          <HeartRateZoneBox heartRate={liveHR.currentHeartRate} maxHR={maxHR} />
        </Reanimated.View>

        {/* GPS Map section */}
        <View style={{ marginTop: 16 }}>
          <GpsMapSection gps={gps} gpsPulse={gpsPulse} formatPace={formatPace} />
        </View>

        {/* Provisional note */}
        <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
          <Text
            style={{
              color: MUTED,
              fontSize: 12,
              textAlign: 'center',
              fontFamily: 'BeVietnamPro-Regular',
            }}
          >
            Score is provisional. Final score and validation are calculated server-side after submission.
          </Text>
        </View>
      </ScrollView>

      <VictoryScreen
        visible={showVictory}
        workoutType="scout"
        score={victoryData.score}
        trophiesEarned={victoryData.trophies}
        streakCount={victoryData.streak}
        isPersonalBest={victoryData.isPB}
        currencyEarned={victoryData.currencyEarned}
        onDismiss={() => {
          setShowVictory(false);
          reset();
          router.replace('/(app)/home');
        }}
      />

      <GpsDropOverlay
        visible={gpsDropped}
        onWaitForSignal={() => setGpsDropped(false)}
        onEndSession={() => {
          setGpsDropped(false);
          handleConcludePress();
        }}
      />

      <ConfirmModal
        visible={showFinishConfirm}
        title="Finish Run?"
        message="Are you sure you want to finish this session?"
        confirmText="Finish"
        cancelText="Keep Going"
        onConfirm={() => {
          setShowFinishConfirm(false);
          handleFinishWorkout();
        }}
        onCancel={() => setShowFinishConfirm(false)}
      />

      <ConfirmModal
        visible={showDiscardConfirm}
        title="Discard Run?"
        message="This cannot be undone. All tracking data will be lost."
        confirmText="Discard"
        cancelText="Cancel"
        destructive
        onConfirm={() => {
          setShowDiscardConfirm(false);
          timerStopped.current = true;
          reset();
          router.replace('/(app)/home');
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      <WorkoutCountdown visible={showCountdown && mode === 'territory'} onComplete={() => setShowCountdown(false)} />
    </ScreenBackground>
  );
}
