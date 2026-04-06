import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

import { createReport } from '@/services/api';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
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

function CategoryCard({
  cat,
  index,
  selected,
  onSelect,
}: {
  readonly cat: typeof CATEGORIES[number];
  readonly index: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 70);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Animated.View style={staggerStyle}>
      <Animated.View style={pressStyle}>
        <Pressable
          className="rounded-xl p-4"
          style={
            selected
              ? {
                  backgroundColor: '#23233f',
                  borderWidth: 1.5,
                  borderColor: '#ce96ff',
                  shadowColor: '#ce96ff',
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }
              : {
                  backgroundColor: '#1d1d37',
                  borderWidth: 1.5,
                  borderColor: 'transparent',
                }
          }
          onPress={onSelect}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <Text
            style={{
              color: selected ? '#e5e3ff' : '#aaa8c3',
              fontFamily: 'BeVietnamPro-Bold',
              fontWeight: '700',
            }}
          >
            {cat.label}
          </Text>
          <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
            {cat.description}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default function ReportScreen() {
  const { userId, workoutId } = useLocalSearchParams<{
    userId: string;
    workoutId?: string;
  }>();
  const router = useRouter();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');

  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: descStyle } = useEntrance(120, 'fade-slide');
  const { animatedStyle: submitStyle } = useEntrance(200, 'spring-up');
  const { animatedStyle: submitPressStyle, onPressIn: submitIn, onPressOut: submitOut } = usePressScale(0.95);

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
        'Thank you. We will review this report. Reports are a signal -- they do not automatically penalize the reported user.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/home' as any) }]
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
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8" keyboardShouldPersistTaps="handled">
        <Animated.View style={headerStyle}>
          <Pressable onPress={() => router.replace('/(app)/home' as any)} className="py-4">
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} Back</Text>
          </Pressable>

          <Text className="text-2xl mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>Report User</Text>
          <Text className="text-sm mb-6" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
            Reports help us maintain fair competition. They are reviewed by our
            team and do not automatically penalize the reported user.
          </Text>
        </Animated.View>

        {/* Category Selection */}
        <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>Category</Text>
        <View className="gap-2 mb-6">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard
              key={cat.value}
              cat={cat}
              index={i}
              selected={category === cat.value}
              onSelect={() => setCategory(cat.value)}
            />
          ))}
        </View>

        {/* Description */}
        <Animated.View style={descStyle}>
          <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>Description</Text>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3 text-base mb-6"
            style={{
              color: '#e5e3ff',
              fontFamily: 'BeVietnamPro-Regular',
              minHeight: 100,
              borderWidth: 1,
              borderColor: description.length > 0 ? 'rgba(164,52,255,0.35)' : 'rgba(206,150,255,0.1)',
            }}
            placeholder="Describe what you observed..."
            placeholderTextColor="#74738b"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View style={submitStyle}>
          <Animated.View style={submitPressStyle}>
            <Pressable
              className="py-3.5 items-center rounded-[2rem]"
              style={{
                backgroundColor: '#a434ff',
                shadowColor: '#a434ff',
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }}
              onPress={handleSubmit}
              onPressIn={submitIn}
              onPressOut={submitOut}
              disabled={reportMutation.isPending}
            >
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>
                {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Text className="text-xs text-center mt-4 px-4" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
          False or malicious reports are tracked. Frequent abuse may result in
          reduced report privileges.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
