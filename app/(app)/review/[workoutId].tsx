import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation } from '@tanstack/react-query';

import { Colors } from '@/constants/theme';
import { REASON_CODE_LABELS, REASON_CODE_SEVERITY } from '@/lib/validation';
import { useWorkoutDetail } from '@/hooks/use-workouts';
import { createAppeal } from '@/services/api';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import type { ReasonCode, ValidationStatus } from '@/types';

const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string; description: string }
> = {
  accepted: {
    label: 'Accepted',
    color: Colors.success,
    description: 'This workout has been validated and accepted.',
  },
  accepted_with_low_confidence: {
    label: 'Low Confidence',
    color: Colors.warning,
    description:
      'This workout was accepted but some data could not be fully verified.',
  },
  held_for_review: {
    label: 'Under Review',
    color: Colors.warning,
    description:
      'This workout has been flagged and is awaiting review. It will not count toward clan scores until resolved.',
  },
  excluded_from_clan_score: {
    label: 'Excluded from Clan',
    color: Colors.danger,
    description:
      'This workout counts for personal XP but was excluded from clan war contribution.',
  },
  rejected: {
    label: 'Rejected',
    color: Colors.danger,
    description:
      'This workout did not pass validation checks and has been rejected.',
  },
};

export default function WorkoutReviewScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const [appealReason, setAppealReason] = useState('');

  // Entrance animations
  const fadeHeaderAnim = useFadeSlide(0);
  const fadeContentAnim = useFadeSlide(100);

  const { data, isLoading } = useWorkoutDetail(workoutId);
  const appealMutation = useMutation({
    mutationFn: (reason: string) => createAppeal(workoutId!, reason),
    onSuccess: () => {
      Alert.alert(
        'Appeal Submitted',
        'Your appeal has been submitted for review. We will notify you of the outcome.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to submit appeal. Please try again.');
    },
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  const { workout, validations } = data;
  const validationStatus = (workout.validation_status ?? 'accepted') as ValidationStatus;
  const confidenceScore = workout.confidence_score ?? 1.0;
  const reasonCodes = validations
    .filter((v: any) => !v.passed && v.reason_code && v.reason_code !== 'clean')
    .map((v: any) => v.reason_code as ReasonCode);

  const statusConfig = STATUS_CONFIG[validationStatus];
  const canAppeal =
    validationStatus === 'held_for_review' ||
    validationStatus === 'excluded_from_clan_score' ||
    validationStatus === 'rejected';

  function handleSubmitAppeal() {
    if (!appealReason.trim()) {
      Alert.alert('Error', 'Please describe why you believe this is incorrect.');
      return;
    }
    appealMutation.mutate(appealReason.trim());
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="py-4 active:scale-[0.98]">
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} Back</Text>
        </Pressable>

        {/* Header */}
        <Animated.View style={fadeHeaderAnim.style}>
        <Text className="text-2xl mb-1" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>
          Workout Review
        </Text>
        <Text className="text-sm mb-6" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          {workout.type === 'strength' ? 'Strength' : 'Run'} --{' '}
          {new Date(workout.created_at).toLocaleDateString()} -- ID: {workoutId}
        </Text>
        </Animated.View>

        {/* Status Badge */}
        <Animated.View style={fadeContentAnim.style}>
        <View
          className="rounded-xl p-4 mb-6"
          style={{
            backgroundColor: '#1d1d37',
            shadowColor: statusConfig.color,
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          }}
        >
          <View className="flex-row items-center gap-2 mb-2">
            <FontAwesome
              name={
                validationStatus === 'accepted' ? 'check-circle' : 'exclamation-triangle'
              }
              size={18}
              color={statusConfig.color}
            />
            <Text className="text-lg" style={{ color: statusConfig.color, fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>{statusConfig.description}</Text>
          <Text className="text-sm mt-2" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
            Confidence: {Math.round(confidenceScore * 100)}%
          </Text>
        </View>

        {/* Reason Codes */}
        {reasonCodes.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>
              Flagged Issues
            </Text>
            {reasonCodes.map((code) => {
              const severity = REASON_CODE_SEVERITY[code];
              const severityColor =
                severity === 'critical'
                  ? Colors.danger
                  : severity === 'warning'
                  ? Colors.warning
                  : '#81ecff';

              return (
                <View
                  key={code}
                  className="bg-[#1d1d37] rounded-xl p-3 mb-2"
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: severityColor }}
                    />
                    <Text className="flex-1" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}>
                      {REASON_CODE_LABELS[code]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Appeal Form */}
        {canAppeal && (
          <View>
            <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>
              Submit an Appeal
            </Text>
            <Text className="text-sm mb-3" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
              If you believe this workout was incorrectly flagged, describe what
              happened and we will review it.
            </Text>
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-3 text-base mb-4"
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', minHeight: 100 }}
              placeholder="Describe why this flag is incorrect..."
              placeholderTextColor="#74738b"
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable
              className="py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
              style={{
                backgroundColor: '#a434ff',
                shadowColor: '#a434ff',
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }}
              onPress={handleSubmitAppeal}
            >
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>
                Submit Appeal
              </Text>
            </Pressable>
          </View>
        )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
