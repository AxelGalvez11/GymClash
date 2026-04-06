import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  interpolate,
  Easing as REasing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';

import { Colors, TrophyRewards } from '@/constants/theme';
import { VictoryScreen } from '@/components/VictoryScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WorkoutCountdown } from '@/components/WorkoutCountdown';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { HUDInput } from '@/components/ui/HUDInput';
import { ResourcePill } from '@/components/ui/ResourcePill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SetRow } from '@/components/ui/SetRow';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { supabase } from '@/services/supabase';
import { triggerVideoAnalysis } from '@/services/api';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { useProfile } from '@/hooks/use-profile';
import { calculateStrengthRawScore } from '@/lib/scoring/raw-score';
import { useEntrance } from '@/hooks/use-entrance';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import type { StrengthSet } from '@/types';

// ─── Exercise data ────────────────────────────────────────────────────────────

const COMMON_EXERCISES = [
  'Squat',
  'Bench Press',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Dips',
  'Push-ups',
  'Lunges',
  'Leg Press',
  'Lat Pulldown',
  'Sit-ups',
  'Burpees',
  'Plank',
];

const BODYWEIGHT_EXERCISES = new Set([
  'Pull-ups',
  'Dips',
  'Push-ups',
  'Sit-ups',
  'Burpees',
  'Plank',
  'Chin-ups',
  'Muscle-ups',
  'Pistol Squats',
  'Handstand Push-ups',
  'Body Rows',
  'Crunches',
  'Leg Raises',
  'Mountain Climbers',
]);

function isBodyweightExercise(name: string): boolean {
  return (
    BODYWEIGHT_EXERCISES.has(name) ||
    name.toLowerCase().includes('bodyweight') ||
    name.toLowerCase().includes('body weight')
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  purple:    '#ce96ff',
  purpleDim: '#a434ff',
  teal:      '#81ecff',
  gold:      '#ffd709',
  surface:   '#0c0c1f',
  container: '#17172f',
  elevated:  '#23233f',
  high:      '#1d1d37',
  text:      '#e5e3ff',
  muted:     '#aaa8c3',
  outline:   '#74738b',
  error:     '#ff6e84',
  success:   '#22c55e',
} as const;

// ─── Animated set row ─────────────────────────────────────────────────────────

function AnimatedSetRow({
  set,
  index,
  onRemove,
}: {
  readonly set: StrengthSet;
  readonly index: number;
  readonly onRemove: (index: number) => void;
}) {
  const { animatedStyle } = useStaggerEntrance(index, 60);
  return (
    <Reanimated.View style={animatedStyle}>
      <SetRow set={set} index={index} onRemove={onRemove} />
    </Reanimated.View>
  );
}

// ─── Input bounce on value change ─────────────────────────────────────────────

function useBounceOnChange(value: string) {
  const scale = useSharedValue(1);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && value !== '') {
      scale.value = withSequence(
        withSpring(1.06, { damping: 10, stiffness: 400, mass: 0.5 }),
        withSpring(1, { damping: 12, stiffness: 200, mass: 0.6 }),
      );
    }
    prevValue.current = value;
  }, [value, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ─── Animated score counter ───────────────────────────────────────────────────

function useAnimatedScore(target: number) {
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(target, {
      duration: 600,
      easing: REasing.out(REasing.cubic),
    });
  }, [target, animValue]);

  return animValue;
}

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({
  score,
  visible,
}: {
  readonly score: number;
  readonly visible: boolean;
}) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(10);
  const scorePulse = useSharedValue(0);

  // Entrance + auto-fade animation
  useEffect(() => {
    if (visible && score > 0) {
      opacity.value    = 0;
      translateY.value = 10;

      opacity.value    = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300, easing: REasing.out(REasing.cubic) });

      // Auto-fade after 1.5 s
      opacity.value = withSequence(
        withTiming(1,  { duration: 300 }),
        withTiming(1,  { duration: 1500 }),
        withTiming(0,  { duration: 800 }),
      );
    } else {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value    = 0;
      translateY.value = 10;
    }
  }, [visible, score, opacity, translateY]);

  // Pulse glow loop — properly cancelled on cleanup
  useEffect(() => {
    if (visible && score > 0) {
      scorePulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: REasing.inOut(REasing.ease) }),
          withTiming(0, { duration: 1200, easing: REasing.inOut(REasing.ease) }),
        ),
        -1,   // infinite
        false,
      );
    } else {
      cancelAnimation(scorePulse);
      scorePulse.value = 0;
    }
    return () => { cancelAnimation(scorePulse); };
  }, [visible, score, scorePulse]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const borderStyle = useAnimatedStyle(() => {
    const alpha = interpolate(scorePulse.value, [0, 1], [0, 0.6]);
    return {
      borderColor: `rgba(206,150,255,${alpha.toFixed(3)})`,
    };
  });

  if (!visible || score <= 0) return null;

  return (
    <Reanimated.View
      style={[
        {
          position: 'absolute',
          right: 12,
          top: 8,
        },
        containerStyle,
      ]}
    >
      <Reanimated.View style={[{ borderRadius: 50, borderWidth: 2, padding: 3 }, borderStyle]}>
        <View
          style={{
            borderRadius: 50,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: 'rgba(206,150,255,0.2)',
            shadowColor: C.purple,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
          }}
        >
          <Text style={{ color: C.purple, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
            +{Math.round(score)} pts
          </Text>
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
}

// ─── Section accent line ──────────────────────────────────────────────────────

function AccentLine({ color = C.purple }: { readonly color?: string }) {
  return <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: color, marginRight: 8 }} />;
}

