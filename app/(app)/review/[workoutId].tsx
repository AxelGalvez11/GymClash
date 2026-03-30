import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation } from '@tanstack/react-query';

import { Colors } from '@/constants/theme';
import { REASON_CODE_LABELS, REASON_CODE_SEVERITY } from '@/lib/validation';
import { useWorkoutDetail } from '@/hooks/use-workouts';
import { createAppeal } from '@/services/api';
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
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={Colors.brand.DEFAULT} size="large" />
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
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="py-4">
          <Text className="text-brand text-base">← Back</Text>
        </Pressable>

        {/* Header */}
        <Text className="text-white text-2xl font-bold mb-1">
          Workout Review
        </Text>
        <Text className="text-text-secondary text-sm mb-6">
          {workout.type === 'strength' ? 'Strength' : 'Run'} —{' '}
          {new Date(workout.created_at).toLocaleDateString()} — ID: {workoutId}
        </Text>

        {/* Status Badge */}
        <View
          className="rounded-xl p-4 mb-6 border"
          style={{ borderColor: statusConfig.color + '40' }}
        >
          <View className="flex-row items-center gap-2 mb-2">
            <FontAwesome
              name={
                validationStatus === 'accepted' ? 'check-circle' : 'exclamation-triangle'
              }
              size={18}
              color={statusConfig.color}
            />
            <Text className="font-bold text-lg" style={{ color: statusConfig.color }}>
              {statusConfig.label}
            </Text>
          </View>
          <Text className="text-text-secondary">{statusConfig.description}</Text>
          <Text className="text-text-muted text-sm mt-2">
            Confidence: {Math.round(confidenceScore * 100)}%
          </Text>
        </View>

        {/* Reason Codes */}
        {reasonCodes.length > 0 && (
          <View className="mb-6">
            <Text className="text-white text-lg font-bold mb-3">
              Flagged Issues
            </Text>
            {reasonCodes.map((code) => {
              const severity = REASON_CODE_SEVERITY[code];
              const severityColor =
                severity === 'critical'
                  ? Colors.danger
                  : severity === 'warning'
                  ? Colors.warning
                  : Colors.info;

              return (
                <View
                  key={code}
                  className="bg-surface-raised border border-surface-border rounded-xl p-3 mb-2"
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: severityColor }}
                    />
                    <Text className="text-white font-bold flex-1">
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
            <Text className="text-white text-lg font-bold mb-3">
              Submit an Appeal
            </Text>
            <Text className="text-text-secondary text-sm mb-3">
              If you believe this workout was incorrectly flagged, describe what
              happened and we will review it.
            </Text>
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base mb-4"
              placeholder="Describe why this flag is incorrect..."
              placeholderTextColor="#6A6A8A"
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
            <Pressable
              className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
              onPress={handleSubmitAppeal}
            >
              <Text className="text-white text-lg font-bold">
                Submit Appeal
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
