import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, TrophyRewards } from '@/constants/theme';
import { VictoryScreen } from '@/components/VictoryScreen';
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
      <View className="bg-white/20 border border-white/40 rounded-full px-3 py-1">
        <Text className="text-white font-bold text-sm">+{Math.round(score)} pts</Text>
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

  // Form state
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [showExercises, setShowExercises] = useState(false);
  const [isBodyweight, setIsBodyweight] = useState(false);

  // Victory screen state
  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState({ score: 0, trophies: 12, streak: 0, isPB: false });

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
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed]);

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
    const s = parseInt(sets, 10);
    const r = parseInt(reps, 10);
    const w = parseFloat(weightKg);

    if (!s || s <= 0 || !r || r <= 0 || isNaN(w) || w < 0) {
      Alert.alert('Error', 'Enter valid sets, reps, and weight');
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

    setSets('');
    setReps('');
    if (!isBodyweight) {
      setWeightKg('');
    }
  }

  async function handleFinishWorkout() {
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
        [{ text: 'OK', onPress: () => router.back() }]
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

      setVictoryData({
        score: provisionalScore,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false, // TODO: check against profile 1RM records
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit workout. Please try again.');
    }
  }

  function handleDiscard() {
    Alert.alert('Discard Workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          reset();
          router.back();
        },
      },
    ]);
  }

  const provisionalScore = calculateStrengthRawScore([...strengthSets]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleDiscard}>
            <Text className="text-danger text-base">Cancel</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-white text-lg font-bold">Strength</Text>
            <Text className="text-text-muted text-xs" style={{ fontFamily: 'SpaceMono' }}>
              {`${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`}
            </Text>
          </View>
          <Pressable
            onPress={handleFinishWorkout}
            disabled={submitWorkout.isPending}
          >
            <Text className="text-success text-base font-bold">
              {submitWorkout.isPending ? 'Saving...' : 'Finish'}
            </Text>
          </Pressable>
        </View>

        {/* Guest indicator */}
        {isGuest && (
          <View className="bg-warning/10 border border-warning/30 rounded-xl p-3 mb-4">
            <Text className="text-warning text-xs text-center font-bold">
              Guest mode — {5 - guestWorkouts.length} workouts remaining
            </Text>
          </View>
        )}

        {/* Provisional Score */}
        <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4 items-center relative">
          <Text className="text-white/50 text-xs uppercase mb-1">
            Estimated Score
          </Text>
          <Text className="text-white text-3xl font-bold">
            {Math.round(provisionalScore)}
          </Text>
          <Text className="text-text-muted text-xs">
            Provisional — final score calculated server-side
          </Text>
          <ScoreBadge score={lastAddedScore} visible={showScoreBadge} />
        </View>

        {/* Logged Sets */}
        {strengthSets.length > 0 && (
          <View className="mb-4">
            <Text className="text-white text-lg font-bold mb-2">
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
        <View className="bg-surface-overlay border border-surface-border rounded-xl p-4">
          <Text className="text-white text-lg font-bold mb-3">Add Exercise</Text>

          {/* Exercise Picker */}
          <Text className="text-white/50 text-xs uppercase mb-1">
            Exercise
          </Text>
          <Pressable
            className="bg-surface-raised border border-surface-border rounded-lg px-3 py-3 mb-3"
            onPress={() => setShowExercises((v) => !v)}
          >
            <Text className={exercise ? 'text-white' : 'text-text-muted'}>
              {exercise || 'Select exercise...'}
              {exercise && isBodyweight ? '  (bodyweight)' : ''}
            </Text>
          </Pressable>

          {showExercises && (
            <View className="bg-surface-raised border border-surface-border rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {COMMON_EXERCISES.map((ex) => (
                  <Pressable
                    key={ex}
                    className="px-3 py-2 border-b border-surface-border active:bg-surface-overlay flex-row items-center"
                    onPress={() => {
                      setExercise(ex);
                      setShowExercises(false);
                    }}
                  >
                    <Text className="text-white flex-1">{ex}</Text>
                    {BODYWEIGHT_EXERCISES.has(ex) && (
                      <Text className="text-text-muted text-xs">BW</Text>
                    )}
                  </Pressable>
                ))}
                <TextInput
                  className="px-3 py-2 text-white"
                  placeholder="Or type custom..."
                  placeholderTextColor={Colors.text.muted}
                  value={exercise}
                  onChangeText={setExercise}
                  onSubmitEditing={() => setShowExercises(false)}
                />
              </ScrollView>
            </View>
          )}

          {/* Bodyweight notice */}
          {isBodyweight && (
            <View className="bg-white/5 border border-white/20 rounded-lg p-2 mb-3">
              <Text className="text-white text-xs text-center">
                {profile?.body_weight_kg
                  ? `Bodyweight exercise — using ${profile.body_weight_kg} kg from your profile`
                  : 'Bodyweight exercise — enter your weight or set it in Body Data settings'}
              </Text>
            </View>
          )}

          {/* Sets / Reps / Weight */}
          <View className="flex-row gap-3 mb-4">
            <NumberInput label="Sets" value={sets} onChangeText={setSets} />
            <NumberInput label="Reps" value={reps} onChangeText={setReps} />
            <NumberInput
              label={isBodyweight ? 'BW (kg)' : 'Weight (kg)'}
              value={weightKg}
              onChangeText={setWeightKg}
              decimal
            />
          </View>

          <Pressable
            className="py-3.5 items-center active:opacity-70"
            style={{ borderWidth: 1, borderColor: '#ffffff' }}
            onPress={handleAddSet}
          >
            <Text className="text-white font-bold">
              <FontAwesome name="plus" size={14} color="#fff" /> Add Set
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <VictoryScreen
        visible={showVictory}
        workoutType="strength"
        score={victoryData.score}
        trophiesEarned={victoryData.trophies}
        streakCount={victoryData.streak}
        isPersonalBest={victoryData.isPB}
        onDismiss={() => {
          setShowVictory(false);
          reset();
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