// ─── Separator ────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <View style={{ height: 1, backgroundColor: 'rgba(70,70,92,0.2)', marginVertical: 16 }} />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StrengthWorkoutScreen() {
  const router       = useRouter();
  const { isGuest, session } = useAuthStore();
  const { data: profile }    = useProfile();

  const {
    isActive,
    startWorkout,
    addStrengthSet,
    removeStrengthSet,
    strengthSets,
    startedAt,
    idempotencyKey,
    elapsedSeconds,
    updateElapsed,
    reset,
  } = useWorkoutStore();

  const { addGuestWorkout, guestWorkouts } = useGuestWorkoutStore();
  const submitWorkout = useSubmitWorkout();
  const queryClient   = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [exercise,      setExercise]      = useState('');
  const [reps,          setReps]          = useState('');
  const [weightKg,      setWeightKg]      = useState('');
  const [showExercises, setShowExercises] = useState(false);
  const [isBodyweight,  setIsBodyweight]  = useState(false);

  // ── Modal / overlay state ───────────────────────────────────────────────────
  const [showFinishConfirm,  setShowFinishConfirm]  = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showVictory,        setShowVictory]        = useState(false);
  const [showCountdown,      setShowCountdown]      = useState(true);

  const [victoryData, setVictoryData] = useState<{
    readonly score:         number;
    readonly trophies:      number;
    readonly streak:        number;
    readonly isPB:          boolean;
    readonly currencyEarned: number;
    readonly breakdown: ReadonlyArray<{
      readonly exercise: string;
      readonly score:    number;
      readonly rating:   'exceeded' | 'met' | 'below';
    }>;
  }>({ score: 0, trophies: 12, streak: 0, isPB: false, currencyEarned: 0, breakdown: [] });

  // ── Score badge state ───────────────────────────────────────────────────────
  const [lastAddedScore, setLastAddedScore] = useState(0);
  const [showScoreBadge, setShowScoreBadge] = useState(false);

  // ── Video state ─────────────────────────────────────────────────────────────
  const [videoStatus,    setVideoStatus]    = useState<
    'idle' | 'recording' | 'uploading' | 'analyzing' | 'done' | 'error'
  >('idle');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [videoError,     setVideoError]     = useState<string | null>(null);

  // ── Timer guard ─────────────────────────────────────────────────────────────
  const timerStopped = useRef(false);

  // ── Score display ───────────────────────────────────────────────────────────
  const provisionalScore  = calculateStrengthRawScore([...strengthSets]);
  const animatedScore     = useAnimatedScore(provisionalScore);
  const [displayScore, setDisplayScore] = useState(0);
  const targetScore = Math.round(provisionalScore);
  // "Elite" target — 42% above current for ring progress feel
  const eliteTarget = Math.max(targetScore * 1.42, 2100);

  // ── Micro-animation hooks ────────────────────────────────────────────────────
  const headerEntrance = useEntrance(0, 'fade-slide', 280);
  const scoreEntrance  = useEntrance(80, 'spring-up');

  const addSetPress = usePressScale(0.95);
  const addSetGlow  = useGlowPulse(C.purple, 0.2, 0.65, 2200, true);
  const finishPress = usePressScale(0.95);
  const cancelPress = usePressScale(0.95);

  const finishGlowIntensity = Math.min(strengthSets.length / 5, 1);
  const finishGlow = useGlowPulse(
    C.purpleDim,
    0.1 + finishGlowIntensity * 0.3,
    0.4 + finishGlowIntensity * 0.5,
    2400 - finishGlowIntensity * 800,
    strengthSets.length > 0,
  );

  const timerGlow = useGlowPulse(C.teal, 0.15, 0.5, 1800, !showCountdown);

  const repsBounce   = useBounceOnChange(reps);
  const weightBounce = useBounceOnChange(weightKg);

  // ── Side effects ─────────────────────────────────────────────────────────────

  // Score count-up
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = displayScore;
      const end   = targetScore;
      const diff  = end - start;
      if (diff === 0) return;
      const steps = 20;
      let step    = 0;
      const id = setInterval(() => {
        step++;
        setDisplayScore(Math.round(start + (diff * step) / steps));
        if (step >= steps) clearInterval(id);
      }, 30);
      return () => clearInterval(id);
    }, 0);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provisionalScore]);

  // Start workout
  useEffect(() => {
    if (!isActive) startWorkout('strength');
  }, [isActive, startWorkout]);

  // Timer tick
  useEffect(() => {
    if (timerStopped.current || showCountdown) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, showCountdown]);

  // Bodyweight auto-fill
  useEffect(() => {
    const bw = isBodyweightExercise(exercise);
    setIsBodyweight(bw);
    if (bw && profile?.body_weight_kg) {
      setWeightKg(String(profile.body_weight_kg));
    }
  }, [exercise, profile?.body_weight_kg]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleAddSet() {
    if (!exercise.trim()) {
      Alert.alert('Error', 'Select an exercise');
      return;
    }
    const r = parseInt(reps, 10);
    const rawWeight = parseFloat(weightKg);
    const w = rawWeight * 0.453592; // lbs → kg for scoring

    if (!r || r <= 0 || isNaN(rawWeight) || rawWeight < 0) {
      Alert.alert('Error', 'Enter valid reps and weight');
      return;
    }

    const scoreBefore = calculateStrengthRawScore([...strengthSets]);
    const newSet: StrengthSet = { exercise: exercise.trim(), sets: 1, reps: r, weight_kg: w };
    addStrengthSet(newSet);

    const scoreAfter = calculateStrengthRawScore([...strengthSets, newSet]);
    const delta = scoreAfter - scoreBefore;

    if (delta > 0) {
      setLastAddedScore(delta);
      setShowScoreBadge(false);
      setTimeout(() => setShowScoreBadge(true), 50);
    }

    setReps('');
    if (!isBodyweight) setWeightKg('');
  }

  async function handleFinishWorkout() {
    timerStopped.current = false;
    timerStopped.current = true;

    if (strengthSets.length === 0) {
      Alert.alert('Error', 'Add at least one set before finishing');
      return;
    }
    if (!startedAt || !idempotencyKey) return;

    const now = new Date().toISOString();

    if (isGuest) {
      if (guestWorkouts.length >= 5) {
        Alert.alert(
          'Guest Limit Reached',
          'Sign up to log unlimited workouts and compete in clan wars.',
          [
            { text: 'Later',   style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/(auth)/login?mode=signup') },
          ],
        );
        return;
      }
      addGuestWorkout({
        type: 'strength',
        started_at: startedAt,
        completed_at: now,
        duration_seconds: elapsedSeconds,
        sets: [...strengthSets],
        route_data: null,
      });
      reset();
      Alert.alert(
        'Workout Saved Locally',
        `${guestWorkouts.length + 1}/5 guest workouts used. Sign up to sync to server.`,
        [{ text: 'OK', onPress: () => router.replace('/(app)/home') }],
      );
      return;
    }

    try {
      await submitWorkout.mutateAsync({
        type: 'strength',
        started_at: startedAt,
        completed_at: now,
        duration_seconds: elapsedSeconds,
        sets: [...strengthSets],
        route_data: null,
        source: 'manual',
        idempotency_key: idempotencyKey,
      });

      const exerciseMap = new Map<string, number>();
      for (const s of strengthSets) {
        const setScore = calculateStrengthRawScore([s]);
        exerciseMap.set(s.exercise, (exerciseMap.get(s.exercise) ?? 0) + setScore);
      }
      const avgScore = provisionalScore / Math.max(exerciseMap.size, 1);
      const breakdown = Array.from(exerciseMap.entries()).map(([ex, score]) => ({
        exercise: ex,
        score: Math.round(score),
        rating: score > avgScore * 1.2
          ? 'exceeded' as const
          : score < avgScore * 0.8
            ? 'below' as const
            : 'met' as const,
      }));

      queryClient.invalidateQueries({ queryKey: ['profile'] });

      setVictoryData({
        score: provisionalScore,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false,
        currencyEarned: Math.round(provisionalScore * 0.1),
        breakdown,
      });
      setShowVictory(true);
    } catch {
      Alert.alert('Error', 'Failed to submit workout. Please try again.');
    }
  }

  async function handleRecordVideo() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to record workout videos.');
        return;
      }
      setVideoStatus('recording');
      setVideoError(null);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 120,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (result.canceled) { setVideoStatus('idle'); return; }

      const videoUri = result.assets[0].uri;
      setVideoStatus('uploading');

      const fileName  = `workouts/${idempotencyKey || Date.now()}_form.mp4`;
      const response  = await fetch(videoUri);
      const blob      = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('workout-videos')
        .upload(fileName, blob, { contentType: 'video/mp4' });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from('workout-videos')
        .getPublicUrl(fileName);

      setVideoStatus('analyzing');

      const primaryExercise = strengthSets.length > 0
        ? strengthSets[0].exercise.toLowerCase().replace(/\s+/g, '_')
        : 'squat';

      const exerciseTypeMap: Record<string, string> = {
        squat: 'squat', back_squat: 'squat', front_squat: 'squat',
        'push-ups': 'push_up', push_ups: 'push_up', pushups: 'push_up',
        lunge: 'lunge', lunges: 'lunge', walking_lunges: 'lunge',
        bicep_curl: 'bicep_curl', curls: 'bicep_curl', dumbbell_curl: 'bicep_curl',
        shoulder_press: 'shoulder_press', overhead_press: 'shoulder_press', ohp: 'shoulder_press',
        jumping_jack: 'jumping_jack', jumping_jacks: 'jumping_jack',
      };
      const exerciseType = exerciseTypeMap[primaryExercise] || 'squat';

      const analysisData = await triggerVideoAnalysis({
        videoUrl: urlData.publicUrl,
        exerciseType,
        workoutId: idempotencyKey || undefined,
        userId: session?.user?.id,
      });

      setAnalysisResult(analysisData);
      setVideoStatus('done');
    } catch (err: any) {
      setVideoError(err.message || 'Video analysis failed');
      setVideoStatus('error');
    }
  }

  // ── Derived display values ────────────────────────────────────────────────────

  const timerLabel = `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;
  // XP: provisional score / 10, max out at 1200 for display purposes
  const xpEarned  = Math.round(provisionalScore * 0.08);
  const xpMax     = 1200;
  const lvl       = 42; // TODO: derive from profile.level when field exists
  // ScoreRing percentages
  const currentRingPct = Math.min((displayScore / eliteTarget) * 100, 100);
  const eliteRingPct   = 100; // static target ring is always full

  // Total volume for GPS/cardio mini panel placeholder
  const totalVolKg = (strengthSets ?? []).reduce(
    (acc: number, s: StrengthSet) => acc + s.reps * s.weight_kg,
    0,
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ScreenBackground glowColor={C.purple} glowOpacity={0.14} glowPosition="top" withStarField>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── TOP APP BAR ────────────────────────────────────────────────── */}
          <Reanimated.View
            style={[
              headerEntrance.animatedStyle,
              {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                paddingBottom: 16,
              },
            ]}
          >
            {/* Cancel */}
            <Reanimated.View style={cancelPress.animatedStyle}>
              <Pressable
                onPress={() => setShowDiscardConfirm(true)}
                onPressIn={cancelPress.onPressIn}
                onPressOut={cancelPress.onPressOut}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: C.elevated,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
              >
                <FontAwesome name="times" size={12} color={C.error} />
                <Text style={{ color: C.error, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
                  Cancel
                </Text>
              </Pressable>
            </Reanimated.View>

            {/* Timer — teal glow when active */}
            <Reanimated.View style={[timerGlow.glowStyle, { alignItems: 'center' }]}>
              <Text style={{ color: C.text, fontFamily: 'Epilogue-Bold', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                Strength
              </Text>
              <Text style={{ color: C.teal, fontFamily: 'Lexend-SemiBold', fontSize: 22 }}>
                {timerLabel}
              </Text>
            </Reanimated.View>

            {/* Points pill */}
            <ResourcePill
              value={displayScore}
              icon="🏆"
              color={C.gold}
              size="sm"
            />
          </Reanimated.View>

          {/* ── HEADER CARD: WEIGHT LIFTING title ──────────────────────────── */}
          <Card
            variant="elevated"
            style={{
              marginBottom: 12,
              borderBottomWidth: 3,
              borderBottomColor: C.teal,
            }}
          >
            <View>
              <Text
                style={{
                  fontFamily: 'Epilogue-Black',
                  fontSize: 26,
                  fontStyle: 'italic',
                  color: C.teal,
                  letterSpacing: -0.5,
                  textTransform: 'uppercase',
                }}
              >
                WEIGHT LIFTING
              </Text>
              <Text
                style={{
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: C.outline,
                  marginTop: 2,
                }}
              >
                Iron &amp; Steel Protocol
              </Text>
            </View>
          </Card>

          {/* ── GUEST BANNER ───────────────────────────────────────────────── */}
          {isGuest && (
            <View
              style={{
                backgroundColor: 'rgba(255,215,9,0.08)',
                borderRadius: 12,
                padding: 10,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,215,9,0.2)',
              }}
            >
              <Text style={{ color: C.gold, fontSize: 11, textAlign: 'center', fontFamily: 'Lexend-SemiBold' }}>
                Guest mode — {5 - guestWorkouts.length} workouts remaining
              </Text>
            </View>
          )}

          {/* ── EXERCISE INPUT PANEL ───────────────────────────────────────── */}
          <Card variant="default" style={{ marginBottom: 12 }}>

            {/* Search / exercise picker row */}
            <Pressable
              onPress={() => setShowExercises((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.surface,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: 'rgba(206,150,255,0.2)',
              }}
            >
              <FontAwesome name="search" size={16} color={C.teal} />
              <Text
                style={{
                  flex: 1,
                  color: exercise ? C.text : C.outline,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {exercise
                  ? `${exercise}${isBodyweight ? '  (BW)' : ''}`
                  : 'SEARCH EXERCISE (e.g. Bench Press)'}
              </Text>
              <FontAwesome
                name={showExercises ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={C.outline}
              />
            </Pressable>

            {/* Exercise dropdown */}
            {showExercises && (
              <View
                style={{
                  borderRadius: 12,
                  marginBottom: 12,
                  maxHeight: 200,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: 'rgba(206,150,255,0.15)',
                  overflow: 'hidden',
                }}
              >
                <ScrollView nestedScrollEnabled>
                  {COMMON_EXERCISES.map((ex) => (
                    <Pressable
                      key={ex}
                      onPress={() => { setExercise(ex); setShowExercises(false); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        backgroundColor: exercise === ex ? C.elevated : 'transparent',
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(70,70,92,0.12)',
                      }}
                    >
                      <Text style={{ flex: 1, color: C.text, fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
                        {ex}
                      </Text>
                      {BODYWEIGHT_EXERCISES.has(ex) && (
                        <Text style={{ color: C.outline, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
                          BW
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Bodyweight notice */}
            {isBodyweight && (
              <View
                style={{
                  backgroundColor: C.container,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: C.muted, fontFamily: 'BeVietnamPro-Regular', fontSize: 11, textAlign: 'center' }}>
                  {profile?.body_weight_kg
                    ? `Bodyweight exercise — using ${profile.body_weight_kg} kg from your profile`
                    : 'Bodyweight exercise — enter your weight or set it in Body Data settings'}
                </Text>
              </View>
            )}

            {/* SET label row + reps/weight inputs */}
            {strengthSets.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: C.high,
                  borderRadius: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: C.teal,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: C.text }}>
                  SET {strengthSets.length + 1}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                      REPS
                    </Text>
                    <Reanimated.View style={[{ width: 64 }, repsBounce]}>
                      <HUDInput
                        value={reps}
                        onChangeText={setReps}
                        keyboardType="numeric"
                        placeholder="12"
                      />
                    </Reanimated.View>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                      WEIGHT (LBS)
                    </Text>
                    <Reanimated.View style={[{ width: 80 }, weightBounce]}>
                      <HUDInput
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="numeric"
                        placeholder={isBodyweight ? 'BW' : '40'}
                        unit="lbs"
                      />
                    </Reanimated.View>
                  </View>
                </View>
              </View>
            )}

            {/* First set — no label yet, just inputs */}
            {strengthSets.length === 0 && (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <Reanimated.View style={[{ flex: 1 }, repsBounce]}>
                  <HUDInput
                    label="Reps"
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="numeric"
                    placeholder="12"
                  />
                </Reanimated.View>
                <Reanimated.View style={[{ flex: 1 }, weightBounce]}>
                  <HUDInput
                    label={isBodyweight ? 'BW (lbs)' : 'Weight (lbs)'}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="numeric"
                    placeholder="40"
                    unit="lbs"
                  />
                </Reanimated.View>
              </View>
            )}

            {/* ADD SET button */}
            <Reanimated.View style={[addSetPress.animatedStyle, addSetGlow.glowStyle]}>
              <Pressable
                onPress={handleAddSet}
                onPressIn={addSetPress.onPressIn}
                onPressOut={addSetPress.onPressOut}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.purple,
                  shadowColor: C.purple,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  elevation: 6,
                }}
              >
                <FontAwesome name="plus-circle" size={16} color="#000" />
                <Text style={{ color: '#000', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 1 }}>
                  ADD SET {strengthSets.length > 0 ? strengthSets.length + 1 : ''}
                </Text>
              </Pressable>
            </Reanimated.View>

            {/* Diminishing returns warning after set 3 */}
            {strengthSets.length >= 3 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  backgroundColor: 'rgba(255,110,132,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,110,132,0.2)',
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 12,
                }}
              >
                <FontAwesome name="warning" size={11} color={C.error} style={{ marginTop: 1 }} />
                <Text
                  style={{
                    flex: 1,
                    color: 'rgba(255,178,185,0.9)',
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    letterSpacing: 0.8,
                    lineHeight: 15,
                    textTransform: 'uppercase',
                  }}
                >
                  Diminishing Returns after Set 3. Focus on quality over volume for hypertrophy efficiency.
                </Text>
              </View>
            )}
          </Card>

          {/* ── LOGGED SETS ────────────────────────────────────────────────── */}
          {strengthSets.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <AccentLine />
                <Text style={{ fontFamily: 'Epilogue-Bold', color: C.text, fontSize: 14 }}>
                  Logged Sets ({strengthSets.length})
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {strengthSets.map((s, i) => (
                  <AnimatedSetRow key={i} set={s} index={i} onRemove={removeStrengthSet} />
                ))}
              </View>
            </View>
          )}

          {/* ── SCORE HUD — two metric panels ──────────────────────────────── */}
          <Reanimated.View style={scoreEntrance.animatedStyle}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>

              {/* Current Volume Score */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: C.elevated,
                  borderRadius: 14,
                  padding: 16,
                  borderBottomWidth: 4,
                  borderBottomColor: C.purple,
                  shadowColor: C.purple,
                  shadowOpacity: 0.18,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                  position: 'relative',
                }}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  Current Volume Score
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontFamily: 'Epilogue-Black', fontSize: 34, color: C.purple }}>
                    {displayScore.toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: C.purpleDim }}>
                    VOL
                  </Text>
                </View>
                <ScoreBadge score={lastAddedScore} visible={showScoreBadge} />
              </View>

              {/* Predicted Target */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: C.elevated,
                  borderRadius: 14,
                  padding: 16,
                  borderBottomWidth: 4,
                  borderBottomColor: C.teal,
                  shadowColor: C.teal,
                  shadowOpacity: 0.12,
                  shadowRadius: 20,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                  Predicted Target
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ fontFamily: 'Epilogue-Black', fontSize: 34, color: C.teal }}>
                    {Math.round(eliteTarget).toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: C.teal, opacity: 0.7 }}>
                    ELITE
                  </Text>
                </View>
              </View>
            </View>
          </Reanimated.View>

          {/* ── SCORE RINGS + LEVEL ────────────────────────────────────────── */}
          <Card variant="default" style={{ marginBottom: 12, alignItems: 'center' }}>

            {/* Twin score rings */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 20 }}>
              {/* Current score ring */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScoreRing
                  percentage={currentRingPct}
                  size={110}
                  strokeWidth={8}
                  glowing
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Epilogue-Black', fontSize: 20, color: C.purple }}>
                      {displayScore > 0 ? displayScore.toLocaleString() : '—'}
                    </Text>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 8, color: C.outline, letterSpacing: 1 }}>
                      SCORE
                    </Text>
                  </View>
                </ScoreRing>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: C.muted, letterSpacing: 0.8 }}>
                  CURRENT
                </Text>
              </View>

              {/* Target / elite ring */}
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ScoreRing
                  percentage={eliteRingPct}
                  size={110}
                  strokeWidth={8}
                  color={C.teal}
                  trackColor="#1a3a3f"
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Epilogue-Black', fontSize: 20, color: C.teal }}>
                      {Math.round(eliteTarget).toLocaleString()}
                    </Text>
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 8, color: C.outline, letterSpacing: 1 }}>
                      ELITE
                    </Text>
                  </View>
                </ScoreRing>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: C.muted, letterSpacing: 0.8 }}>
                  TARGET
                </Text>
              </View>
            </View>

            <Divider />

            {/* Level indicator */}
            <View style={{ width: '100%', alignItems: 'center', gap: 12 }}>
              {/* Level ring badge */}
              <View style={{ position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' }}>
                <ScoreRing
                  percentage={Math.min((xpEarned / xpMax) * 100, 100)}
                  size={90}
                  strokeWidth={7}
                >
                  <Text style={{ fontFamily: 'Epilogue-Black', fontSize: 18, color: C.text }}>
                    LVL {lvl}
                  </Text>
                </ScoreRing>
              </View>

              {/* XP progress bar */}
              <View style={{ width: '100%', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Next Level
                  </Text>
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline }}>
                    {xpEarned} / {xpMax} XP
                  </Text>
                </View>
                <ProgressBar
                  current={xpEarned}
                  max={xpMax}
                  color={C.purpleDim}
                  height="md"
                />
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.gold, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>
                  +{xpEarned} XP EARNED THIS SESSION
                </Text>
              </View>
            </View>
          </Card>

          {/* ── CARDIO / GPS MINI PANEL ─────────────────────────────────────── */}
          <Card variant="default" style={{ marginBottom: 12, overflow: 'hidden', padding: 0 }}>
            {/* Map placeholder */}
            <View
              style={{
                height: 100,
                backgroundColor: '#0a1a2a',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Grid lines — subtle city-map feel */}
              {[0, 1, 2, 3, 4].map((i) => (
                <View
                  key={`h${i}`}
                  style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top: (i + 1) * 20,
                    height: 1,
                    backgroundColor: 'rgba(129,236,255,0.06)',
                  }}
                />
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={`v${i}`}
                  style={{
                    position: 'absolute',
                    top: 0, bottom: 0,
                    left: (i + 1) * 48,
                    width: 1,
                    backgroundColor: 'rgba(129,236,255,0.06)',
                  }}
                />
              ))}

              {/* Verified badge */}
              <View
                style={{
                  position: 'absolute',
                  top: 8, left: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(12,12,31,0.8)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255,215,9,0.35)',
                }}
              >
                <FontAwesome name="check-circle" size={10} color={C.gold} />
                <Text style={{ color: C.gold, fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>
                  Verified
                </Text>
              </View>

              {/* BPM indicator */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8, right: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(255,110,132,0.18)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <FontAwesome name="heart" size={10} color={C.error} />
                <Text style={{ color: C.error, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>— BPM</Text>
              </View>

              {/* Total tonnage overlay */}
              {totalVolKg > 0 && (
                <Text
                  style={{
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 13,
                    color: C.teal,
                    opacity: 0.7,
                  }}
                >
                  {totalVolKg.toLocaleString()} kg lifted
                </Text>
              )}
            </View>

            {/* Stat row */}
            <View
              style={{
                flexDirection: 'row',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderTopWidth: 1,
                borderTopColor: 'rgba(70,70,92,0.15)',
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Sets
                </Text>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: C.teal }}>
                  {strengthSets.length}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(70,70,92,0.2)' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Volume
                </Text>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: C.teal }}>
                  {totalVolKg > 0 ? `${totalVolKg.toFixed(0)} kg` : '—'}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(70,70,92,0.2)' }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Time
                </Text>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: C.teal }}>
                  {timerLabel}
                </Text>
              </View>
            </View>
          </Card>

          {/* ── VIDEO FORM CHECK ────────────────────────────────────────────── */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <AccentLine />
              <Text style={{ fontFamily: 'Epilogue-Bold', color: C.text, fontSize: 14 }}>Form Check</Text>
            </View>

            {videoStatus === 'idle' && (
              <Pressable
                onPress={handleRecordVideo}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: C.container,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(206,150,255,0.12)',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{
                    width: 40, height: 40,
                    borderRadius: 20,
                    backgroundColor: C.high,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="video-camera" size={16} color={C.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
                    Record Form Check
                  </Text>
                  <Text style={{ color: C.outline, fontFamily: 'BeVietnamPro-Regular', fontSize: 11, marginTop: 2 }}>
                    AI rep counting, form scoring, and verification
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={11} color={C.outline} />
              </Pressable>
            )}

            {videoStatus === 'recording' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.container, borderRadius: 14, padding: 14 }}>
                <View style={{ borderColor: 'rgba(239,68,68,0.6)', borderWidth: 2, borderRadius: 20, padding: 4 }}>
                  <ActivityIndicator color={C.error} />
                </View>
                <Text style={{ color: C.error, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Recording...</Text>
              </View>
            )}

            {videoStatus === 'uploading' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.container, borderRadius: 14, padding: 14, shadowColor: C.purple, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 }}>
                <ActivityIndicator color={C.purple} />
                <Text style={{ color: C.purple, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Uploading video...</Text>
              </View>
            )}

            {videoStatus === 'analyzing' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.container, borderRadius: 14, padding: 14 }}>
                <ActivityIndicator color={C.gold} />
                <View>
                  <Text style={{ color: C.gold, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Analyzing form...</Text>
                  <Text style={{ color: C.outline, fontFamily: 'BeVietnamPro-Regular', fontSize: 11, marginTop: 2 }}>
                    Counting reps, scoring form, checking technique
                  </Text>
                </View>
              </View>
            )}

            {videoStatus === 'done' && analysisResult && (
              <Card variant="recessed">
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <FontAwesome name="check-circle" size={14} color={C.success} />
                    <Text style={{ color: C.success, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Analysis Complete</Text>
                  </View>
                  <Pressable onPress={() => { setVideoStatus('idle'); setAnalysisResult(null); }}>
                    <Text style={{ color: C.outline, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>Record Again</Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { label: 'Form',   value: analysisResult.form_score != null ? Math.round(analysisResult.form_score) : '—' },
                    { label: 'Reps',   value: analysisResult.valid_rep_count ?? analysisResult.rep_count ?? '—' },
                    { label: 'Status', value: analysisResult.verification_status === 'verified' ? 'Verified' : 'Review',
                      color: analysisResult.verification_status === 'verified' ? C.success : C.gold },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={{
                        flex: 1, alignItems: 'center',
                        backgroundColor: C.surface,
                        borderRadius: 10,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(34,197,94,0.18)',
                      }}
                    >
                      <Text style={{ color: item.color ?? C.text, fontFamily: 'Epilogue-Bold', fontSize: 16 }}>
                        {String(item.value)}
                      </Text>
                      <Text style={{ color: C.outline, fontFamily: 'BeVietnamPro-Regular', fontSize: 9 }}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {videoStatus === 'error' && (
              <Card
                variant="recessed"
                style={{ borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <FontAwesome name="exclamation-circle" size={13} color={C.error} />
                  <Text style={{ color: C.error, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Analysis Failed</Text>
                </View>
                <Text style={{ color: C.outline, fontFamily: 'BeVietnamPro-Regular', fontSize: 11, marginBottom: 8 }}>
                  {videoError}
                </Text>
                <Pressable onPress={() => { setVideoStatus('idle'); setVideoError(null); }}>
                  <Text style={{ color: C.purple, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Try Again</Text>
                </Pressable>
              </Card>
            )}
          </View>

          {/* ── FINISH BATTLE — hero button ─────────────────────────────────── */}
          <Reanimated.View style={[finishPress.animatedStyle, finishGlow.glowStyle]}>
            <Button
              variant="primary"
              size="hero"
              fullWidth
              glowing={strengthSets.length > 0}
              loading={submitWorkout.isPending}
              disabled={submitWorkout.isPending}
              onPress={() => setShowFinishConfirm(true)}
            >
              FINISH BATTLE ⚡
            </Button>
          </Reanimated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Overlays ──────────────────────────────────────────────────────────── */}

      <VictoryScreen
        visible={showVictory}
        workoutType="strength"
        score={victoryData.score}
        trophiesEarned={victoryData.trophies}
        streakCount={victoryData.streak}
        isPersonalBest={victoryData.isPB}
        exerciseBreakdown={victoryData.breakdown}
        currencyEarned={victoryData.currencyEarned}
        onDismiss={() => {
          setShowVictory(false);
          reset();
          router.replace('/(app)/home');
        }}
      />

      <ConfirmModal
        visible={showFinishConfirm}
        title="Finish Workout?"
        message="Are you sure you want to finish this session?"
        confirmText="Finish"
        cancelText="Keep Going"
        onConfirm={() => { setShowFinishConfirm(false); handleFinishWorkout(); }}
        onCancel={() => setShowFinishConfirm(false)}
      />

      <ConfirmModal
        visible={showDiscardConfirm}
        title="Discard Workout?"
        message="This cannot be undone. All logged sets will be lost."
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

      <WorkoutCountdown visible={showCountdown} onComplete={() => setShowCountdown(false)} />

    </ScreenBackground>
  );
}
