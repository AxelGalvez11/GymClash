import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { OnboardingFormState, ExperienceLevel } from './types';

interface StepExperienceProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

interface ExperienceOption {
  readonly value: ExperienceLevel;
  readonly label: string;
  readonly description: string;
}

const EXPERIENCE_OPTIONS: readonly ExperienceOption[] = [
  {
    value: 'never_trained',
    label: 'Never Trained',
    description: 'No prior consistent training',
  },
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Less than 6 months of consistent training',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: '6 months to 2 years of consistent training',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: '2+ years of consistent training',
  },
] as const;

function ExperienceCard({
  option,
  selected,
  onPress,
}: {
  readonly option: ExperienceOption;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        selected ? styles.cardSelected : styles.cardUnselected,
      ]}
    >
      <Text
        style={[
          styles.cardLabel,
          { color: selected ? '#e5e3ff' : '#74738b' },
        ]}
      >
        {option.label}
      </Text>
      <Text style={styles.cardDescription}>{option.description}</Text>
    </TouchableOpacity>
  );
}

function ExperienceSection({
  title,
  selectedValue,
  onSelect,
}: {
  readonly title: string;
  readonly selectedValue: ExperienceLevel | '';
  readonly onSelect: (value: ExperienceLevel) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.cardStack}>
        {EXPERIENCE_OPTIONS.map((option) => (
          <ExperienceCard
            key={option.value}
            option={option}
            selected={selectedValue === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export default function StepExperience({
  form,
  onUpdate,
  onNext,
}: StepExperienceProps) {
  const canContinue =
    form.liftingExperience !== '' && form.runningExperience !== '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Experience Level</Text>
      <Text style={styles.subtitle}>
        Helps calibrate your starting baseline
      </Text>

      <ExperienceSection
        title="Lifting Experience"
        selectedValue={form.liftingExperience}
        onSelect={(value) => onUpdate({ liftingExperience: value })}
      />

      <ExperienceSection
        title="Running / Cardio Experience"
        selectedValue={form.runningExperience}
        onSelect={(value) => onUpdate({ runningExperience: value })}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onNext}
        disabled={!canContinue}
        style={[
          styles.continueButton,
          !canContinue && styles.continueButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.continueButtonText,
            !canContinue && styles.continueButtonTextDisabled,
          ]}
        >
          CONTINUE
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c1f',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  title: {
    fontFamily: 'Epilogue-Bold',
    fontSize: 28,
    color: '#e5e3ff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 14,
    color: '#aaa8c3',
    marginBottom: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 16,
    color: '#e5e3ff',
    marginBottom: 12,
  },
  cardStack: {
    gap: 10,
  },
  card: {
    backgroundColor: '#23233f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
  },
  cardSelected: {
    borderColor: '#ce96ff',
    shadowColor: '#ce96ff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 4,
  },
  cardUnselected: {
    borderColor: 'transparent',
  },
  cardLabel: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 15,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 12,
    color: '#74738b',
  },
  continueButton: {
    backgroundColor: '#a434ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 16,
    color: '#e5e3ff',
    letterSpacing: 1,
  },
  continueButtonTextDisabled: {
    color: '#74738b',
  },
});
