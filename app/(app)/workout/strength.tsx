import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, TrophyRewards } from '@/constants/theme';
import { VictoryScreen } from '@/components/VictoryScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WorkoutCountdown } from '@/components/WorkoutCountdown';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { useProfile } from '@/hooks/use-profile';
import { SetRow } from '@/components/ui/SetRow';
import { NumberInput } from '@/components/ui/NumberInput';
import { calculateStrengthRawScore } from '@/lib/scoring/raw-score';
import type { StrengthSet } from '@/types';

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
  return BODYWEIGHT_EXERCISES.has(name) ||
    name.toLowerCase().includes('bodyweight') ||
    name.toLowerCase().includes('body weight');
}

// ─── Per-Exercise Score Badge ────────────────────────────

function ScoreBadge({ score, visible }: { readonly score: number; readonly visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (visible && score > 0) {
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start();
        }, 1500);
      });
    }
  }, [visible, score, opacity, translateY]);

  if (!visible || score <= 0) return null;

  return (
    <Animated.View
      className="absolute right-4 top-2"
      style={{ opacity, transform: [{ translateY }] }}
    >
      <View
        className="rounded-full px-3 py-1"
        style={{
          backgroundColor: 'rgba(206, 150, 255, 0.2)',
          shadowColor: '#ce96ff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 12,
        }}
      >
        <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>+{Math.round(score)} pts</Text>
      </View>
    </Animated.View>
  );
}

