import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GymClashWheelPicker, type GymClashWheelItem } from '@/components/ui/GymClashWheelPicker';

export const DRUM_ITEM_H = 48;
const VISIBLE = 5;
export const DRUM_PICKER_H = DRUM_ITEM_H * VISIBLE;

export interface DrumPickerItem {
  readonly label: string;
  readonly value: string;
}

interface DrumPickerProps {
  readonly items: ReadonlyArray<DrumPickerItem>;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly unit?: string;
}

export function DrumPicker({ items, value, onChange, unit }: DrumPickerProps) {
  const data = useMemo<ReadonlyArray<GymClashWheelItem<string>>>(() => {
    return items.map((item) => ({
      value: item.value,
      label: unit && item.value !== '' ? `${item.label} ${unit}` : item.label,
    }));
  }, [items, unit]);

  const normalizedValue = useMemo(() => {
    if (data.some((item) => item.value === value)) return value;
    return data[0]?.value ?? '';
  }, [data, value]);

  useEffect(() => {
    if (normalizedValue !== value) {
      onChange(normalizedValue);
    }
  }, [normalizedValue, onChange, value]);

  if (data.length === 0) {
    return <View style={{ height: DRUM_PICKER_H }} />;
  }

  return (
    <GymClashWheelPicker
      data={data}
      value={normalizedValue}
      onChange={onChange}
      itemHeight={DRUM_ITEM_H}
      visibleItemCount={VISIBLE}
      width="100%"
    />
  );
}
