import { useState, useEffect, useCallback, useRef } from 'react';
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
import { CardioModeSelector } from '@/components/CardioModeSelector';
import { GpsDropOverlay } from '@/components/GpsDropOverlay';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function ScoutWorkoutScreen() {
  const router = useRouter();
  const { isGuest } = useAuthStore();
  const [mode, setMode] = useState<'select' | 'territory'>('select');
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
  const [victoryData, setVictoryData] = useState({ score: 0, trophies: 12, streak: 0, isPB: false, currencyEarned: 0 });
  const [gpsDropped, setGpsDropped] = useState(false);
  const timerStopped = useRef(false);

  // Start workout on mount if not active
  useEffect(() => {
    if (mode !== 'territory') return;
    if (!isActive) {
      startWorkout('scout');
    }
  }, [isActive, startWorkout, mode]);

  // Track elapsed time silently for duration_seconds on submission
  useEffect(() => {
    if (mode !== 'territory') return;
    if (timerStopped.current) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, mode]);

  // Watch for GPS signal drops in territory mode
  useEffect(() => {
    if (mode === 'territory' && useGps && gps.error) {
      setGpsDropped(true);
    } else if (!gps.error) {
      setGpsDropped(false);
    }
  }, [gps.error, mode, useGps]);

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
    timerStopped.current = true;
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
        [{ text: 'OK', onPress: () => router.replace('/(app)/home') }]
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
        currencyEarned: Math.round(provisionalScore * 0.1),
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit run. Please try again.');
    }
  }

  function handleConcludePress() {
    if (submitWorkout.isPending) return;
    Alert.alert(
      'Finish Workout?',
      'Are you sure you want to finish this session?',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Finish', onPress: handleFinishWorkout },
      ]
    );
  }

  function handleDiscard() {
    Alert.alert('Discard Run?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          reset();
          router.replace('/(app)/home');
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

  if (mode === 'select') {
    return (
      <CardioModeSelector
        onSelectTerritory={() => setMode('territory')}
        onSelectTreadmill={() => router.push('/(app)/workout/treadmill')}
        onBack={() => router.back()}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleDiscard} className="active:scale-[0.98]">
            <Text className="text-danger text-base" style={{ fontFamily: 'BeVietnamPro-Regular' }}>Cancel</Text>
          </Pressable>
          <View className="items-center">
            <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold' }}>Run</Text>
            <Text style={{ color: '#74738b', fontSize: 12, fontFamily: 'Lexend-SemiBold' }}>
              {`${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`}
            </Text>
          </View>
          <Pressable
            onPress={handleConcludePress}
            disabled={submitWorkout.isPending}
            className="active:scale-[0.98]"
          >
            <Text className="text-success text-base" style={{ fontFamily: 'Epilogue-Bold' }}>
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

        {/* Stats Grid */}
        <View className="flex-row gap-3 mb-6">
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text
              className="text-xs uppercase mb-1"
              style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
            >
              Distance
            </Text>
            <Text style={{ color: '#e5e3ff', fontSize: 24, fontFamily: 'Lexend-SemiBold' }}>
              {currentDistance > 0 ? currentDistance.toFixed(2) : '0.00'}
            </Text>
            <Text className="text-xs" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>km</Text>
          </View>
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text
              className="text-xs uppercase mb-1"
              style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
            >
              Pace
            </Text>
            <Text style={{ color: '#e5e3ff', fontSize: 24, fontFamily: 'Lexend-SemiBold' }}>
              {formatPace(currentPace)}
            </Text>
            <Text className="text-xs" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>min/km</Text>
          </View>
          <View className="bg-[#1d1d37] rounded-xl p-4 flex-1 items-center">
            <Text
              className="text-xs uppercase mb-1"
              style={{ color: '#81ecff', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
            >
              Score
            </Text>
            <Text style={{ color: '#e5e3ff', fontSize: 24, fontFamily: 'Lexend-SemiBold' }}>
              {Math.round(provisionalScore)}
            </Text>
            <Text className="text-xs" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>est.</Text>
          </View>
        </View>

        {/* GPS / Manual Toggle */}
        <View className="flex-row gap-2 mb-4">
          <Pressable
            className="flex-1 py-2 rounded-xl items-center active:scale-[0.98]"
            style={{ backgroundColor: useGps ? '#ce96ff' : '#23233f' }}
            onPress={() => {
              setUseGps(true);
              if (gps.status === 'idle') gps.startTracking();
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome name="map-marker" size={14} color={useGps ? '#000' : '#aaa8c3'} />
              <Text style={{
                color: useGps ? '#000' : '#aaa8c3',
                fontFamily: 'Lexend-SemiBold',
              }}>GPS</Text>
            </View>
          </Pressable>
          <Pressable
            className="flex-1 py-2 rounded-xl items-center active:scale-[0.98]"
            style={{ backgroundColor: !useGps ? '#ce96ff' : '#23233f' }}
            onPress={() => {
              setUseGps(false);
              if (gps.status === 'tracking') gps.stopTracking();
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome name="pencil" size={14} color={!useGps ? '#000' : '#aaa8c3'} />
              <Text style={{
                color: !useGps ? '#000' : '#aaa8c3',
                fontFamily: 'Lexend-SemiBold',
              }}>Manual</Text>
            </View>
          </Pressable>
        </View>

        {/* Distance Input */}
        <View className="bg-[#23233f] rounded-xl p-4">
          {useGps ? (
            <>
              <Text className="text-lg mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>GPS Tracking</Text>
              {gps.status === 'tracking' ? (
                <View className="items-center py-4">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View className="w-2 h-2 rounded-full bg-success" />
                    <Text className="text-success text-xs uppercase" style={{ fontFamily: 'Lexend-SemiBold' }}>Live Tracking</Text>
                  </View>
                  <Text style={{ color: '#e5e3ff', fontSize: 36, fontFamily: 'Lexend-SemiBold' }}>
                    {gps.distance.toFixed(2)} km
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
                    Pace: {formatPace(gps.pace)} min/km · {gps.points.length} points
                  </Text>
                </View>
              ) : gps.status === 'error' ? (
                <View className="items-center py-4">
                  <Text className="text-danger text-sm mb-2" style={{ fontFamily: 'BeVietnamPro-Regular' }}>GPS unavailable</Text>
                  <Pressable onPress={() => setUseGps(false)} className="active:scale-[0.98]">
                    <Text className="text-sm underline" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Switch to manual</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="items-center py-4">
                  <Text className="text-sm" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Starting GPS...</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-lg mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>Enter Distance</Text>
              <Text className="text-sm mb-3" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
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
          <Text className="text-xs text-center" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
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
    </SafeAreaView>
  );
}
