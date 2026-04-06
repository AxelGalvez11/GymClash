import React, { useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { OnboardingFormState } from './types';
import { DrumPicker, DRUM_PICKER_H } from './DrumPicker';

interface StepCardioBaselineProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

// ── Age / HR helpers ─────────────────────────────────────────────────────────
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
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age > 0 ? age : null;
}

function getFitnessRating(vo2max: number): string {
  if (vo2max >= 50) return 'Excellent';
  if (vo2max >= 40) return 'Good';
  if (vo2max >= 30) return 'Average';
  return 'Below average';
}

// ── Picker item generators ───────────────────────────────────────────────────
// Max HR: 120–220 bpm
const MAX_HR_ITEMS = Array.from({ length: 101 }, (_, i) => {
  const v = String(120 + i);
  return { label: v, value: v };
});

// Resting HR: 30–120 bpm (first item = skip / not set)
const RESTING_HR_ITEMS = [
  { label: '—', value: '' },
  ...Array.from({ length: 91 }, (_, i) => {
    const v = String(30 + i);
    return { label: v, value: v };
  }),
];

// ── Component ────────────────────────────────────────────────────────────────
export default function StepCardioBaseline({
  form,
  onUpdate,
  onNext,
}: StepCardioBaselineProps) {
  const age = useMemo(() => computeAge(form.birthDate), [form.birthDate]);
  const calculatedMaxHR = age !== null ? 220 - age : null;

  // Derive effective max HR from picker value
  const maxHRParsed = form.maxHROverride !== '' ? parseInt(form.maxHROverride, 10) : null;
  const effectiveMaxHR =
    maxHRParsed !== null && !isNaN(maxHRParsed) && maxHRParsed > 0
      ? maxHRParsed
      : calculatedMaxHR;

  const restingHRParsed =
    form.restingHR !== '' ? parseInt(form.restingHR, 10) : null;

  const vo2max = useMemo(() => {
    if (
      effectiveMaxHR == null ||
      effectiveMaxHR <= 0 ||
      restingHRParsed == null ||
      isNaN(restingHRParsed) ||
      restingHRParsed <= 0
    ) {
      return null;
    }
    return Math.round((15.3 * (effectiveMaxHR / restingHRParsed)) * 10) / 10;
  }, [effectiveMaxHR, restingHRParsed]);

  // Default maxHR value for the picker
  const maxHRDefault =
    form.maxHROverride !== ''
      ? form.maxHROverride
      : calculatedMaxHR !== null
        ? String(calculatedMaxHR)
        : '190';

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
            Formula: 220 − {age} = {calculatedMaxHR} bpm
          </Text>
        </View>
      )}

      {/* ── Max Heart Rate Drum Picker ─────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.label}>Max Heart Rate</Text>
        <View style={styles.pickerWrapper}>
          <DrumPicker
            key={`maxhr-${calculatedMaxHR}`}
            items={MAX_HR_ITEMS}
            value={maxHRDefault}
            onChange={(v) => onUpdate({ maxHROverride: v })}
            unit="bpm"
          />
        </View>
      </View>

      {/* ── Resting Heart Rate Drum Picker ────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.label}>Resting Heart Rate — optional</Text>
        <View style={styles.pickerWrapper}>
          <DrumPicker
            items={RESTING_HR_ITEMS}
            value={form.restingHR}
            onChange={(v) => onUpdate({ restingHR: v })}
            unit={form.restingHR !== '' ? 'bpm' : undefined}
          />
        </View>
      </View>

      {/* ── VO2 Max Estimate ───────────────────────────────────────────── */}
      {vo2max !== null && (
        <View style={styles.vo2Card}>
          <Text style={styles.vo2Title}>Estimated VO2 Max</Text>
          <Text style={styles.vo2Value}>{vo2max}</Text>
          <Text style={styles.vo2Rating}>{getFitnessRating(vo2max)}</Text>
        </View>
      )}

      {/* ── Continue ──────────────────────────────────────────────────── */}
      <View
        style={[styles.continueButton]}
        // Using Pressable-like onPress via outer wrapper approach
      >
        <Text
          style={styles.continueButtonText}
          onPress={onNext}
        >
          CONTINUE
        </Text>
      </View>
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Lexend-SemiBold',
    fontSize: 13,
    color: '#aaa8c3',
    marginBottom: 10,
  },
  pickerWrapper: {
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    fontFamily: 'Epilogue-Bold',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
});
