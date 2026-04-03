import { useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import type { OnboardingFormState, SexOption, UnitSystem } from './types';

interface StepBiodataProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

const SEX_OPTIONS: ReadonlyArray<{ readonly value: SexOption; readonly label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const COLORS = {
  bg: '#0c0c1f',
  text: '#e5e3ff',
  muted: '#aaa8c3',
  accent: '#a434ff',
  dim: '#74738b',
  surface: '#23233f',
  accentLight: '#ce96ff',
  inputBg: '#000000',
} as const;

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

function computeAge(birthDateStr: string): number | null {
  const match = birthDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

function validateWeight(value: string, unitSystem: UnitSystem): boolean {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  const metricValue = unitSystem === 'imperial' ? num * LB_TO_KG : num;
  return metricValue >= 20 && metricValue <= 300;
}

function validateHeight(value: string, unitSystem: UnitSystem): boolean {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  const metricValue = unitSystem === 'imperial' ? num * IN_TO_CM : num;
  return metricValue >= 100 && metricValue <= 250;
}

function validateAge(age: number | null): boolean {
  if (age === null) return false;
  return age >= 14 && age <= 99;
}

export function StepBiodata({ form, onUpdate, onNext }: StepBiodataProps) {
  const age = useMemo(() => computeAge(form.birthDate), [form.birthDate]);

  const isFormComplete = useMemo(() => {
    if (!form.birthDate || !form.sex || !form.bodyWeight || !form.height) return false;
    if (!validateAge(age)) return false;
    if (!validateWeight(form.bodyWeight, form.unitSystem)) return false;
    if (!validateHeight(form.height, form.unitSystem)) return false;
    return true;
  }, [form.birthDate, form.sex, form.bodyWeight, form.height, form.unitSystem, age]);

  const nextUnitSystem: UnitSystem = form.unitSystem === 'metric' ? 'imperial' : 'metric';
  const unitLabel = form.unitSystem === 'metric' ? 'Metric' : 'Imperial';
  const weightLabel = form.unitSystem === 'metric' ? 'kg' : 'lbs';
  const heightLabel = form.unitSystem === 'metric' ? 'cm' : 'in';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pt-6">
        {/* Header row */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-4">
            <Text
              style={{
                fontFamily: 'Epilogue-Bold',
                fontSize: 28,
                color: COLORS.text,
              }}
            >
              Physical Data
            </Text>
            <Text
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 14,
                color: COLORS.muted,
                marginTop: 6,
              }}
            >
              Used for fair scoring. Your data stays private.
            </Text>
          </View>

          {/* Unit toggle */}
          <Pressable
            onPress={() => onUpdate({ unitSystem: nextUnitSystem })}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontFamily: 'Lexend-SemiBold',
                fontSize: 12,
                color: COLORS.accentLight,
              }}
            >
              {unitLabel}
            </Text>
          </Pressable>
        </View>

        {/* Birth Date */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text
              style={{
                fontFamily: 'Lexend-SemiBold',
                fontSize: 13,
                color: COLORS.muted,
              }}
            >
              Birth Date
            </Text>
            {age !== null && (
              <Text
                style={{
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 13,
                  color: validateAge(age) ? COLORS.accentLight : '#ff4466',
                }}
              >
                {age} years old
              </Text>
            )}
          </View>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3"
            style={{
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 16,
              color: COLORS.text,
            }}
            value={form.birthDate}
            onChangeText={(text) => onUpdate({ birthDate: text })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.dim}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            autoCorrect={false}
          />
        </View>

        {/* Biological Sex */}
        <View className="mt-6">
          <Text
            style={{
              fontFamily: 'Lexend-SemiBold',
              fontSize: 13,
              color: COLORS.muted,
              marginBottom: 8,
            }}
          >
            Biological Sex
          </Text>
          <View className="flex-row" style={{ gap: 10 }}>
            {SEX_OPTIONS.map((option) => {
              const isSelected = form.sex === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => onUpdate({ sex: option.value })}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: COLORS.inputBg,
                    borderWidth: 1.5,
                    borderColor: isSelected ? COLORS.accentLight : 'transparent',
                    alignItems: 'center',
                    ...(isSelected
                      ? {
                          shadowColor: COLORS.accentLight,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.45,
                          shadowRadius: 8,
                          elevation: 6,
                        }
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Lexend-SemiBold',
                      fontSize: 12,
                      color: isSelected ? COLORS.accentLight : COLORS.dim,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Body Weight */}
        <View className="mt-6">
          <Text
            style={{
              fontFamily: 'Lexend-SemiBold',
              fontSize: 13,
              color: COLORS.muted,
              marginBottom: 8,
            }}
          >
            Body Weight ({weightLabel})
          </Text>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3"
            style={{
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 16,
              color: COLORS.text,
            }}
            value={form.bodyWeight}
            onChangeText={(text) => onUpdate({ bodyWeight: text })}
            placeholder={form.unitSystem === 'metric' ? 'e.g. 75' : 'e.g. 165'}
            placeholderTextColor={COLORS.dim}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Height */}
        <View className="mt-6">
          <Text
            style={{
              fontFamily: 'Lexend-SemiBold',
              fontSize: 13,
              color: COLORS.muted,
              marginBottom: 8,
            }}
          >
            Height ({heightLabel})
          </Text>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3"
            style={{
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 16,
              color: COLORS.text,
            }}
            value={form.height}
            onChangeText={(text) => onUpdate({ height: text })}
            placeholder={form.unitSystem === 'metric' ? 'e.g. 175' : 'e.g. 69'}
            placeholderTextColor={COLORS.dim}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Continue Button */}
        <Pressable
          onPress={isFormComplete ? onNext : undefined}
          style={{
            backgroundColor: COLORS.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 32,
            opacity: isFormComplete ? 1 : 0.5,
          }}
          disabled={!isFormComplete}
        >
          <Text
            style={{
              fontFamily: 'Epilogue-Bold',
              fontSize: 16,
              color: '#ffffff',
              letterSpacing: 1.5,
            }}
          >
            CONTINUE
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
