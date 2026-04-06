import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';

import type { OnboardingFormState, ExperienceLevel } from './types';

interface StepSummaryProps {
  readonly form: OnboardingFormState;
  readonly onFinish: () => void;
  readonly saving: boolean;
}

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  never_trained: 'Never trained',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function getMaxHR(form: OnboardingFormState): string {
  if (form.maxHROverride.trim().length > 0) {
    return form.maxHROverride.trim();
  }

  if (form.birthDate.trim().length > 0) {
    const dateObj = new Date(form.birthDate);
    if (isNaN(dateObj.getTime())) return '—';
    const birthYear = dateObj.getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    return String(220 - age);
  }

  return '—';
}

function hasAny1RM(form: OnboardingFormState): boolean {
  return (
    form.squat1RM.trim().length > 0 ||
    form.bench1RM.trim().length > 0 ||
    form.deadlift1RM.trim().length > 0 ||
    form.ohp1RM.trim().length > 0
  );
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
        {label}
      </Text>
      <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}

export function StepSummary({ form, onFinish, saving }: StepSummaryProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => {
      anim.stop();
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    };
  }, [fadeAnim, slideAnim]);

  const weightUnit = form.unitSystem === 'imperial' ? 'lbs' : 'kg';
  const experienceLabel =
    form.liftingExperience !== ''
      ? EXPERIENCE_LABELS[form.liftingExperience]
      : '—';
  const maxHR = getMaxHR(form);
  const strengthStatus = hasAny1RM(form) ? 'Provided' : 'Will calibrate';

  return (
    <View className="flex-1 items-center justify-center px-6">
      {/* Gold symbol */}
      <Text className="text-6xl mb-2" style={{ color: '#ffd709' }}>
        {'<>'}
      </Text>

      {/* Title */}
      <Text
        className="text-3xl mb-2 text-center"
        style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', letterSpacing: 2 }}
      >
        You're ready, {form.displayName.trim() || 'Warrior'}
      </Text>

      {/* Subtitle */}
      <Text
        className="text-sm mb-8 text-center leading-6"
        style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}
      >
        Train in real life. Level up in game. Help your clan win.
      </Text>

      {/* Animated summary card */}
      <Animated.View
        className="w-full rounded-xl p-4 mb-10"
        style={{
          backgroundColor: '#1d1d37',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <SummaryRow label="Rank" value="Rookie" />
        <View className="h-px w-full" style={{ backgroundColor: 'rgba(206,150,255,0.12)' }} />

        <SummaryRow label="Level" value="1" />
        <View className="h-px w-full" style={{ backgroundColor: 'rgba(206,150,255,0.12)' }} />

        <SummaryRow
          label="Weight"
          value={form.bodyWeight.trim().length > 0 ? `${form.bodyWeight.trim()} ${weightUnit}` : '—'}
        />
        <View className="h-px w-full" style={{ backgroundColor: 'rgba(206,150,255,0.12)' }} />

        <SummaryRow label="Experience" value={experienceLabel} />
        <View className="h-px w-full" style={{ backgroundColor: 'rgba(206,150,255,0.12)' }} />

        <SummaryRow label="Max HR" value={maxHR !== '—' ? `${maxHR} bpm` : '—'} />
        <View className="h-px w-full" style={{ backgroundColor: 'rgba(206,150,255,0.12)' }} />

        <SummaryRow label="Strength data" value={strengthStatus} />
      </Animated.View>

      {/* Enter the Arena button */}
      <Pressable
        className="w-full py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
        style={{
          backgroundColor: saving ? '#6b2fa3' : '#a434ff',
          shadowColor: '#a434ff',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
          opacity: saving ? 0.7 : 1,
        }}
        onPress={onFinish}
        disabled={saving}
      >
        <Text
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
        >
          {saving ? 'SETTING UP...' : 'ENTER THE ARENA'}
        </Text>
      </Pressable>
    </View>
  );
}
