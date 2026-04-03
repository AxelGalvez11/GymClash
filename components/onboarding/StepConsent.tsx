import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import type { OnboardingFormState } from './types';

interface StepConsentProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

const CONSENT_ITEMS = [
  {
    key: 'consentGps' as const,
    label: 'GPS Location',
    icon: 'map-marker' as const,
    description: 'Used for territory mode tracking and distance verification',
  },
  {
    key: 'consentHr' as const,
    label: 'Heart Rate Data',
    icon: 'heartbeat' as const,
    description: 'Used for zone-based scoring and cardio verification',
  },
  {
    key: 'consentBiodata' as const,
    label: 'Body Data (Age, Weight, Height)',
    icon: 'user' as const,
    description: 'Used for fair scoring normalization (Wilks coefficient)',
  },
] as const;

function Toggle({
  value,
  onToggle,
}: {
  readonly value: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle}>
      <View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          backgroundColor: value ? '#a434ff' : '#74738b',
          justifyContent: 'center',
          paddingHorizontal: 3,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: '#e5e3ff',
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </Pressable>
  );
}

export default function StepConsent({ form, onUpdate, onNext }: StepConsentProps) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="flex-grow px-6 pb-10 pt-12"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text
        style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff' }}
        className="text-3xl mb-2"
      >
        Your Privacy
      </Text>
      <Text
        style={{ fontFamily: 'BeVietnamPro-Regular', color: '#aaa8c3' }}
        className="text-base mb-8"
      >
        We take your data seriously. Choose what you're comfortable sharing.
      </Text>

      {/* Consent Toggles */}
      <View className="gap-4 mb-6">
        {CONSENT_ITEMS.map((item) => (
          <View
            key={item.key}
            className="bg-[#23233f] rounded-xl p-4 flex-row items-center"
          >
            <View className="w-10 items-center mr-4">
              <FontAwesome name={item.icon} size={22} color="#ce96ff" />
            </View>

            <View className="flex-1 mr-3">
              <Text
                style={{ fontFamily: 'Lexend-SemiBold', color: '#e5e3ff' }}
                className="text-base mb-0.5"
              >
                {item.label}
              </Text>
              <Text
                style={{ fontFamily: 'BeVietnamPro-Regular', color: '#aaa8c3' }}
                className="text-sm"
              >
                {item.description}
              </Text>
            </View>

            <Toggle
              value={form[item.key]}
              onToggle={() => onUpdate({ [item.key]: !form[item.key] })}
            />
          </View>
        ))}
      </View>

      {/* Info Note */}
      <Text
        style={{ fontFamily: 'BeVietnamPro-Regular', color: '#74738b' }}
        className="text-xs mb-10 leading-5"
      >
        Your data is encrypted, never sold, and only used server-side for scoring.
        You can change these settings anytime.
      </Text>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Continue Button */}
      <Pressable
        onPress={onNext}
        className="bg-[#a434ff] rounded-xl py-4 items-center mb-4 active:scale-[0.98]"
      >
        <Text
          style={{ fontFamily: 'Lexend-SemiBold', color: '#e5e3ff' }}
          className="text-base tracking-widest"
        >
          CONTINUE
        </Text>
      </Pressable>
    </ScrollView>
  );
}