export default function StrengthWorkoutScreen() {
  const router = useRouter();
  const { isGuest } = useAuthStore();
  const { data: profile } = useProfile();
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
  const queryClient = useQueryClient();

  // Form state
  const [exercise, setExercise] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [showExercises, setShowExercises] = useState(false);
  const [isBodyweight, setIsBodyweight] = useState(false);
  // Weight is always entered in lbs (default) — converted to kg for scoring
  // Unit preference is set in Settings > Biodata

  // Confirm modal state
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Victory screen state
  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState<{
    readonly score: number;
    readonly trophies: number;
    readonly streak: number;
    readonly isPB: boolean;
    readonly currencyEarned: number;
    readonly breakdown: ReadonlyArray<{
      readonly exercise: string;
      readonly score: number;
      readonly rating: 'exceeded' | 'met' | 'below';
    }>;
  }>({ score: 0, trophies: 12, streak: 0, isPB: false, currencyEarned: 0, breakdown: [] });

  // Timer stop guard
  const timerStopped = useRef(false);

  // Countdown state
  const [showCountdown, setShowCountdown] = useState(true);

  // Per-exercise score feedback
  const [lastAddedScore, setLastAddedScore] = useState(0);
  const [showScoreBadge, setShowScoreBadge] = useState(false);

  // Start workout on mount if not active
  useEffect(() => {
    if (!isActive) {
      startWorkout('strength');
    }
  }, [isActive, startWorkout]);

  // Timer
  useEffect(() => {
    if (timerStopped.current || showCountdown) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, showCountdown]);

  // Detect bodyweight exercise and auto-fill weight
  useEffect(() => {
    const bw = isBodyweightExercise(exercise);
    setIsBodyweight(bw);
    if (bw && profile?.body_weight_kg) {
      setWeightKg(String(profile.body_weight_kg));
    } else if (bw && !profile?.body_weight_kg) {
      // Don't clear — let user enter manually
    }
  }, [exercise, profile?.body_weight_kg]);

  function handleAddSet() {
    if (!exercise.trim()) {
      Alert.alert('Error', 'Select an exercise');
      return;
    }
    const s = 1;
    const r = parseInt(reps, 10);
    const rawWeight = parseFloat(weightKg);
    const w = rawWeight * 0.453592; // Always convert lbs to kg for scoring

    if (!r || r <= 0 || isNaN(rawWeight) || rawWeight < 0) {
      Alert.alert('Error', 'Enter valid reps and weight');
      return;
    }

    // Calculate score before adding (to show delta)
    const scoreBefore = calculateStrengthRawScore([...strengthSets]);

    const newSet: StrengthSet = {
      exercise: exercise.trim(),
      sets: s,
      reps: r,
      weight_kg: w,
    };

    addStrengthSet(newSet);

    // Calculate score after adding
    const scoreAfter = calculateStrengthRawScore([...strengthSets, newSet]);
    const delta = scoreAfter - scoreBefore;

    // Show per-exercise score feedback
    if (delta > 0) {
      setLastAddedScore(delta);
      setShowScoreBadge(false);
      // Force re-render of badge by toggling
      setTimeout(() => setShowScoreBadge(true), 50);
    }

    setReps('');
    if (!isBodyweight) {
      setWeightKg('');
    }
  }

  async function handleFinishWorkout() {
    timerStopped.current = true;
    if (strengthSets.length === 0) {
      Alert.alert('Error', 'Add at least one set before finishing');
      return;
    }

    if (!startedAt || !idempotencyKey) return;

    const now = new Date().toISOString();

    // Guest mode: save locally
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
        [{ text: 'OK', onPress: () => router.replace('/(app)/home') }]
      );
      return;
    }

    // Registered user: submit to server
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

      // Group sets by exercise and compute per-exercise scores
      const exerciseMap = new Map<string, number>();
      for (const s of strengthSets) {
        const setScore = calculateStrengthRawScore([s]);
        exerciseMap.set(s.exercise, (exerciseMap.get(s.exercise) ?? 0) + setScore);
      }
      const avgScore = provisionalScore / Math.max(exerciseMap.size, 1);
      const breakdown = Array.from(exerciseMap.entries()).map(([exercise, score]) => ({
        exercise,
        score: Math.round(score),
        rating: score > avgScore * 1.2 ? 'exceeded' as const : score < avgScore * 0.8 ? 'below' as const : 'met' as const,
      }));

      // Refresh profile to update coin balance
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      setVictoryData({
        score: provisionalScore,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false, // TODO: check against profile 1RM records
        currencyEarned: Math.round(provisionalScore * 0.1),
        breakdown,
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit workout. Please try again.');
    }
  }

  function handleConcludePress() {
    setShowFinishConfirm(true);
  }

  function handleDiscard() {
    setShowDiscardConfirm(true);
  }

  const provisionalScore = calculateStrengthRawScore([...strengthSets]);

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable
            onPress={handleDiscard}
            className="flex-row items-center gap-1.5 bg-[#23233f] rounded-full px-4 py-2 active:scale-[0.98]"
            style={{ borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
          >
            <FontAwesome name="times" size={12} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Cancel</Text>
          </Pressable>
          <View className="items-center">
            <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold' }}>Strength</Text>
            <Text style={{ color: '#74738b', fontSize: 12, fontFamily: 'Lexend-SemiBold' }}>
              {`${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`}
            </Text>
          </View>
          <Pressable
            onPress={handleConcludePress}
            disabled={submitWorkout.isPending}
            className="flex-row items-center gap-1.5 bg-[#a434ff] rounded-full px-4 py-2 active:scale-[0.98]"
            style={{ opacity: submitWorkout.isPending ? 0.6 : 1 }}
          >
            <FontAwesome name="check" size={12} color="#fff" />
            <Text style={{ color: '#fff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
              {submitWorkout.isPending ? 'Saving...' : 'Finish'}
            </Text>
          </Pressable>
        </View>

        {/* Guest indicator */}
        {isGuest && (
          <View className="bg-warning/10 rounded-xl p-3 mb-4">
            <Text className="text-warning text-xs text-center" style={{ fontFamily: 'Lexend-SemiBold' }}>
              Guest mode — {5 - guestWorkouts.length} workouts remaining
            </Text>
          </View>
        )}

        {/* Provisional Score */}
        <View
          className="bg-[#1d1d37] rounded-xl p-4 mb-4 items-center relative"
          style={{
            shadowColor: '#ce96ff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }}
        >
          <Text
            className="text-xs uppercase mb-1"
            style={{ color: '#81ecff', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
          >
            Estimated Score
          </Text>
          <Text style={{ color: '#e5e3ff', fontSize: 32, fontFamily: 'Lexend-SemiBold' }}>
            {Math.round(provisionalScore)}
          </Text>
          <Text className="text-xs" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
            Provisional — final score calculated server-side
          </Text>
          <ScoreBadge score={lastAddedScore} visible={showScoreBadge} />
        </View>

        {/* Logged Sets */}
        {strengthSets.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>
              Logged Sets ({strengthSets.length})
            </Text>
            <View className="gap-2">
              {strengthSets.map((s, i) => (
                <SetRow key={i} set={s} index={i} onRemove={removeStrengthSet} />
              ))}
            </View>
          </View>
        )}

        {/* Add Set Form */}
        <View className="bg-[#23233f] rounded-xl p-4">
          <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>Add Exercise</Text>

          {/* Exercise Picker */}
          <Text
            className="text-xs uppercase mb-1"
            style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
          >
            Exercise
          </Text>
          <Pressable
            className="bg-[#000000] rounded-lg px-3 py-3 mb-3 active:scale-[0.98]"
            onPress={() => setShowExercises((v) => !v)}
          >
            <Text style={{ color: exercise ? '#e5e3ff' : '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
              {exercise || 'Select exercise...'}
              {exercise && isBodyweight ? '  (bodyweight)' : ''}
            </Text>
          </Pressable>

          {showExercises && (
            <View className="bg-[#000000] rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {COMMON_EXERCISES.map((ex) => (
                  <Pressable
                    key={ex}
                    className="px-3 py-2 active:bg-[#23233f] flex-row items-center"
                    onPress={() => {
                      setExercise(ex);
                      setShowExercises(false);
                    }}
                  >
                    <Text className="flex-1" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>{ex}</Text>
                    {BODYWEIGHT_EXERCISES.has(ex) && (
                      <Text className="text-xs" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}>BW</Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bodyweight notice */}
          {isBodyweight && (
            <View className="bg-[#1d1d37] rounded-lg p-2 mb-3">
              <Text className="text-xs text-center" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
                {profile?.body_weight_kg
                  ? `Bodyweight exercise — using ${profile.body_weight_kg} kg from your profile`
                  : 'Bodyweight exercise — enter your weight or set it in Body Data settings'}
              </Text>
            </View>
          )}

          {/* Unit Toggle */}

          {/* Sets / Reps / Weight */}
          <View className="flex-row gap-3 mb-4">
            <NumberInput label="Reps" value={reps} onChangeText={setReps} />
            <NumberInput
              label={isBodyweight ? 'BW (lbs)' : 'Weight (lbs)'}
              value={weightKg}
              onChangeText={setWeightKg}
              decimal
            />
          </View>

          <Pressable
            className="py-3.5 items-center rounded-lg active:scale-[0.98]"
            style={{
              backgroundColor: '#ce96ff',
              shadowColor: '#ce96ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
            onPress={handleAddSet}
          >
            <Text style={{ color: '#000000', fontFamily: 'Epilogue-Bold', fontSize: 15 }}>
              <FontAwesome name="plus" size={14} color="#000" /> Add Set
            </Text>
          </Pressable>
        </View>

        {/* Camera — Future Implementation */}
        <View className="bg-[#23233f] rounded-xl p-4 mt-4">
          <Pressable
            className="flex-row items-center gap-3 active:scale-[0.98]"
            onPress={() => Alert.alert('Coming Soon', 'Camera integration for photo evidence will be available in a future update.')}
          >
            <View className="w-10 h-10 rounded-full bg-[#1d1d37] items-center justify-center">
              <FontAwesome name="camera" size={16} color="#ce96ff" />
            </View>
            <View className="flex-1">
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Take Photo</Text>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>Photo evidence for verified workouts</Text>
            </View>
            <View className="bg-[#1d1d37] rounded-full px-2 py-0.5">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>SOON</Text>
            </View>
          </Pressable>
        </View>

        {/* Video Form Check — Future Implementation */}
        <View className="bg-[#23233f] rounded-xl p-4 mt-3">
          <Pressable
            className="flex-row items-center gap-3 active:scale-[0.98]"
            onPress={() => Alert.alert('Coming Soon', 'AI form analysis for rep counting and range-of-motion verification will be available in a future update.')}
          >
            <View className="w-10 h-10 rounded-full bg-[#1d1d37] items-center justify-center">
              <FontAwesome name="video-camera" size={16} color="#81ecff" />
            </View>
            <View className="flex-1">
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Form Check</Text>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>AI-powered rep counting and ROM analysis</Text>
            </View>
            <View className="bg-[#1d1d37] rounded-full px-2 py-0.5">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>SOON</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

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
        onConfirm={() => { setShowDiscardConfirm(false); reset(); router.replace('/(app)/home'); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      <WorkoutCountdown visible={showCountdown} onComplete={() => setShowCountdown(false)} />
    </SafeAreaView>
  );
}
