import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';

import type { OnboardingFormState } from './types';

interface StepNameProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

export function StepName({ form, onUpdate, onNext }: StepNameProps) {
  const handleContinue = () => {
    const trimmed = form.displayName.trim();
    if (trimmed.length === 0) {
      Alert.alert('Name required', 'Enter a warrior name to continue.');
      return;
    }
    onNext();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <View className="flex-1 px-6" style={{ justifyContent: 'flex-start', paddingTop: '25%' }}>
        {/* Title */}
        <Text
          className="text-3xl mb-2"
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', letterSpacing: 2 }}
        >
          Choose your name
        </Text>

        {/* Subtitle */}
        <Text
          className="text-sm mb-8 leading-6"
          style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}
        >
          This is how other warriors will see you.
        </Text>

        {/* Name input */}
        <TextInput
          className="rounded-xl px-4 py-3.5 text-base"
          style={{
            backgroundColor: '#23233f',
            color: '#e5e3ff',
            fontFamily: 'BeVietnamPro-Regular',
            borderWidth: 1,
            borderColor: 'rgba(206,150,255,0.25)',
          }}
          placeholder="Warrior name"
          placeholderTextColor="#74738b"
          value={form.displayName}
          onChangeText={(text) => onUpdate({ displayName: text })}
          maxLength={20}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        {/* Character count */}
        <Text
          className="mt-2 mb-6 self-end pr-1"
          style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}
        >
          {form.displayName.length}/20
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
          onPress={handleContinue}
        >
          <Text
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
          >
            CONTINUE
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
