import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { useProfile } from '@/hooks/use-profile';
import { HeartRateZoneBox } from '@/components/workout/HeartRateZoneBox';
import { VictoryScreen } from '@/components/VictoryScreen';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { WorkoutCountdown } from '@/components/WorkoutCountdown';
import { TrophyRewards } from '@/constants/theme';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { useEntrance } from '@/hooks/use-entrance';

// ─── Animated pause button with breathing glow ───────────────────────────────
function PauseButton({
  isPaused,
  onPress,
}: {
  isPaused: boolean;
  onPress: () => void;
}) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);
  const { glowStyle } = useGlowPulse(
    isPaused ? '#22c55e' : '#ce96ff',
    0.2,
    0.6,
    2000,
    true,
  );

  return (
    <Reanimated.View style={[pressStyle, glowStyle, { borderRadius: 8 }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: isPaused ? '#22c55e' : '#23233f',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome
          name={isPaused ? 'play' : 'pause'}
          size={14}
          color={isPaused ? '#fff' : '#aaa8c3'}
        />
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Finish button with glow intensifying over session duration ───────────────
function FinishButton({
  isPending,
  elapsedSeconds,
  onPress,
}: {
  isPending: boolean;
  elapsedSeconds: number;
  onPress: () => void;
}) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);
  // Intensity grows from 0.2 → 0.8 over first 20 minutes (1200s)
  const intensity = Math.min(elapsedSeconds / 1200, 1);
  const minOpacity = 0.2 + intensity * 0.3;
  const maxOpacity = 0.5 + intensity * 0.4;
  const { glowStyle } = useGlowPulse('#a434ff', minOpacity, maxOpacity, 1800, true);

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
          backgroundColor: '#a434ff',
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 8,
          opacity: isPending ? 0.6 : 1,
        }}
      >
        <FontAwesome name="check" size={12} color="#fff" />
        <Text style={{ color: '#fff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
          {isPending ? 'Saving...' : 'Finish'}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Timer card with glow pulse ───────────────────────────────────────────────
function TimerCard({ elapsedSeconds, isPaused }: { elapsedSeconds: number; isPaused: boolean }) {
  const { animatedStyle: entranceStyle } = useEntrance(80, 'fade-scale', 320);
  const { glowStyle } = useGlowPulse('#a434ff', 0.15, 0.35, 2800, !isPaused);

  function formatTime(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <Reanimated.View
      style={[
        entranceStyle,
        glowStyle,
        {
          backgroundColor: '#1d1d37',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
          alignItems: 'center',
        },
      ]}
    >
      <Text
        style={{
          color: '#81ecff',
          fontSize: 11,
          fontFamily: 'Lexend-SemiBold',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Elapsed Time
      </Text>
      <Text style={{ color: '#e5e3ff', fontSize: 48, fontFamily: 'Lexend-SemiBold' }}>
        {formatTime(elapsedSeconds)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isPaused ? '#ffd709' : '#10B981',
          }}
        />
        <Text style={{ color: '#aaa8c3', fontSize: 11, fontFamily: 'Lexend-SemiBold', textTransform: 'uppercase' }}>
          {isPaused ? 'Paused' : 'Session Active'}
        </Text>
      </View>
    </Reanimated.View>
  );
}

// ─── Photo verification card with press-scale ────────────────────────────────
function PhotoVerificationCard({
  photoTaken,
  onTakePhoto,
}: {
  photoTaken: boolean;
  onTakePhoto: () => void;
}) {
  const { animatedStyle: entranceStyle } = useEntrance(240, 'fade-slide', 280);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Reanimated.View
      style={[
        entranceStyle,
        {
          backgroundColor: '#23233f',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        },
      ]}
    >
      <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold', marginBottom: 12 }}>
        Photo Verification
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <FontAwesome
          name={photoTaken ? 'check-circle' : 'exclamation-circle'}
          size={16}
          color={photoTaken ? '#4ade80' : '#facc15'}
        />
        <Text
          style={{
            color: photoTaken ? '#4ade80' : '#facc15',
            fontSize: 13,
            fontFamily: 'Lexend-SemiBold',
          }}
        >
          {photoTaken ? 'Photo: Verified' : 'Photo: Not taken'}
        </Text>
      </View>

      <Reanimated.View style={pressStyle}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onTakePhoto}
          style={{
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 8,
            backgroundColor: '#a434ff',
            shadowColor: '#a434ff',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="camera" size={16} color="#000" />
            <Text style={{ color: '#000', fontFamily: 'Epilogue-Bold', fontSize: 15 }}>
              Take Photo
            </Text>
          </View>
        </Pressable>
      </Reanimated.View>

      <Text style={{ color: '#74738b', fontSize: 12, textAlign: 'center', marginTop: 8, fontFamily: 'BeVietnamPro-Regular' }}>
        Take a photo of your treadmill display for verification
      </Text>
    </Reanimated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function TreadmillWorkoutScreen() {
  const router = useRouter();
  const { isGuest } = useAuthStore();
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

  const [showVictory, setShowVictory] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [victoryData, setVictoryData] = useState({
    score: 0,
    trophies: 12,
    streak: 0,
    isPB: false,
    currencyEarned: 0,
  });
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const timerStopped = useRef(false);

  // ── Section entrance animations ────────────────────────────────────────────
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);
  const hrOpacity = useSharedValue(0);
  const hrTranslateY = useSharedValue(16);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const hrStyle = useAnimatedStyle(() => ({
    opacity: hrOpacity.value,
    transform: [{ translateY: hrTranslateY.value }],
  }));

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    headerOpacity.value = withDelay(0, withTiming(1, { duration: 280, easing }));
    headerTranslateY.value = withDelay(0, withTiming(0, { duration: 280, easing }));
    hrOpacity.value = withDelay(360, withTiming(1, { duration: 280, easing }));
    hrTranslateY.value = withDelay(360, withTiming(0, { duration: 280, easing }));
  }, []);

  // Start workout on mount if not active
  useEffect(() => {
    if (!isActive) {
      startWorkout('scout');
    }
  }, [isActive, startWorkout]);

  // Timer
  useEffect(() => {
    if (timerStopped.current || isPaused || showCountdown) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed, isPaused, showCountdown]);

  function handleTakePhoto() {
    Alert.alert(
      'Coming Soon',
      'Camera verification will be available in a future update.'
    );
  }

  async function handleFinishWorkout() {
    timerStopped.current = false; // Defensive reset
    timerStopped.current = true;
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
            {
              text: 'Sign Up',
              onPress: () => router.push('/(auth)/login?mode=signup'),
            },
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
          distance_km: 0,
          avg_pace_min_per_km: 0,
          elevation_gain_m: 0,
        },
      });

      reset();
      Alert.alert(
        'Treadmill Session Saved Locally',
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
          distance_km: 0,
          avg_pace_min_per_km: 0,
          elevation_gain_m: 0,
        },
        source: 'manual',
        idempotency_key: idempotencyKey,
      });

      queryClient.invalidateQueries({ queryKey: ['profile'] });

      setVictoryData({
        score: 0,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false,
        currencyEarned: 0,
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit treadmill session. Please try again.');
    }
  }

  function handleConcludePress() {
    if (submitWorkout.isPending) return;
    setShowFinishConfirm(true);
  }

  function handleDiscard() {
    setShowDiscardConfirm(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0c1f' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header — slides down on mount, pause + finish buttons animated */}
        <Reanimated.View
          style={[
            headerStyle,
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
            },
          ]}
        >
          <Pressable
            onPress={handleDiscard}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#23233f',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            <FontAwesome name="times" size={12} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Cancel</Text>
          </Pressable>

          {/* Pause button — press-scale + breathing glow */}
          <PauseButton isPaused={isPaused} onPress={() => setIsPaused((v) => !v)} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#e5e3ff', fontSize: 18, fontFamily: 'Epilogue-Bold' }}>
              Treadmill
            </Text>
            <Text style={{ color: '#74738b', fontSize: 12, fontFamily: 'Lexend-SemiBold' }}>
              Indoor Session
            </Text>
          </View>

          {/* Finish button — glow intensifies with time */}
          <FinishButton
            isPending={submitWorkout.isPending}
            elapsedSeconds={elapsedSeconds}
            onPress={handleConcludePress}
          />
        </Reanimated.View>

        {/* Guest indicator */}
        {isGuest && (
          <View style={{ backgroundColor: 'rgba(255,215,9,0.1)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#ffd709', fontSize: 12, textAlign: 'center', fontFamily: 'Lexend-SemiBold' }}>
              Guest mode — {5 - guestWorkouts.length} workouts remaining
            </Text>
          </View>
        )}

        {/* Timer card — fade-scale entrance + ambient glow pulse */}
        <TimerCard elapsedSeconds={elapsedSeconds} isPaused={isPaused} />

        {/* Photo Verification — staggered entrance */}
        <PhotoVerificationCard photoTaken={photoTaken} onTakePhoto={handleTakePhoto} />

        {/* Heart Rate Zone — delayed entrance */}
        <Reanimated.View style={hrStyle}>
          <HeartRateZoneBox heartRate={null} maxHR={maxHR} />
        </Reanimated.View>

        {/* Provisional Note */}
        <View style={{ marginTop: 8, paddingHorizontal: 8 }}>
          <Text style={{ color: '#74738b', fontSize: 12, textAlign: 'center', fontFamily: 'BeVietnamPro-Regular' }}>
            Treadmill sessions are scored by duration. Final score and
            validation are calculated server-side after submission.
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
          router.replace('/(app)/home');
        }}
      />

      <ConfirmModal
        visible={showFinishConfirm}
        title="Finish Treadmill?"
        message="Are you sure you want to finish this treadmill session?"
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
        title="Discard Session?"
        message="This cannot be undone. All session data will be lost."
        confirmText="Discard"
        cancelText="Cancel"
        destructive
        onConfirm={() => { setShowDiscardConfirm(false); timerStopped.current = true; reset(); router.replace('/(app)/home'); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      <WorkoutCountdown visible={showCountdown} onComplete={() => setShowCountdown(false)} />
    </SafeAreaView>
  );
}
