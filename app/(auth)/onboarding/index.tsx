import { useState, useCallback } from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { updateProfile, updateBiodata } from '@/services/api';
import { buildOnboardingBiodataPayload, hasOnboardingBiodataPayload } from '@/lib/onboarding';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { StepName } from '@/components/onboarding/StepName';
import { StepBiodata } from '@/components/onboarding/StepBiodata';
import StepExperience from '@/components/onboarding/StepExperience';
import { StepOneRepMax } from '@/components/onboarding/StepOneRepMax';
import StepDeviceConnect from '@/components/onboarding/StepDeviceConnect';
import StepConsent from '@/components/onboarding/StepConsent';
import { StepSummary } from '@/components/onboarding/StepSummary';
import {
  INITIAL_FORM_STATE,
  type OnboardingFormState,
  type OnboardingStep,
} from '@/components/onboarding/types';

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<OnboardingStep>(0);
  const [form, setForm] = useState<OnboardingFormState>(INITIAL_FORM_STATE);
  const [saving, setSaving] = useState(false);

  const handleUpdate = useCallback((updates: Partial<OnboardingFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  function goNext() {
    setStep((prev) => Math.min(prev + 1, 6) as OnboardingStep);
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 0) as OnboardingStep);
  }

  async function handleFinish() {
    if (saving) return;

    if (!form.displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setSaving(true);
    try {
      // Critical: save display name + mark onboarding complete
      await updateProfile({ display_name: form.displayName.trim() });

      // Non-critical: save biodata — failure here should NOT block entry
      // (user can update physical data later in Settings)
      try {
        const biodataPayload = buildOnboardingBiodataPayload(form);

        if (hasOnboardingBiodataPayload(biodataPayload)) {
          await updateBiodata(biodataPayload);
        }
      } catch (biodataErr) {
        // Biodata save failed — not fatal, user can fill in Settings later
        console.warn('[onboarding] biodata save failed (non-fatal):', biodataErr);
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['needs-onboarding'] });
      router.replace('/(app)/home');
    } catch (err) {
      Alert.alert('Error', 'Could not save your profile. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const showBack = step > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      {/* Progress indicator — hidden on steps that own their own HUD header */}
      {step !== 1 && <StepIndicator currentStep={step} />}

      {/* Back button */}
      {showBack && (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={{
            paddingHorizontal: 32,
            paddingVertical: 12,
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FontAwesome name="arrow-left" size={18} color="#aaa8c3" />
          <Text
            className="ml-2"
            style={{
              color: '#aaa8c3',
              fontFamily: 'Lexend-SemiBold',
              fontSize: 13,
            }}
          >
            BACK
          </Text>
        </Pressable>
      )}

      {/* Step content */}
      <View className="flex-1">
        {step === 0 && (
          <StepName form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 1 && (
          <StepBiodata form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 2 && (
          <StepExperience form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 3 && (
          <StepOneRepMax form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 4 && (
          <StepDeviceConnect form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 5 && (
          <StepConsent form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 6 && (
          <StepSummary
            form={form}
            onFinish={handleFinish}
            saving={saving}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
