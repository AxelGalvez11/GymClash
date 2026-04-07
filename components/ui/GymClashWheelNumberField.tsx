import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GymClashWheelPicker, type GymClashWheelItem } from './GymClashWheelPicker';
import { GymClashWheelModal } from './GymClashWheelModal';
import { GymClashWheelTrigger } from './GymClashWheelTrigger';

interface GymClashWheelNumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly suffix?: string;
}

function formatValue(value: number, suffix?: string) {
  return `${value}${suffix ? ` ${suffix}` : ''}`;
}

export function GymClashWheelNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: GymClashWheelNumberFieldProps) {
  const [open, setOpen] = useState(false);

  const data = useMemo<ReadonlyArray<GymClashWheelItem<number>>>(() => {
    const next: GymClashWheelItem<number>[] = [];
    for (let current = min; current <= max + step / 2; current += step) {
      const normalized = Number.isInteger(step) ? current : Number(current.toFixed(4));
      next.push({
        value: normalized,
        label: formatValue(normalized, suffix),
      });
    }
    return next;
  }, [max, min, step, suffix]);

  const progress = max > min ? (value - min) / (max - min) : 0;

  return (
    <View style={styles.shell}>
      <GymClashWheelTrigger
        label={label}
        value={formatValue(value, suffix)}
        onPress={() => setOpen(true)}
      />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` as const }]} />
      </View>

      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{formatValue(min, suffix)}</Text>
        <Text style={styles.rangeText}>{formatValue(max, suffix)}</Text>
      </View>

      <GymClashWheelModal
        visible={open}
        title={label}
        subtitle="Slide or tap to align the selection."
        onClose={() => setOpen(false)}
      >
        <GymClashWheelPicker
          data={data}
          value={value}
          onChange={onChange}
          itemHeight={56}
          visibleItemCount={5}
          width="100%"
        />
      </GymClashWheelModal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#23233f',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#ce96ff',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  rangeText: {
    color: '#74738b',
    fontFamily: 'Lexend-SemiBold',
    fontSize: 9,
  },
});
