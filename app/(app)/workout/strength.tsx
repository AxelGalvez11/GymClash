import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
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
  'Lunges',
  'Leg Press',
  'Lat Pulldown',
];

export default function StrengthWorkoutScreen() {
  const router = useRouter();
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

  const submitWorkout = useSubmitWorkout();

  // Form state for adding a new set
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [showExercises, setShowExercises] = useState(false);

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

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

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

    const newSet: StrengthSet = {
      exercise: exercise.trim(),
      sets: s,
      reps: r,
      weight_kg: w,
    };

    addStrengthSet(newSet);
    setSets('');
    setReps('');
    setWeightKg('');
  }

  function handleRemoveSet(index: number) {
    removeStrengthSet(index);
  }

  async function handleFinishWorkout() {
    if (strengthSets.length === 0) {
      Alert.alert('Error', 'Add at least one set before finishing');
      return;
    }

    if (!startedAt || !idempotencyKey) return;

    const now = new Date().toISOString();

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

      reset();
      Alert.alert('Workout Submitted', 'Your workout has been submitted for validation!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleDiscard}>
            <Text className="text-danger text-base">Cancel</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-white text-lg font-bold">Strength</Text>
            <Text className="text-brand text-2xl font-bold">
              {formatTime(elapsedSeconds)}
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

        {/* Provisional Score */}
        <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4 items-center">
          <Text className="text-text-secondary text-xs uppercase mb-1">
            Estimated Score
          </Text>
          <Text className="text-white text-3xl font-bold">
            {Math.round(provisionalScore)}
          </Text>
          <Text className="text-text-muted text-xs">
            Provisional — final score calculated server-side
          </Text>
        </View>

        {/* Logged Sets */}
        {strengthSets.length > 0 && (
          <View className="mb-4">
            <Text className="text-white text-lg font-bold mb-2">
              Logged Sets ({strengthSets.length})
            </Text>
            <View className="gap-2">
              {strengthSets.map((s, i) => (
                <SetRow key={i} set={s} index={i} onRemove={handleRemoveSet} />
              ))}
            </View>
          </View>
        )}

        {/* Add Set Form */}
        <View className="bg-surface-overlay border border-surface-border rounded-xl p-4">
          <Text className="text-white text-lg font-bold mb-3">Add Set</Text>

          {/* Exercise Picker */}
          <Text className="text-text-secondary text-xs uppercase mb-1">
            Exercise
          </Text>
          <Pressable
            className="bg-surface-raised border border-surface-border rounded-lg px-3 py-3 mb-3"
            onPress={() => setShowExercises((v) => !v)}
          >
            <Text className={exercise ? 'text-white' : 'text-text-muted'}>
              {exercise || 'Select exercise...'}
            </Text>
          </Pressable>

          {showExercises && (
            <View className="bg-surface-raised border border-surface-border rounded-lg mb-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                {COMMON_EXERCISES.map((ex) => (
                  <Pressable
                    key={ex}
                    className="px-3 py-2 border-b border-surface-border active:bg-surface-overlay"
                    onPress={() => {
                      setExercise(ex);
                      setShowExercises(false);
                    }}
                  >
                    <Text className="text-white">{ex}</Text>
                  </Pressable>
                ))}
                {/* Custom exercise input */}
                <TextInput
                  className="px-3 py-2 text-white"
                  placeholder="Or type custom..."
                  placeholderTextColor="#6A6A8A"
                  value={exercise}
                  onChangeText={(t) => {
                    setExercise(t);
                  }}
                  onSubmitEditing={() => setShowExercises(false)}
                />
              </ScrollView>
            </View>
          )}

          {/* Sets / Reps / Weight */}
          <View className="flex-row gap-3 mb-4">
            <NumberInput label="Sets" value={sets} onChangeText={setSets} />
            <NumberInput label="Reps" value={reps} onChangeText={setReps} />
            <NumberInput
              label="Weight (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              decimal
            />
          </View>

          <Pressable
            className="bg-brand rounded-xl py-3 items-center active:bg-brand-dark"
            onPress={handleAddSet}
          >
            <Text className="text-white font-bold">
              <FontAwesome name="plus" size={14} color="#fff" /> Add Set
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
