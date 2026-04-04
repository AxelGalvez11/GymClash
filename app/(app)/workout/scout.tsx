import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { calculateScoutRawScore } from '@/lib/scoring/raw-score';
import { TrophyRewards } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import { useGpsTracking } from '@/hooks/use-gps-tracking';
import { HeartRateZoneBox } from '@/components/workout/HeartRateZoneBox';
import { VictoryScreen } from '@/components/VictoryScreen';
import { CardioModeSelector } from '@/components/CardioModeSelector';
import { GpsDropOverlay } from '@/components/GpsDropOverlay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WorkoutCountdown } from '@/components/WorkoutCountdown';
import DevicePrompt from '@/components/DevicePrompt';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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
  const [showVictory, setShowVictory] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [victoryData, setVictoryData] = useState({ score: 0, trophies: 12, streak: 0, isPB: false, currencyEarned: 0 });
  const [gpsDropped, setGpsDropped] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const timerStopped = useRef(false);

  // Start workout and GPS on mount if not active
  useEffect(() => {
    if (mode !== 'territory') return;
    if (!isActive) {
      startWorkout('scout');
    }
    if (gps.status === 'idle') {
      gps.startTracking();
    }
  }, [isActive, startWorkout, mode, gps]);

  // Track elapsed time silently for duration_seconds on submission
  useEffect(() => {
    if (mode !== 'territory' || timerStopped.current || isPaused || showCountdown) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, mode, isPaused, showCountdown]);

  // Watch for GPS signal drops in territory mode
  useEffect(() => {
    if (mode === 'territory' && gps.error) {
      setGpsDropped(true);
    } else if (!gps.error) {
      setGpsDropped(false);
    }
  }, [gps.error, mode]);

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

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
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
            <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold' }}>Run</Text>
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

        {/* Large Timer Display */}
        <View className="items-center mb-6">
          <Text style={{ color: '#e5e3ff', fontSize: 48, fontFamily: 'Lexend-SemiBold' }}>
            {`${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`}
          </Text>
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

        {/* Pause Button */}
        <Pressable
          className="w-full py-3 rounded-xl items-center mb-4 active:scale-[0.98]"
          style={{ backgroundColor: isPaused ? '#22c55e' : '#23233f' }}
          onPress={() => setIsPaused((v) => !v)}
        >
          <View className="flex-row items-center gap-2">
            <FontAwesome name={isPaused ? 'play' : 'pause'} size={16} color={isPaused ? '#fff' : '#aaa8c3'} />
            <Text style={{ color: isPaused ? '#fff' : '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>
              {isPaused ? 'RESUME' : 'PAUSE'}
            </Text>
          </View>
        </Pressable>

        {/* Heart Rate Zone */}
        <HeartRateZoneBox heartRate={null} maxHR={maxHR} />

        {/* GPS Tracking */}
        <View className="bg-[#23233f] rounded-xl p-4">
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
              <Text className="text-sm" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Check location permissions and try again</Text>
            </View>
          ) : (
            <View className="items-center py-4">
              <Text className="text-sm" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Starting GPS...</Text>
            </View>
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
        onConfirm={() => { setShowDiscardConfirm(false); reset(); router.replace('/(app)/home'); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      <WorkoutCountdown visible={showCountdown && mode === 'territory'} onComplete={() => setShowCountdown(false)} />
    </SafeAreaView>
  );
}
