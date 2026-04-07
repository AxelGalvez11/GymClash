import { useMemo, useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { GymClashWheelModal } from '@/components/ui/GymClashWheelModal';
import { GymClashWheelTrigger } from '@/components/ui/GymClashWheelTrigger';
import { DrumPicker } from './DrumPicker';
import type { OnboardingFormState, SexOption, UnitSystem } from './types';
import { Colors } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepBiodataProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

// ─── Design Tokens — pulls from theme ────────────────────────────────────────

const C = {
  bg:             Colors.surface.DEFAULT,
  surface:        Colors.surface.container,
  surfaceHigh:    Colors.surface.containerHigh,
  surfaceHighest: Colors.surface.containerHighest,
  surfaceLowest:  Colors.surface.containerLowest,
  text:           Colors.text.primary,
  muted:          Colors.text.secondary,
  dim:            Colors.text.muted,
  outline:        Colors.outline.variant,
  accent:         Colors.primary.dim,
  accentLight:    Colors.primary.DEFAULT,
  tertiary:       Colors.tertiary.DEFAULT,
  secondary:      Colors.secondary.DEFAULT,
  error:          Colors.error.DEFAULT,
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const LB_TO_KG = 0.453592 as const;
const IN_TO_CM = 2.54 as const;

type SexMeta = { readonly value: SexOption; readonly label: string; readonly icon: string };

const SEX_OPTIONS: ReadonlyArray<SexMeta> = [
  { value: 'male',   label: 'MALE',   icon: '♂' },
  { value: 'female', label: 'FEMALE', icon: '♀' },
] as const;

// Picker data
const MONTH_ITEMS = Array.from({ length: 12 }, (_, i) => {
  const v = String(i + 1).padStart(2, '0');
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return { label: labels[i], value: v };
});
const DAY_ITEMS = Array.from({ length: 31 }, (_, i) => {
  const v = String(i + 1).padStart(2, '0');
  return { label: v, value: v };
});
const currentYear = new Date().getFullYear();
const YEAR_ITEMS = Array.from({ length: 80 }, (_, i) => {
  const v = String(currentYear - 14 - i); // 14–93 years old range
  return { label: v, value: v };
});

const WEIGHT_LB_ITEMS = Array.from({ length: 131 }, (_, i) => { // 70–330 lbs
  const v = String(70 + i * 2);
  return { label: v, value: v };
});
const WEIGHT_KG_ITEMS = Array.from({ length: 141 }, (_, i) => { // 30–170 kg
  const v = String(30 + i);
  return { label: v, value: v };
});

const FT_ITEMS = Array.from({ length: 5 }, (_, i) => ({ label: String(3 + i), value: String(3 + i) }));
const IN_ITEMS = Array.from({ length: 12 }, (_, i) => ({ label: String(i), value: String(i) }));
const CM_ITEMS = Array.from({ length: 121 }, (_, i) => { // 120–240 cm
  const v = String(120 + i);
  return { label: v, value: v };
});

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Convert MM-DD-YYYY display format to YYYY-MM-DD for storage. */
export function displayDateToIso(display: string): string {
  const match = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return '';
  return `${match[3]}-${match[1]}-${match[2]}`;
}

function computeAge(birthDateStr: string): number | null {
  const match = birthDateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1) return null;
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

function validateImperialHeight(ft: string, inches: string): boolean {
  const f = parseInt(ft, 10);
  const i = parseInt(inches, 10);
  if (isNaN(f)) return false;
  const totalIn = f * 12 + (isNaN(i) ? 0 : i);
  return totalIn * IN_TO_CM >= 100 && totalIn * IN_TO_CM <= 250;
}

function validateMetricHeight(value: string): boolean {
  const n = parseFloat(value);
  return !isNaN(n) && n >= 100 && n <= 250;
}

function imperialHeightToTotalInches(ft: string, inches: string): string {
  const f = parseInt(ft, 10);
  const i = parseInt(inches, 10);
  if (isNaN(f)) return '';
  return String(f * 12 + (isNaN(i) ? 0 : i));
}

function totalInchesToImperialHeight(totalInches: number) {
  const rounded = Math.max(0, Math.round(totalInches));
  return {
    feet: String(Math.floor(rounded / 12)),
    inches: String(rounded % 12),
  };
}

function buildSelectionGlow(color: string): object {
  if (Platform.OS !== 'ios') return {};
  return { shadowColor: color, shadowRadius: 14, shadowOpacity: 0.55, shadowOffset: { width: 0, height: 0 } };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { readonly children: string }) {
  return (
    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>
      {children}
    </Text>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: C.outline, opacity: 0.25, marginVertical: 4 }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StepBiodata({ form, onUpdate, onNext }: StepBiodataProps) {
  const defaultWeightValue = form.unitSystem === 'imperial' ? '160' : '70';
  const defaultMetricHeight = '170';
  const defaultImperialHeightFt = '5';
  const defaultImperialHeightIn = '8';

  // Picker modal state
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const [showHeightPicker, setShowHeightPicker] = useState(false);

  // Parse birthdate into parts for pickers
  const birthParts = useMemo(() => {
    const match = form.birthDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) return { month: match[1], day: match[2], year: match[3] };
    return { month: '', day: '', year: '' };
  }, [form.birthDate]);

  const [tempMonth, setTempMonth] = useState(birthParts.month || '01');
  const [tempDay, setTempDay] = useState(birthParts.day || '15');
  const [tempYear, setTempYear] = useState(birthParts.year || String(currentYear - 25));

  const age = useMemo(() => computeAge(form.birthDate), [form.birthDate]);
  const ageValid = validateAge(age);
  const weightOk = validateWeight(form.bodyWeight, form.unitSystem);
  const heightOk = form.unitSystem === 'imperial'
    ? validateImperialHeight(form.heightFt, form.heightIn)
    : validateMetricHeight(form.height);

  const isFormComplete = useMemo(() => {
    const hasHeight = form.unitSystem === 'imperial' ? !!form.heightFt : !!form.height;
    return !!(form.sex && form.birthDate && ageValid && form.bodyWeight && weightOk && hasHeight && heightOk);
  }, [form.sex, form.birthDate, ageValid, form.bodyWeight, weightOk, form.height, form.heightFt, form.unitSystem, heightOk]);

  const weightUnit = form.unitSystem === 'metric' ? 'kg' : 'lbs';

  // Handlers
  const handleSexSelect = useCallback(
    (value: SexOption) => onUpdate({ sex: value }),
    [onUpdate],
  );

  const handleBirthDone = useCallback(() => {
    const dateStr = `${tempMonth}-${tempDay}-${tempYear}`;
    onUpdate({ birthDate: dateStr });
    setShowBirthPicker(false);
  }, [tempMonth, tempDay, tempYear, onUpdate]);

  const handleWeightDone = useCallback(() => {
    if (!form.bodyWeight) {
      onUpdate({ bodyWeight: defaultWeightValue });
    }
    setShowWeightPicker(false);
  }, [defaultWeightValue, form.bodyWeight, onUpdate]);

  const handleHeightDone = useCallback(() => {
    if (form.unitSystem === 'imperial') {
      const nextFeet = form.heightFt || defaultImperialHeightFt;
      const nextInches = form.heightIn || defaultImperialHeightIn;
      onUpdate({
        heightFt: nextFeet,
        heightIn: nextInches,
        height: imperialHeightToTotalInches(nextFeet, nextInches),
      });
    } else if (!form.height) {
      onUpdate({ height: defaultMetricHeight });
    }
    setShowHeightPicker(false);
  }, [
    defaultImperialHeightFt,
    defaultImperialHeightIn,
    defaultMetricHeight,
    form.height,
    form.heightFt,
    form.heightIn,
    form.unitSystem,
    onUpdate,
  ]);

  const handleUnitToggle = useCallback(
    (next: UnitSystem) => {
      if (next === form.unitSystem) return;

      // Convert weight
      const n = parseFloat(form.bodyWeight);
      let newWeight = '';
      if (!isNaN(n)) {
        newWeight = next === 'imperial'
          ? String(Math.round((n / LB_TO_KG) / 2) * 2)
          : String(Math.round(n * LB_TO_KG));
      }

      let nextHeight = form.height;
      let nextHeightFt = form.heightFt;
      let nextHeightIn = form.heightIn;

      if (next === 'metric') {
        if (form.heightFt) {
          const totalInches = parseInt(form.heightFt, 10) * 12 + parseInt(form.heightIn || '0', 10);
          if (!Number.isNaN(totalInches) && totalInches > 0) {
            nextHeight = String(Math.round(totalInches * IN_TO_CM));
          }
        }
        nextHeightFt = '';
        nextHeightIn = '';
      } else {
        const heightCm = parseFloat(form.height);
        if (!Number.isNaN(heightCm) && heightCm > 0) {
          const { feet, inches } = totalInchesToImperialHeight(heightCm / IN_TO_CM);
          nextHeightFt = feet;
          nextHeightIn = inches;
          nextHeight = imperialHeightToTotalInches(feet, inches);
        } else {
          nextHeight = '';
        }
      }

      onUpdate({
        unitSystem: next,
        bodyWeight: newWeight,
        height: nextHeight,
        heightFt: nextHeightFt,
        heightIn: nextHeightIn,
      });
    },
    [form.bodyWeight, form.height, form.heightFt, form.heightIn, form.unitSystem, onUpdate],
  );

  const openWeightPicker = useCallback(() => {
    if (!form.bodyWeight) {
      onUpdate({ bodyWeight: defaultWeightValue });
    }
    setShowWeightPicker(true);
  }, [defaultWeightValue, form.bodyWeight, onUpdate]);

  const openHeightPicker = useCallback(() => {
    if (form.unitSystem === 'imperial') {
      const nextFeet = form.heightFt || defaultImperialHeightFt;
      const nextInches = form.heightIn || defaultImperialHeightIn;
      onUpdate({
        heightFt: nextFeet,
        heightIn: nextInches,
        height: imperialHeightToTotalInches(nextFeet, nextInches),
      });
    } else if (!form.height) {
      onUpdate({ height: defaultMetricHeight });
    }
    setShowHeightPicker(true);
  }, [
    defaultImperialHeightFt,
    defaultImperialHeightIn,
    defaultMetricHeight,
    form.height,
    form.heightFt,
    form.heightIn,
    form.unitSystem,
    onUpdate,
  ]);

  // Display values
  const birthDisplay = form.birthDate.length === 10
    ? `${birthParts.month}/${birthParts.day}/${birthParts.year}`
    : '';

  const heightDisplay = form.unitSystem === 'imperial'
    ? (form.heightFt ? `${form.heightFt}'${form.heightIn || '0'}"` : '')
    : (form.height || '');

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── HUD PROGRESS HEADER ─────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <View>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: C.tertiary }}>
              Unit Calibration
            </Text>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, letterSpacing: -0.5, textTransform: 'uppercase', color: C.text, marginTop: 2 }}>
              Character Setup
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 20, letterSpacing: 1, color: C.secondary }}>STEP 02</Text>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: C.muted, marginTop: 2 }}>Biometrics</Text>
          </View>
        </View>
        <ProgressBar current={2} max={7} color="#a434ff" height="md" />
      </View>

      <View style={{ paddingHorizontal: 20 }}>

        {/* ── ORIGIN IDENTITY ──────────────────────────────────────────── */}
        <SectionLabel>Origin Identity</SectionLabel>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {SEX_OPTIONS.map((opt) => {
            const selected = form.sex === opt.value;
            return (
              <View key={opt.value} style={{ flex: 1, borderRadius: 14, ...(selected ? buildSelectionGlow(C.accentLight) : {}) }}>
                <Card
                  variant={selected ? 'elevated' : 'recessed'}
                  accentBorder={selected ? C.accentLight : undefined}
                  glowing={selected}
                  glowColor={C.accentLight}
                  onPress={() => handleSexSelect(opt.value)}
                  style={{ alignItems: 'center', paddingVertical: 16, borderWidth: selected ? 0 : 1, borderColor: 'rgba(70,70,92,0.2)', borderRadius: 14 }}
                >
                  <Text style={{ fontSize: 22, color: selected ? C.accentLight : C.dim, marginBottom: 6 }}>{opt.icon}</Text>
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: selected ? C.accentLight : C.dim }}>{opt.label}</Text>
                </Card>
              </View>
            );
          })}
        </View>

        <Divider />

        {/* ── BIRTH DATE ───────────────────────────────────────────────── */}
        <View style={{ marginTop: 22, marginBottom: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <SectionLabel>Birth Date</SectionLabel>
            {age !== null && (
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 13, color: ageValid ? C.secondary : C.error, marginBottom: 10 }}>
                {age} <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1.5, color: C.dim }}>YRS</Text>
              </Text>
            )}
          </View>
          <GymClashWheelTrigger
            label="Birthday"
            value={birthDisplay}
            onPress={() => {
              if (form.birthDate.length === 10) {
                setTempMonth(birthParts.month);
                setTempDay(birthParts.day);
                setTempYear(birthParts.year);
              }
              setShowBirthPicker(true);
            }}
            placeholder="Tap to set"
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
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  backgroundColor: active ? C.accent : C.surfaceHighest,
                  borderWidth: 1, borderColor: active ? C.accentLight : 'rgba(70,70,92,0.3)',
                }}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: active ? '#fff' : C.muted }}>
                  {sys === 'metric' ? 'KG / CM' : 'LB / FT'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── COMBAT WEIGHT ────────────────────────────────────────────── */}
        <View style={{ marginTop: 18, marginBottom: 22 }}>
          <SectionLabel>Combat Weight</SectionLabel>
          <GymClashWheelTrigger
            label="Weight"
            value={form.bodyWeight ? `${form.bodyWeight} ${weightUnit}` : ''}
            onPress={openWeightPicker}
            placeholder="Tap to set"
          />
        </View>

        <Divider />

        {/* ── STATURE HEIGHT ───────────────────────────────────────────── */}
        <View style={{ marginTop: 22, marginBottom: 8 }}>
          <SectionLabel>Stature Height</SectionLabel>
          <GymClashWheelTrigger
            label="Height"
            value={heightDisplay}
            onPress={openHeightPicker}
            placeholder="Tap to set"
          />
        </View>

        {/* ── LOCK IN CREDENTIALS ───────────────────────────────────────── */}
        <View style={{ marginTop: 32 }}>
          <Button variant="primary" size="hero" fullWidth glowing={isFormComplete} disabled={!isFormComplete} onPress={onNext}>
            Lock In Credentials
          </Button>
        </View>

        <Pressable onPress={onNext} style={{ alignItems: 'center', paddingVertical: 16, marginTop: 4 }}>
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: C.dim, opacity: 0.7 }}>
            Skip for now (Limited Rewards)
          </Text>
        </Pressable>
      </View>

      {/* ── BIRTH DATE PICKER MODAL ─────────────────────────────────── */}
      <GymClashWheelModal
        visible={showBirthPicker}
        title="Birth Date"
        subtitle="Tap or slide until the date is centered."
        onClose={handleBirthDone}
      >
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8 }}>
          <View style={{ flex: 1.2 }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.dim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 }}>MONTH</Text>
            <DrumPicker items={MONTH_ITEMS} value={tempMonth} onChange={setTempMonth} />
          </View>
          <View style={{ flex: 0.8 }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.dim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 }}>DAY</Text>
            <DrumPicker items={DAY_ITEMS} value={tempDay} onChange={setTempDay} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.dim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 }}>YEAR</Text>
            <DrumPicker items={YEAR_ITEMS} value={tempYear} onChange={setTempYear} />
          </View>
        </View>
      </GymClashWheelModal>

      {/* ── WEIGHT PICKER MODAL ─────────────────────────────────────── */}
      <GymClashWheelModal
        visible={showWeightPicker}
        title={`Weight (${weightUnit})`}
        subtitle="Tap or slide until the value is centered."
        onClose={handleWeightDone}
      >
        <View style={{ paddingHorizontal: 40 }}>
          <DrumPicker
            items={form.unitSystem === 'imperial' ? WEIGHT_LB_ITEMS : WEIGHT_KG_ITEMS}
            value={form.bodyWeight || defaultWeightValue}
            onChange={(v) => onUpdate({ bodyWeight: v })}
            unit={weightUnit}
          />
        </View>
      </GymClashWheelModal>

      {/* ── HEIGHT PICKER MODAL ─────────────────────────────────────── */}
      <GymClashWheelModal
        visible={showHeightPicker}
        title={form.unitSystem === 'imperial' ? 'Height (ft / in)' : 'Height (cm)'}
        subtitle="Tap or slide until the height is centered."
        onClose={handleHeightDone}
      >
        {form.unitSystem === 'imperial' ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.dim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 }}>FT</Text>
              <DrumPicker
                items={FT_ITEMS}
                value={form.heightFt || defaultImperialHeightFt}
                onChange={(v) => onUpdate({ heightFt: v, height: imperialHeightToTotalInches(v, form.heightIn || defaultImperialHeightIn) })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: C.dim, letterSpacing: 1.5, textAlign: 'center', marginBottom: 4 }}>IN</Text>
              <DrumPicker
                items={IN_ITEMS}
                value={form.heightIn || defaultImperialHeightIn}
                onChange={(v) => onUpdate({ heightIn: v, height: imperialHeightToTotalInches(form.heightFt || defaultImperialHeightFt, v) })}
              />
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 40 }}>
            <DrumPicker
              items={CM_ITEMS}
              value={form.height || defaultMetricHeight}
              onChange={(v) => onUpdate({ height: v })}
              unit="cm"
            />
          </View>
        )}
      </GymClashWheelModal>
    </ScrollView>
  );
}

export default StepBiodata;
