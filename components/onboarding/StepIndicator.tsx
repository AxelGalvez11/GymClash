import { View, Text } from 'react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { STEP_LABELS, type OnboardingStep, TOTAL_STEPS } from './types';

interface StepIndicatorProps {
  readonly currentStep: OnboardingStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <View className="px-8 pt-4 pb-2">
      <ProgressBar current={currentStep + 1} max={TOTAL_STEPS} color="#a434ff" height="sm" />
      <View className="flex-row justify-between mt-2">
        <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
          STEP {currentStep + 1} OF {TOTAL_STEPS}
        </Text>
        <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
          {STEP_LABELS[currentStep]}
        </Text>
      </View>
    </View>
  );
}
