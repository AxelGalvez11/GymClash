import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccentKey = 'purple' | 'blue' | 'red' | 'green' | 'amber';

export interface AccentPalette {
  readonly DEFAULT: string;
  readonly light: string;
  readonly dark: string;
}

export const ACCENT_OPTIONS: Record<AccentKey, AccentPalette> = {
  purple: { DEFAULT: '#8B5CF6', light: '#A78BFA', dark: '#6D28D9' },
  blue: { DEFAULT: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8' },
  red: { DEFAULT: '#EF4444', light: '#F87171', dark: '#B91C1C' },
  green: { DEFAULT: '#10B981', light: '#34D399', dark: '#047857' },
  amber: { DEFAULT: '#F59E0B', light: '#FBBF24', dark: '#B45309' },
} as const;

interface AccentState {
  readonly accentKey: AccentKey;
  readonly setAccent: (key: AccentKey) => void;
}

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      accentKey: 'purple',
      setAccent: (accentKey) => set({ accentKey }),
    }),
    {
      name: 'gymclash-accent',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** Get the active accent palette. */
export function useAccent(): AccentPalette {
  const key = useAccentStore((s) => s.accentKey);
  return ACCENT_OPTIONS[key];
}
