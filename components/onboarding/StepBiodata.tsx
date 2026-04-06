import { useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { HUDInput } from '@/components/ui/HUDInput';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { OnboardingFormState, SexOption, UnitSystem } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepBiodataProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  bg:             '#0c0c1f',
  surface:        '#17172f',
  surfaceHigh:    '#1d1d37',
  surfaceHighest: '#23233f',
  surfaceLowest:  '#000000',
  text:           '#e5e3ff',
  muted:          '#aaa8c3',
  dim:            '#74738b',
  outline:        '#46465c',
  accent:         '#a434ff',
  accentLight:    '#ce96ff',
  tertiary:       '#81ecff',
  secondary:      '#ffd709',
  error:          '#ff6e84',
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const LB_TO_KG  = 0.453592 as const;
const IN_TO_CM  = 2.54     as const;

type SexMeta = { readonly value: SexOption; readonly label: string; readonly icon: string };

const SEX_OPTIONS: ReadonlyArray<SexMeta> = [
  { value: 'male',              label: 'MALE',   icon: '♂' },
  { value: 'female',            label: 'FEMALE', icon: '♀' },
  { value: 'prefer_not_to_say', label: 'OTHER',  icon: '⚧' },
] as const;

// ─── Pure helpers — no mutation ───────────────────────────────────────────────

/** Format raw digit input into YYYY-MM-DD (used only for birth date). */
function formatBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function computeAge(birthDateStr: string): number | null {
  const match = birthDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day   = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1) return null;
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;
  const birth = new Date(year, month - 1, day);
  if (birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function validateAge(age: number | null): boolean {
  return age !== null && age >= 14 && age <= 99;
}

function validateWeight(value: string, unitSystem: UnitSystem): boolean {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return false;
  const kg = unitSystem === 'imperial' ? n * LB_TO_KG : n;
  return kg >= 20 && kg <= 300;
}

function validateHeight(value: string, unitSystem: UnitSystem): boolean {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return false;
  const cm = unitSystem === 'imperial' ? n * IN_TO_CM : n;
  return cm >= 100 && cm <= 250;
}

/** Convert weight string between unit systems — returns new string, no mutation. */
function convertWeight(value: string, from: UnitSystem, to: UnitSystem): string {
  const n = parseFloat(value);
  if (isNaN(n)) return '';
  if (from === to) return value;
  if (to === 'imperial') return String(Math.round((n / LB_TO_KG) / 5) * 5);
  return String(Math.round(n * LB_TO_KG));
}

/** Convert height string between unit systems — returns new string, no mutation. */
function convertHeight(value: string, from: UnitSystem, to: UnitSystem): string {
  const n = parseFloat(value);
  if (isNaN(n)) return '';
  if (from === to) return value;
  const result = from === 'imperial' ? Math.round(n * IN_TO_CM) : Math.round(n / IN_TO_CM);
  return String(result);
}

/** iOS-only chromatic neon glow for selected sex card. */
function buildSelectionGlow(color: string): object {
  if (Platform.OS !== 'ios') return {};
  return {
    shadowColor:  color,
    shadowRadius: 14,
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Uppercase section header — Lexend-SemiBold 10px tracking-widest. */
function SectionLabel({ children }: { readonly children: string }) {
  return (
    <Text
      style={{
        fontFamily:    'Lexend-SemiBold',
        fontSize:      10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color:         C.muted,
        marginBottom:  10,
      }}
    >
      {children}
    </Text>
  );
}

/** Horizontal rule — outline-variant at low opacity. */
function Divider() {
  return (
    <View
      style={{
        height:          1,
        backgroundColor: C.outline,
        opacity:         0.25,
        marginVertical:  4,
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepBiodata({ form, onUpdate, onNext }: StepBiodataProps) {
  // ── Derived state — no mutation ──────────────────────────────────────────
  const age          = useMemo(() => computeAge(form.birthDate), [form.birthDate]);
  const birthFilled  = form.birthDate.length === 10;
  const ageValid     = validateAge(age);
  const weightOk     = validateWeight(form.bodyWeight, form.unitSystem);
  const heightOk     = validateHeight(form.height, form.unitSystem);

  const isFormComplete = useMemo(
    () => !!(form.sex && form.birthDate && ageValid && form.bodyWeight && weightOk && form.height && heightOk),
    [form.sex, form.birthDate, ageValid, form.bodyWeight, weightOk, form.height, heightOk],
  );

  // Age error message — computed fresh each render, no mutation
  const ageError = useMemo(() => {
    if (!birthFilled) return undefined;
    if (age !== null && age < 14) return 'Must be at least 14 years old';
    if (!ageValid) return 'Enter a valid birth date (YYYY-MM-DD)';
    return undefined;
  }, [birthFilled, age, ageValid]);

  const weightUnit = form.unitSystem === 'metric' ? 'kg' : 'lbs';
  const heightUnit = form.unitSystem === 'metric' ? 'cm' : 'in';

  // ── Handlers — immutable updates ────────────────────────────────────────
  const handleSexSelect = useCallback(
    (value: SexOption) => onUpdate({ sex: value }),
    [onUpdate],
  );

  const handleBirthDate = useCallback(
    (text: string) => onUpdate({ birthDate: formatBirthDate(text) }),
    [onUpdate],
  );

  const handleWeight = useCallback(
    (text: string) => onUpdate({ bodyWeight: text }),
    [onUpdate],
  );

  const handleHeight = useCallback(
    (text: string) => onUpdate({ height: text }),
    [onUpdate],
  );

  const handleUnitToggle = useCallback(
    (next: UnitSystem) => {
      if (next === form.unitSystem) return;
      onUpdate({
        unitSystem: next,
        bodyWeight: convertWeight(form.bodyWeight, form.unitSystem, next),
        height:     convertHeight(form.height,     form.unitSystem, next),
      });
    },
    [form.unitSystem, form.bodyWeight, form.height, onUpdate],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 160 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── HUD PROGRESS HEADER ─────────────────────────────────────── */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop:        20,
          paddingBottom:     18,
        }}
      >
        {/* Title row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <View>
            <Text
              style={{
                fontFamily:    'Epilogue-Bold',
                fontSize:      10,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color:         C.tertiary,
              }}
            >
              Unit Calibration
            </Text>
            <Text
              style={{
                fontFamily:    'Epilogue-Bold',
                fontSize:      22,
                letterSpacing: -0.5,
                textTransform: 'uppercase',
                color:         C.text,
                marginTop:     2,
              }}
            >
              Character Setup
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily:    'Epilogue-Bold',
                fontSize:      20,
                letterSpacing: 1,
                color:         C.secondary,
              }}
            >
              STEP 02
            </Text>
            <Text
              style={{
                fontFamily:    'Lexend-SemiBold',
                fontSize:       9,
                letterSpacing:  2,
                textTransform: 'uppercase',
                color:          C.muted,
                marginTop:      2,
              }}
            >
              Biometrics
            </Text>
          </View>
        </View>

        {/* Shimmer progress bar — step 2 of 8 ≈ 25% */}
        <ProgressBar current={2} max={8} color="#a434ff" height="md" />
      </View>

      <View style={{ paddingHorizontal: 20 }}>

        {/* ── HERO SECTION ────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>

          {/* Left: title + description */}
          <View
            style={{
              flex: 2,
              backgroundColor: C.surfaceHigh,
              borderRadius: 14,
              borderLeftWidth: 4,
              borderLeftColor: C.accentLight,
              padding: 18,
              justifyContent: 'center',
              overflow: 'hidden',
              ...(Platform.OS === 'ios'
                ? { shadowColor: C.accentLight, shadowRadius: 28, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 0 } }
                : { elevation: 4 }),
            }}
          >
            {/* Background icon — decorative */}
            <Text
              style={{
                position:  'absolute',
                right:     -8,
                top:       -8,
                fontSize:  72,
                opacity:   0.07,
                color:     C.accentLight,
              }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              ◈
            </Text>

            <Text
              style={{
                fontFamily:    'Epilogue-Bold',
                fontSize:      17,
                lineHeight:    22,
                letterSpacing: -0.3,
                textTransform: 'uppercase',
                color:         C.text,
              }}
            >
              Define Your{' '}
              <Text style={{ color: C.accentLight }}>Physical Signature</Text>
            </Text>
            <Text
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize:   12,
                color:      C.muted,
                marginTop:  6,
                lineHeight: 18,
              }}
            >
              Precision data ensures your arena matchups are calculated with 99.9% accuracy.
            </Text>
          </View>

          {/* Right: status badge */}
          <View
            style={{
              flex: 1,
              backgroundColor: C.surfaceHighest,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(70,70,92,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 24 }}>🛡</Text>
            <Text
              style={{
                fontFamily:    'Lexend-SemiBold',
                fontSize:      9,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color:         C.muted,
              }}
            >
              Status
            </Text>
            <Text
              style={{
                fontFamily:    'Lexend-SemiBold',
                fontSize:      10,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color:         C.error,
              }}
            >
              UNVERIFIED
            </Text>
          </View>
        </View>

        {/* ── ORIGIN IDENTITY ──────────────────────────────────────────── */}
        <SectionLabel>Origin Identity</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {SEX_OPTIONS.map((opt) => {
            const selected = form.sex === opt.value;
            return (
              <View
                key={opt.value}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  ...(selected ? buildSelectionGlow(C.accentLight) : {}),
                }}
              >
                <Card
                  variant={selected ? 'elevated' : 'recessed'}
                  accentBorder={selected ? C.accentLight : undefined}
                  glowing={selected}
                  glowColor={C.accentLight}
                  onPress={() => handleSexSelect(opt.value)}
                  style={{
                    alignItems:  'center',
                    paddingVertical: 16,
                    borderWidth: selected ? 0 : 1,
                    borderColor: 'rgba(70,70,92,0.2)',
                    borderRadius: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize:  22,
                      color:     selected ? C.accentLight : C.dim,
                      marginBottom: 6,
                    }}
                  >
                    {opt.icon}
                  </Text>
                  <Text
                    style={{
                      fontFamily:    'Lexend-SemiBold',
                      fontSize:      10,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color:         selected ? C.accentLight : C.dim,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Card>
              </View>
            );
          })}
        </View>

        <Divider />

        {/* ── CURRENT AGE (birth date) ──────────────────────────────────── */}
        <View style={{ marginTop: 22, marginBottom: 22 }}>
          {/* Row: label + computed age badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>Current Age</SectionLabel>
            {age !== null && (
              <Text
                style={{
                  fontFamily: 'Epilogue-Bold',
                  fontSize:   13,
                  color:      ageValid ? C.secondary : C.error,
                  marginBottom: 10,
                }}
              >
                {age}{' '}
                <Text
                  style={{
                    fontFamily: 'Lexend-SemiBold',
                    fontSize:   9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: C.dim,
                  }}
                >
                  YRS
                </Text>
              </Text>
            )}
          </View>

          <HUDInput
            value={form.birthDate}
            onChangeText={handleBirthDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            maxLength={10}
            unit="YEARS"
            error={ageError}
          />
        </View>

        <Divider />

        {/* ── UNIT TOGGLE ──────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 18, marginBottom: 4, gap: 4 }}>
          {(['metric', 'imperial'] as const).map((sys) => {
            const active = form.unitSystem === sys;
            return (
              <Pressable
                key={sys}
                onPress={() => handleUnitToggle(sys)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical:    5,
                  borderRadius:       20,
                  backgroundColor:    active ? C.accent : C.surfaceHighest,
                  borderWidth:        1,
                  borderColor:        active ? C.accentLight : 'rgba(70,70,92,0.3)',
                }}
              >
                <Text
                  style={{
                    fontFamily:    'Lexend-SemiBold',
                    fontSize:      10,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color:         active ? '#fff' : C.muted,
                  }}
                >
                  {sys === 'metric' ? 'KG / CM' : 'LB / IN'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── COMBAT WEIGHT ────────────────────────────────────────────── */}
        <View style={{ marginTop: 18, marginBottom: 22 }}>
          <SectionLabel>Combat Weight</SectionLabel>
          <HUDInput
            value={form.bodyWeight}
            onChangeText={handleWeight}
            placeholder={form.unitSystem === 'metric' ? '80' : '176'}
            keyboardType="numeric"
            unit={weightUnit.toUpperCase()}
            error={
              form.bodyWeight && !weightOk
                ? `Enter a valid weight (${form.unitSystem === 'metric' ? '20–300 kg' : '44–661 lbs'})`
                : undefined
            }
          />
        </View>

        <Divider />

        {/* ── STATURE HEIGHT ───────────────────────────────────────────── */}
        <View style={{ marginTop: 22, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>Stature Height</SectionLabel>

            {/* Live display of entered value in large type */}
            {form.height ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <Text
                  style={{
                    fontFamily: 'Epilogue-Bold',
                    fontSize:   22,
                    color:      C.tertiary,
                    letterSpacing: -0.5,
                  }}
                >
                  {form.height}
                </Text>
                <Text
                  style={{
                    fontFamily:    'Lexend-SemiBold',
                    fontSize:      9,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color:         C.dim,
                  }}
                >
                  {heightUnit}
                </Text>
              </View>
            ) : null}
          </View>

          <HUDInput
            value={form.height}
            onChangeText={handleHeight}
            placeholder={form.unitSystem === 'metric' ? '175' : '69'}
            keyboardType="numeric"
            unit={heightUnit.toUpperCase()}
            error={
              form.height && !heightOk
                ? `Enter a valid height (${form.unitSystem === 'metric' ? '100–250 cm' : '39–98 in'})`
                : undefined
            }
          />
        </View>

        {/* ── UP NEXT TEASER ───────────────────────────────────────────── */}
        <View
          style={{
            marginTop: 32,
            backgroundColor: C.surfaceHigh,
            borderRadius: 14,
            borderTopWidth: 1,
            borderTopColor: 'rgba(70,70,92,0.2)',
            overflow: 'hidden',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 }}>
            {/* Icon container */}
            <View
              style={{
                width:           52,
                height:          52,
                borderRadius:    26,
                backgroundColor: 'rgba(129,236,255,0.1)',
                alignItems:      'center',
                justifyContent:  'center',
              }}
            >
              <Text style={{ fontSize: 24, color: C.tertiary }}>🏋</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily:    'Epilogue-Bold',
                  fontSize:      14,
                  letterSpacing: -0.2,
                  textTransform: 'uppercase',
                  color:         C.text,
                }}
              >
                UP NEXT: Battle Experience
              </Text>
              <Text
                style={{
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize:   12,
                  color:      C.muted,
                  marginTop:  3,
                  lineHeight: 17,
                }}
              >
                We'll calibrate your 1-Rep Max and cardiovascular threshold.
              </Text>
            </View>

            <Text style={{ color: C.dim, fontSize: 20 }}>›</Text>
          </View>
        </View>

        {/* ── LOCK IN CREDENTIALS (primary CTA) ───────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Button
            variant="primary"
            size="hero"
            fullWidth
            glowing={isFormComplete}
            disabled={!isFormComplete}
            onPress={onNext}
          >
            Lock In Credentials
          </Button>
        </View>

        {/* ── SKIP LINK ────────────────────────────────────────────────── */}
        <Pressable
          onPress={onNext}
          style={{ alignItems: 'center', paddingVertical: 16, marginTop: 4 }}
        >
          <Text
            style={{
              fontFamily:    'Lexend-SemiBold',
              fontSize:      11,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              color:         C.dim,
              opacity:       0.7,
            }}
          >
            Skip for now (Limited Rewards)
          </Text>
        </Pressable>

      </View>
    </ScrollView>
  );
}

export default StepBiodata;
