import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuthStore } from '@/stores/auth-store';
import { useWorkoutStore, useGuestWorkoutStore } from '@/stores/workout-store';
import { useSubmitWorkout } from '@/hooks/use-workouts';
import { useProfile } from '@/hooks/use-profile';
import { VictoryScreen } from '@/components/VictoryScreen';
import { TrophyRewards } from '@/constants/theme';

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

  const submitWorkout = useSubmitWorkout();
  const { data: profile } = useProfile();

  const [showVictory, setShowVictory] = useState(false);
  const [victoryData, setVictoryData] = useState({
    score: 0,
    trophies: 12,
    streak: 0,
    isPB: false,
  });
  const [photoTaken, setPhotoTaken] = useState(false);
  const timerStopped = useRef(false);

  // Start workout on mount if not active
  useEffect(() => {
    if (!isActive) {
      startWorkout('scout');
    }
  }, [isActive, startWorkout]);

  // Timer
  useEffect(() => {
    if (timerStopped.current) return;
    const interval = setInterval(() => {
      updateElapsed(elapsedSeconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [elapsedSeconds, updateElapsed]);

  function formatTime(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleTakePhoto() {
    Alert.alert(
      'Coming Soon',
      'Camera verification will be available in a future update.'
    );
  }

  async function handleFinishWorkout() {
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
          distance_km: 0,
          avg_pace_min_per_km: 0,
          elevation_gain_m: 0,
        },
        source: 'manual',
        idempotency_key: idempotencyKey,
      });

      setVictoryData({
        score: 0,
        trophies: TrophyRewards.ACCEPTED_WORKOUT,
        streak: profile?.current_streak ?? 0,
        isPB: false,
      });
      setShowVictory(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit treadmill session. Please try again.');
    }
  }

  function handleConcludePress() {
    Alert.alert(
      'Finish Workout?',
      'Are you sure you want to finish this treadmill session?',
      [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Finish', onPress: handleFinishWorkout },
      ]
    );
  }

  function handleDiscard() {
    Alert.alert('Discard Session?', 'This cannot be undone.', [
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

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between py-4">
          <Pressable onPress={handleDiscard} className="active:scale-[0.98]">
            <Text
              className="text-danger text-base"
              style={{ fontFamily: 'BeVietnamPro-Regular' }}
            >
              Cancel
            </Text>
          </Pressable>
          <View className="items-center">
            <Text
              style={{
                color: '#e5e3ff',
                fontSize: 18,
                fontFamily: 'Epilogue-Bold',
              }}
            >
              Treadmill
            </Text>
            <Text
              style={{
                color: '#74738b',
                fontSize: 12,
                fontFamily: 'Lexend-SemiBold',
              }}
            >
              Indoor Session
            </Text>
          </View>
          <Pressable
            onPress={handleConcludePress}
            disabled={submitWorkout.isPending}
            className="active:scale-[0.98]"
          >
            <Text
              className="text-success text-base"
              style={{ fontFamily: 'Epilogue-Bold' }}
            >
              {submitWorkout.isPending ? 'Saving...' : 'Finish'}
            </Text>
          </Pressable>
        </View>

        {/* Guest indicator */}
        {isGuest && (
          <View className="bg-warning/10 rounded-xl p-3 mb-4">
            <Text
              className="text-warning text-xs text-center"
              style={{ fontFamily: 'Lexend-SemiBold' }}
            >
              Guest mode — {5 - guestWorkouts.length} workouts remaining
            </Text>
          </View>
        )}

        {/* Elapsed Time */}
        <View
          className="bg-[#1d1d37] rounded-xl p-6 mb-6 items-center"
          style={{
            shadowColor: '#a434ff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }}
        >
          <Text
            className="text-xs uppercase mb-2"
            style={{
              color: '#81ecff',
              fontFamily: 'Lexend-SemiBold',
              letterSpacing: 1,
            }}
          >
            Elapsed Time
          </Text>
          <Text
            style={{
              color: '#e5e3ff',
              fontSize: 48,
              fontFamily: 'Lexend-SemiBold',
            }}
          >
            {formatTime(elapsedSeconds)}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="w-2 h-2 rounded-full bg-success" />
            <Text
              className="text-xs uppercase"
              style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}
            >
              Session Active
            </Text>
          </View>
        </View>

        {/* Photo Verification */}
        <View className="bg-[#23233f] rounded-xl p-4 mb-4">
          <Text
            className="text-lg mb-3"
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
          >
            Photo Verification
          </Text>

          <View className="flex-row items-center gap-2 mb-3">
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

          <Pressable
            onPress={handleTakePhoto}
            className="py-3.5 items-center rounded-lg active:scale-[0.98]"
            style={{
              backgroundColor: '#a434ff',
              shadowColor: '#a434ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
          >
            <View className="flex-row items-center gap-2">
              <FontAwesome name="camera" size={16} color="#000" />
              <Text
                style={{
                  color: '#000',
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 15,
                }}
              >
                Take Photo
              </Text>
            </View>
          </Pressable>

          <Text
            className="text-xs text-center mt-2"
            style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
          >
            Take a photo of your treadmill display for verification
          </Text>
        </View>

        {/* Heart Rate */}
        <View className="bg-[#23233f] rounded-xl p-4 mb-4">
          <Text
            className="text-lg mb-2"
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
          >
            Heart Rate
          </Text>
          <View className="flex-row items-center gap-3">
            <FontAwesome name="heartbeat" size={20} color="#74738b" />
            <Text
              style={{
                color: '#e5e3ff',
                fontSize: 24,
                fontFamily: 'Lexend-SemiBold',
              }}
            >
              --
            </Text>
            <Text
              style={{
                color: '#74738b',
                fontSize: 13,
                fontFamily: 'BeVietnamPro-Regular',
              }}
            >
              bpm
            </Text>
          </View>
          <Text
            className="text-xs mt-2"
            style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
          >
            Connect a device for HR tracking
          </Text>
        </View>

        {/* Provisional Note */}
        <View className="mt-2 px-2">
          <Text
            className="text-xs text-center"
            style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
          >
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
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
