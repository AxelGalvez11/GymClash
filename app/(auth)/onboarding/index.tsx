import { useState, useCallback } from 'react';
import { View, Pressable, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { updateProfile, updateBiodata } from '@/services/api';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { StepName } from '@/components/onboarding/StepName';
import { StepBiodata } from '@/components/onboarding/StepBiodata';
import StepExperience from '@/components/onboarding/StepExperience';
import { StepOneRepMax } from '@/components/onboarding/StepOneRepMax';
import StepCardioBaseline from '@/components/onboarding/StepCardioBaseline';
import StepDeviceConnect from '@/components/onboarding/StepDeviceConnect';
import StepConsent from '@/components/onboarding/StepConsent';
import { StepSummary } from '@/components/onboarding/StepSummary';
import {
  INITIAL_FORM_STATE,
  type OnboardingFormState,
  type OnboardingStep,
} from '@/components/onboarding/types';

const LB_TO_KG = 0.453592;

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
    setStep((prev) => Math.min(prev + 1, 7) as OnboardingStep);
  }

  function goBack() {
    setStep((prev) => Math.max(prev - 1, 0) as OnboardingStep);
  }

  async function handleFinish() {
    if (!form.displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setSaving(true);
    try {
      // Save display name
      await updateProfile({ display_name: form.displayName.trim() });

      // Save biodata if any fields were filled
      const hasBiodata =
        form.bodyWeight || form.height || form.birthDate || form.sex;

      if (hasBiodata) {
        const isImperial = form.unitSystem === 'imperial';
        const bw = form.bodyWeight ? parseFloat(form.bodyWeight) : null;
        const ht = form.height ? parseFloat(form.height) : null;

        await updateBiodata({
          body_weight_kg:
            bw !== null ? (isImperial ? bw * LB_TO_KG : bw) : null,
          height_cm:
            ht !== null ? (isImperial ? ht * 2.54 : ht) : null,
          birth_date: form.birthDate || null,
          biological_sex: form.sex || null,
          lifting_experience: form.liftingExperience || null,
          running_experience: form.runningExperience || null,
          resting_hr: form.restingHR
            ? parseInt(form.restingHR, 10)
            : null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['needs-onboarding'] });
      router.replace('/(app)/home');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Steps 1-5 show back button (not step 0 = name, not step 6 = summary)
  const showBack = step > 0 && step < 7;

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      {/* Progress indicator */}
      <StepIndicator currentStep={step} />

      {/* Back button */}
      {showBack && (
        <Pressable
          onPress={goBack}
          className="px-8 py-2 flex-row items-center active:scale-[0.98]"
        >
          <FontAwesome name="arrow-left" size={14} color="#aaa8c3" />
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
          <StepCardioBaseline
            form={form}
            onUpdate={handleUpdate}
            onNext={goNext}
          />
        )}
        {step === 5 && <StepDeviceConnect onNext={goNext} />}
        {step === 6 && (
          <StepConsent form={form} onUpdate={handleUpdate} onNext={goNext} />
        )}
        {step === 7 && (
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
