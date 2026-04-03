import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { OnboardingFormState } from './types';

interface StepCardioBaselineProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

function computeAge(birthDate: string): number | null {
  const parts = birthDate.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const today = new Date();
  const birth = new Date(year, month - 1, day);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age > 0 ? age : null;
}

function getFitnessRating(vo2max: number): string {
  if (vo2max >= 50) return 'Excellent';
  if (vo2max >= 40) return 'Good';
  if (vo2max >= 30) return 'Average';
  return 'Below average';
}

export default function StepCardioBaseline({
  form,
  onUpdate,
  onNext,
}: StepCardioBaselineProps) {
  const age = useMemo(() => computeAge(form.birthDate), [form.birthDate]);
  const calculatedMaxHR = age !== null ? 220 - age : null;

  const effectiveMaxHR = form.maxHROverride !== ''
    ? parseInt(form.maxHROverride, 10)
    : calculatedMaxHR;

  const restingHR = form.restingHR !== ''
    ? parseInt(form.restingHR, 10)
    : null;

  const vo2max = useMemo(() => {
    if (
      effectiveMaxHR == null ||
      isNaN(effectiveMaxHR) ||
      restingHR == null ||
      isNaN(restingHR) ||
      restingHR <= 0
    ) {
      return null;
    }
    return Math.round((15.3 * (effectiveMaxHR / restingHR)) * 10) / 10;
  }, [effectiveMaxHR, restingHR]);

  // Pre-fill maxHROverride with calculated value when age becomes available
  // and user hasn't manually set a value yet
  React.useEffect(() => {
    if (calculatedMaxHR !== null && form.maxHROverride === '') {
      onUpdate({ maxHROverride: String(calculatedMaxHR) });
    }
  }, [calculatedMaxHR, form.maxHROverride, onUpdate]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Cardio Baseline</Text>
      <Text style={styles.subtitle}>
        Used to calibrate heart rate zones and cardio scoring.
      </Text>

      {age === null ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            Birth date not set — go back to set it for accurate calculations
          </Text>
        </View>
      ) : (
        <View style={styles.formulaCard}>
          <Text style={styles.formulaText}>
            (220 - {age} = {calculatedMaxHR} bpm)
          </Text>
        </View>
      )}

      {/* Max Heart Rate */}
      <View style={styles.section}>
        <Text style={styles.label}>Max Heart Rate (bpm)</Text>
        <TextInput
          style={styles.input}
          value={form.maxHROverride}
          onChangeText={(value) => onUpdate({ maxHROverride: value })}
          keyboardType="number-pad"
          placeholderTextColor="#74738b"
          placeholder={calculatedMaxHR !== null ? String(calculatedMaxHR) : 'Enter max HR'}
        />
      </View>

      {/* Resting Heart Rate */}
      <View style={styles.section}>
        <Text style={styles.label}>Resting Heart Rate (bpm) — optional</Text>
        <TextInput
          style={styles.input}
          value={form.restingHR}
          onChangeText={(value) => onUpdate({ restingHR: value })}
          keyboardType="number-pad"
          placeholderTextColor="#74738b"
          placeholder="e.g. 60"
        />
      </View>

      {/* VO2 Max Estimate */}
      {vo2max !== null && (
        <View style={styles.vo2Card}>
          <Text style={styles.vo2Title}>Estimated VO2 Max</Text>
          <Text style={styles.vo2Value}>{vo2max}</Text>
          <Text style={styles.vo2Rating}>{getFitnessRating(vo2max)}</Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onNext}
        style={styles.continueButton}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
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
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 14,
    color: '#e5e3ff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 16,
    color: '#e5e3ff',
  },
  formulaCard: {
    marginBottom: 24,
  },
  formulaText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: '#74738b',
  },
  warningCard: {
    backgroundColor: '#23233f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#a434ff',
  },
  warningText: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 13,
    color: '#ce96ff',
  },
  vo2Card: {
    backgroundColor: '#23233f',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  vo2Title: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 14,
    color: '#aaa8c3',
    marginBottom: 8,
  },
  vo2Value: {
    fontFamily: 'Epilogue-Bold',
    fontSize: 36,
    color: '#e5e3ff',
    marginBottom: 4,
  },
  vo2Rating: {
    fontFamily: 'BeVietnamPro-Regular',
    fontSize: 14,
    color: '#ce96ff',
  },
  continueButton: {
    backgroundColor: '#a434ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  continueButtonText: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 16,
    color: '#e5e3ff',
    letterSpacing: 1,
  },
});
