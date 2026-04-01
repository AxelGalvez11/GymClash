import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { NumberInput } from '@/components/ui/NumberInput';
import { calculateScoutRawScore } from '@/lib/scoring/raw-score';
import { Colors, TrophyRewards } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useGpsTracking } from '@/hooks/use-gps-tracking';
import { VictoryScreen } from '@/components/VictoryScreen';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ScoutWorkoutScreen() {
  const router = useRouter();
  const { isGuest } = useAuthStore();
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
  const { addGuestWorkout, guestWorkouts } = useGuestWorkoutStore();

  const submitWorkout = useSubmitWorkout();
  const { data: profile } = useProfile();

  const gps = useGpsTracking();
  const [useGps, setUseGps] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState({ score: 0, trophies: 12, streak: 0, isPB: false });

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

  const currentPace = useGps && gps.pace > 0 ? gps.pace : computePace();
  const currentDistance = useGps ? gps.distance : (parseFloat(distanceInput) || distanceKm || 0);

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
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // Registered user: submit to server
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

      setVictoryData({
        score: provisionalScore,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false,
      });
      setShowVictory(true);
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

        {/* GPS / Manual Toggle */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            className={`flex-1 py-2 rounded-xl items-center ${useGps ? 'bg-white' : 'bg-surface-raised border border-surface-border'}`}
            onPress={() => {
              setUseGps(true);
              if (gps.status === 'idle') gps.startTracking();
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome name="map-marker" size={14} color={useGps ? '#000' : Colors.text.secondary} />
              <Text className={useGps ? 'text-black font-bold' : 'text-text-secondary'}>GPS</Text>
            </View>
          </Pressable>
          <Pressable
            className={`flex-1 py-2 rounded-xl items-center ${!useGps ? 'bg-white' : 'bg-surface-raised border border-surface-border'}`}
            onPress={() => {
              setUseGps(false);
              if (gps.status === 'tracking') gps.stopTracking();
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome name="pencil" size={14} color={!useGps ? '#000' : Colors.text.secondary} />
              <Text className={!useGps ? 'text-black font-bold' : 'text-text-secondary'}>Manual</Text>
            </View>
          </Pressable>
        </View>

        {/* Distance Input */}
        <View className="bg-surface-overlay border border-surface-border rounded-xl p-4">
          {useGps ? (
            <>
              <Text className="text-white text-lg font-bold mb-2">GPS Tracking</Text>
              {gps.status === 'tracking' ? (
                <View className="items-center py-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="w-2 h-2 rounded-full bg-success" />
                    <Text className="text-success text-xs font-bold uppercase">Live Tracking</Text>
                  </View>
                  <Text className="text-white text-4xl font-bold" style={{ fontFamily: 'SpaceMono' }}>
                    {gps.distance.toFixed(2)} km
                  </Text>
                  <Text className="text-text-muted text-sm mt-1">
                    Pace: {formatPace(gps.pace)} min/km · {gps.points.length} points
                  </Text>
                </View>
              ) : gps.status === 'error' ? (
                <View className="items-center py-4">
                  <Text className="text-danger text-sm mb-2">GPS unavailable</Text>
                  <Pressable onPress={() => setUseGps(false)}>
                    <Text className="text-white/50 text-sm underline">Switch to manual</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-text-muted text-sm">Starting GPS...</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-white text-lg font-bold mb-2">Enter Distance</Text>
              <Text className="text-white/50 text-sm mb-3">
                Enter the distance you ran, or switch to GPS mode.
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
            </>
          )}
        </View>

        {/* Provisional Note */}
        <View className="mt-4 px-2">
          <Text className="text-text-muted text-xs text-center">
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
        onDismiss={() => {
          setShowVictory(false);
          reset();
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
