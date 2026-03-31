import { useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { GameConfig } from '@/constants/theme';

export default function RecoveryWorkoutScreen() {
  const router = useRouter();
  const {
    isActive,
    startWorkout,
    startedAt,
    idempotencyKey,
    elapsedSeconds,
    updateElapsed,
    reset,
  } = useWorkoutStore();

  const submitWorkout = useSubmitWorkout();

  useEffect(() => {
    if (!isActive) {
      startWorkout('active_recovery');
    }
  }, [isActive, startWorkout]);

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

  const meetsMinimum = elapsedSeconds >= GameConfig.ACTIVE_RECOVERY_MIN_DURATION;

  async function handleFinish() {
    if (!meetsMinimum) {
      Alert.alert(
        'Too Short',
        `Active recovery must be at least ${GameConfig.ACTIVE_RECOVERY_MIN_DURATION / 60} minutes.`
      );
      return;
    }

    if (!startedAt || !idempotencyKey) return;

    try {
      await submitWorkout.mutateAsync({
        type: 'active_recovery',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        duration_seconds: elapsedSeconds,
        sets: null,
        route_data: null,
        source: 'manual',
        idempotency_key: idempotencyKey,
      });

      reset();
      Alert.alert('Recovery Logged', 'Your active recovery session has been recorded. +4 trophies!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to log recovery. Please try again.');
    }
  }

  function handleDiscard() {
    Alert.alert('Discard Recovery?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { reset(); router.back(); } },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-4 items-center justify-center">
        <Pressable onPress={handleDiscard} className="absolute top-4 left-4">
          <Text className="text-danger text-base">Cancel</Text>
        </Pressable>

        <Text className="text-text-secondary text-lg mb-2">Active Recovery</Text>
        <Text className="text-brand text-6xl font-bold mb-4">
          {formatTime(elapsedSeconds)}
        </Text>

        <Text className="text-text-muted text-sm mb-2">
          Stretching, yoga, light walking, mobility work
        </Text>
        <Text className="text-text-muted text-xs mb-8">
          Minimum {GameConfig.ACTIVE_RECOVERY_MIN_DURATION / 60} minutes required
        </Text>

        {/* Progress indicator */}
        <View className="w-full max-w-xs mb-8">
          <View className="h-2 bg-surface-overlay rounded-full overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (elapsedSeconds / GameConfig.ACTIVE_RECOVERY_MIN_DURATION) * 100)}%`,
                backgroundColor: meetsMinimum ? '#00D68F' : '#6C5CE7',
              }}
            />
          </View>
          <Text className="text-text-muted text-xs text-center mt-1">
            {meetsMinimum ? 'Ready to submit' : `${Math.ceil((GameConfig.ACTIVE_RECOVERY_MIN_DURATION - elapsedSeconds) / 60)} min remaining`}
          </Text>
        </View>

        <Pressable
          className={`rounded-xl py-4 px-8 items-center ${
            meetsMinimum ? 'bg-success active:opacity-80' : 'bg-surface-raised'
          }`}
          onPress={handleFinish}
          disabled={submitWorkout.isPending || !meetsMinimum}
        >
          <Text className={`text-lg font-bold ${meetsMinimum ? 'text-white' : 'text-text-muted'}`}>
            {submitWorkout.isPending ? 'Saving...' : meetsMinimum ? 'Complete Recovery' : 'Keep Going'}
          </Text>
        </Pressable>

        <Text className="text-text-muted text-xs mt-6 text-center px-8">
          Active recovery maintains your streak and earns trophies, but does not generate XP or clan contribution.
        </Text>
      </View>
    </SafeAreaView>
  );
}
