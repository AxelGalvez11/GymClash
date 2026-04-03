import { View, Text, TextInput, Pressable } from 'react-native';

import type { OnboardingFormState } from './types';

interface StepOneRepMaxProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

interface LiftField {
  readonly label: string;
  readonly key: 'squat1RM' | 'bench1RM' | 'deadlift1RM' | 'ohp1RM';
  readonly placeholder: string;
}

const LIFT_FIELDS: readonly LiftField[] = [
  { label: 'Squat', key: 'squat1RM', placeholder: 'e.g. 100' },
  { label: 'Bench Press', key: 'bench1RM', placeholder: 'e.g. 70' },
  { label: 'Deadlift', key: 'deadlift1RM', placeholder: 'e.g. 120' },
  { label: 'Overhead Press', key: 'ohp1RM', placeholder: 'e.g. 45' },
] as const;

export function StepOneRepMax({ form, onUpdate, onNext }: StepOneRepMaxProps) {
  const unitLabel = form.unitSystem === 'metric' ? 'kg' : 'lbs';

  return (
    <View className="flex-1 justify-center px-6">
      {/* Title */}
      <Text
        className="text-3xl mb-2"
        style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', letterSpacing: 2 }}
      >
        Estimated 1 Rep Max
      </Text>

      {/* Subtitle */}
      <Text
        className="text-sm mb-8 leading-6"
        style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}
      >
        Optional — helps predict your output. You can add these later in Settings.
      </Text>

      {/* Lift inputs */}
      {LIFT_FIELDS.map((field) => (
        <View key={field.key} className="mb-4">
          <Text
            className="mb-1.5 ml-1"
            style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}
          >
            {field.label} ({unitLabel})
          </Text>
          <TextInput
            className="rounded-xl px-4 py-3 text-base"
            style={{
              backgroundColor: '#000000',
              color: '#e5e3ff',
              fontFamily: 'BeVietnamPro-Regular',
            }}
            placeholder={field.placeholder}
            placeholderTextColor="#74738b"
            value={form[field.key]}
            onChangeText={(text) => onUpdate({ [field.key]: text })}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>
      ))}

      {/* Info note */}
      <Text
        className="mt-2 mb-6 leading-5"
        style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}
      >
        Don't worry if you're unsure — the system will learn your baseline from your first few
        sessions.
      </Text>

      {/* Continue button */}
      <Pressable
        className="py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
        style={{
          backgroundColor: '#a434ff',
          shadowColor: '#a434ff',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        }}
        onPress={onNext}
      >
        <Text
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
        >
          CONTINUE
        </Text>
      </Pressable>

      {/* Skip link */}
      <Pressable className="mt-4 items-center py-2" onPress={onNext}>
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>
          Skip this for now
        </Text>
      </Pressable>
    </View>
  );
}
