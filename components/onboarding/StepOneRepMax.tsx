import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { OnboardingFormState } from './types';
import { DrumPicker } from './DrumPicker';
import { GymClashWheelModal } from '@/components/ui/GymClashWheelModal';
import { GymClashWheelTrigger } from '@/components/ui/GymClashWheelTrigger';

interface StepOneRepMaxProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

interface LiftField {
  readonly label: string;
  readonly key: 'squat1RM' | 'bench1RM' | 'deadlift1RM' | 'ohp1RM';
}

const LIFT_FIELDS: readonly LiftField[] = [
  { label: 'Squat', key: 'squat1RM' },
  { label: 'Bench Press', key: 'bench1RM' },
  { label: 'Deadlift', key: 'deadlift1RM' },
  { label: 'Overhead Press', key: 'ohp1RM' },
] as const;

// ── Picker item builders ─────────────────────────────────────────────────────
// Imperial: — then 5, 10, … 700 lbs (5 lb increments)
function buildLbsItems(): ReadonlyArray<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [{ label: '—', value: '' }];
  for (let v = 5; v <= 700; v += 5) {
    items.push({ label: String(v), value: String(v) });
  }
  return items;
}

// Metric: — then 2.5, 5, … 320 kg (2.5 kg increments)
function buildKgItems(): ReadonlyArray<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [{ label: '—', value: '' }];
  for (let v = 2.5; v <= 320; v = Math.round((v + 2.5) * 10) / 10) {
    items.push({ label: v % 1 === 0 ? String(v) : v.toFixed(1), value: String(v) });
  }
  return items;
}

const LBS_ITEMS = buildLbsItems();
const KG_ITEMS = buildKgItems();

// Snap a raw string value to the nearest available item value
function snapValue(raw: string, items: ReadonlyArray<{ label: string; value: string }>): string {
  if (!raw) return '';
  const n = parseFloat(raw);
  if (isNaN(n) || n <= 0) return '';
  let best = '';
  let bestDist = Infinity;
  for (const item of items) {
    if (item.value === '') continue;
    const dist = Math.abs(parseFloat(item.value) - n);
    if (dist < bestDist) {
      bestDist = dist;
      best = item.value;
    }
  }
  return best;
}

export function StepOneRepMax({ form, onUpdate, onNext }: StepOneRepMaxProps) {
  const unitLabel = form.unitSystem === 'imperial' ? 'lbs' : 'kg';
  const items = form.unitSystem === 'imperial' ? LBS_ITEMS : KG_ITEMS;
  const [activeLiftKey, setActiveLiftKey] = useState<LiftField['key'] | null>(null);

  const activeLift = useMemo(
    () => LIFT_FIELDS.find((field) => field.key === activeLiftKey) ?? null,
    [activeLiftKey],
  );

  const handleLiftChange = (key: LiftField['key'], nextValue: string) => {
    onUpdate({ [key]: nextValue } as Partial<OnboardingFormState>);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0c0c1f' }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title */}
      <Text
        style={{
          fontFamily: 'Epilogue-Bold',
          fontSize: 28,
          color: '#e5e3ff',
          letterSpacing: 1,
          marginBottom: 6,
        }}
      >
        1 Rep Max
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontFamily: 'BeVietnamPro-Regular',
          fontSize: 14,
          color: '#aaa8c3',
          marginBottom: 28,
          lineHeight: 22,
        }}
      >
        Optional — helps predict your output. Tap to set each lift, or leave it blank to skip.
      </Text>

      {/* Lift pickers */}
      {LIFT_FIELDS.map((field) => (
        <View key={field.key} style={{ marginBottom: 24 }}>
          <GymClashWheelTrigger
            label={`${field.label} (${unitLabel})`}
            value={form[field.key] ? `${form[field.key]} ${unitLabel}` : ''}
            placeholder="Tap to set or leave blank"
            onPress={() => setActiveLiftKey(field.key)}
          />
        </View>
      ))}

      {/* Info note */}
      <Text
        style={{
          fontFamily: 'BeVietnamPro-Regular',
          fontSize: 12,
          color: '#74738b',
          marginBottom: 28,
          lineHeight: 18,
        }}
      >
        Don't worry if you're unsure — the system will learn your baseline from your first few
        sessions.
      </Text>

      {/* Continue */}
      <Pressable
        style={{
          backgroundColor: '#a434ff',
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: 'center',
          shadowColor: '#a434ff',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
          elevation: 12,
        }}
        onPress={onNext}
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

      {/* Skip */}
      <Pressable
        style={{ marginTop: 14, alignItems: 'center', paddingVertical: 8 }}
        onPress={onNext}
      >
        <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: '#74738b' }}>
          Skip this for now
        </Text>
      </Pressable>

      <GymClashWheelModal
        visible={activeLift !== null}
        title={activeLift ? `${activeLift.label} (${unitLabel})` : '1 Rep Max'}
        subtitle="Tap or slide until the lift target is centered."
        onClose={() => setActiveLiftKey(null)}
      >
        {activeLift ? (
          <DrumPicker
            key={`${activeLift.key}-${form.unitSystem}`}
            items={items}
            value={snapValue(form[activeLift.key], items)}
            onChange={(nextValue) => handleLiftChange(activeLift.key, nextValue)}
            unit={unitLabel}
          />
        ) : null}
      </GymClashWheelModal>
    </ScrollView>
  );
}
