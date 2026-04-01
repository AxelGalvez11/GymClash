import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { NumberInput } from '@/components/ui/NumberInput';
import { calculateScoutRawScore } from '@/lib/scoring/raw-score';
import { Colors } from '@/constants/theme';

export default function ScoutWorkoutScreen() {
  const router = useRouter();
  const {
    isActive,
    startWorkout,
    startedAt,
    idempotencyKey,
    elapsedSeconds,
    updateElapsed,
    distanceKm,
    updateDistance,
    reset,
  } = useWorkoutStore();

  const submitWorkout = useSubmitWorkout();

  const [distanceInput, setDistanceInput] = useState('');

  // Start workout on mount if not active
  useEffect(() => {
    if (!isActive) {
      startWorkout('scout');
    }
  }, [isActive, startWorkout]);

  // Track elapsed time silently for duration_seconds on submission
  useEffect(() => {
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed]);

  // Compute pace from elapsed time and distance
  const computePace = useCallback(() => {
    const km = parseFloat(distanceInput) || distanceKm;
    if (km <= 0 || elapsedSeconds <= 0) return 0;
    return elapsedSeconds / 60 / km; // min/km
  }, [distanceInput, distanceKm, elapsedSeconds]);

  const currentPace = computePace();
  const currentDistance = parseFloat(distanceInput) || distanceKm || 0;

  const provisionalScore =
    currentDistance > 0 && currentPace > 0
      ? calculateScoutRawScore({
          distance_km: currentDistance,
          avg_pace_min_per_km: currentPace,
          elevation_gain_m: 0,
        })
      : 0;

  async function handleFinishWorkout() {
    const km = parseFloat(distanceInput);
    if (!km || km <= 0) {
      Alert.alert('Error', 'Enter the distance you ran');
      return;
    }

    if (!startedAt || !idempotencyKey) return;

    const now = new Date().toISOString();
    const pace = elapsedSeconds / 60 / km;

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
          elevation_gain_m: 0, // TODO: GPS elevation when available
        },
        source: 'manual',
        idempotency_key: idempotencyKey,
      });

      reset();
      Alert.alert('Run Submitted', 'Your run has been submitted for validation!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit run. Please try again.');
    }
  }

  function handleDiscard() {
    Alert.alert('Discard Run?', 'This cannot be undone.', [
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

  function formatPace(paceMinPerKm: number): string {
    if (paceMinPerKm <= 0) return '--:--';
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleDiscard}>
            <Text className="text-danger text-base">Cancel</Text>
          </Pressable>
          <View className="items-center">
            <Text className="text-white text-lg font-bold">Run</Text>
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

        {/* Stats Grid */}
        <View className="flex-row gap-3 mb-6">
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-white/50 text-xs uppercase mb-1">
              Distance
            </Text>
            <Text className="text-white text-2xl font-bold">
              {currentDistance > 0 ? currentDistance.toFixed(2) : '0.00'}
            </Text>
            <Text className="text-text-muted text-xs">km</Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-white/50 text-xs uppercase mb-1">
              Pace
            </Text>
            <Text className="text-white text-2xl font-bold">
              {formatPace(currentPace)}
            </Text>
            <Text className="text-text-muted text-xs">min/km</Text>
          </View>
          <View className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-1 items-center">
            <Text className="text-white/50 text-xs uppercase mb-1">
              Score
            </Text>
            <Text className="text-white text-2xl font-bold">
              {Math.round(provisionalScore)}
            </Text>
            <Text className="text-text-muted text-xs">est.</Text>
          </View>
        </View>

        {/* Distance Input */}
        <View className="bg-surface-overlay border border-surface-border rounded-xl p-4">
          <Text className="text-white text-lg font-bold mb-2">
            Enter Distance
          </Text>
          <Text className="text-white/50 text-sm mb-3">
            Enter the distance you ran. GPS tracking coming in a future update.
          </Text>
          <NumberInput
            label="Distance (km)"
            value={distanceInput}
            onChangeText={(t) => {
              setDistanceInput(t);
              const km = parseFloat(t);
              if (!isNaN(km) && km >= 0) {
                updateDistance(km);
              }
            }}
            decimal
          />
        </View>

        {/* Provisional Note */}
        <View className="mt-4 px-2">
          <Text className="text-text-muted text-xs text-center">
            Score is provisional. Final score and validation are calculated server-side after submission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
