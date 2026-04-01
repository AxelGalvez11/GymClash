import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { Colors } from '@/constants/theme';
import { createReport } from '@/services/api';
import type { ReportCategory } from '@/types';

const CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  {
    value: 'impossible_stats',
    label: 'Impossible Stats',
    description: 'Numbers that are clearly fake or physically impossible',
  },
  {
    value: 'suspected_spoofing',
    label: 'Suspected Spoofing',
    description: 'GPS spoofing, fake sensor data, or data manipulation',
  },
  {
    value: 'inappropriate_behavior',
    label: 'Inappropriate Behavior',
    description: 'Offensive content, harassment, or other violations',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else that seems wrong',
  },
];

export default function ReportScreen() {
  const { userId, workoutId } = useLocalSearchParams<{
    userId: string;
    workoutId?: string;
  }>();
  const router = useRouter();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');

  const reportMutation = useMutation({
    mutationFn: () => {
      if (!category) throw new Error('Select a category');
      return createReport({
        reported_user_id: userId!,
        reported_workout_id: workoutId,
        category,
        description: description.trim(),
      });
    },
    onSuccess: () => {
      Alert.alert(
        'Report Submitted',
        'Thank you. We will review this report. Reports are a signal — they do not automatically penalize the reported user.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (err: any) => {
      const msg = err?.message?.includes('Rate limit')
        ? 'You have reached the maximum number of reports for today. Try again tomorrow.'
        : 'Failed to submit report. Please try again.';
      Alert.alert('Error', msg);
    },
  });

  function handleSubmit() {
    if (!category) {
      Alert.alert('Error', 'Select a report category');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    reportMutation.mutate();
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        <Pressable onPress={() => router.back()} className="py-4">
          <Text className="text-white/60 text-base">← Back</Text>
        </Pressable>

        <Text className="text-white text-2xl font-bold mb-2">Report User</Text>
        <Text className="text-text-secondary text-sm mb-6">
          Reports help us maintain fair competition. They are reviewed by our
          team and do not automatically penalize the reported user.
        </Text>

        {/* Category Selection */}
        <Text className="text-white text-lg font-bold mb-3">Category</Text>
        <View className="gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              className={`border rounded-xl p-4 ${
                category === cat.value
                  ? 'border-white bg-white/10'
                  : 'border-surface-border bg-surface-raised'
              }`}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                className={`font-bold ${
                  category === cat.value ? 'text-white' : 'text-white/50'
                }`}
              >
                {cat.label}
              </Text>
              <Text className="text-text-muted text-xs mt-1">
                {cat.description}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Description */}
        <Text className="text-white text-lg font-bold mb-3">Description</Text>
        <TextInput
          className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base mb-6"
          placeholder="Describe what you observed..."
          placeholderTextColor={Colors.text.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={{ minHeight: 100 }}
        />

        {/* Submit */}
        <Pressable
          className="py-3.5 items-center active:opacity-70" style={{ borderWidth: 1, borderColor: '#ffffff' }}
          onPress={handleSubmit}
          disabled={reportMutation.isPending}
        >
          <Text className="text-white text-lg font-bold">
            {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
          </Text>
        </Pressable>

        <Text className="text-text-muted text-xs text-center mt-4 px-4">
          False or malicious reports are tracked. Frequent abuse may result in
          reduced report privileges.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
