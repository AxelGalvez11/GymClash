import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccentKey = 'purple' | 'blue' | 'red' | 'green' | 'gold';

export interface AccentPalette {
  readonly DEFAULT: string;
  readonly light: string;
  readonly dark: string;
}

export const ACCENT_OPTIONS: Record<AccentKey, AccentPalette> = {
  purple: { DEFAULT: '#ce96ff', light: '#c583ff', dark: '#a434ff' },
  blue: { DEFAULT: '#81ecff', light: '#00e3fd', dark: '#00d4ec' },
  red: { DEFAULT: '#ff6e84', light: '#ffb2b9', dark: '#d73357' },
  green: { DEFAULT: '#10B981', light: '#34D399', dark: '#047857' },
  gold: { DEFAULT: '#ffd709', light: '#efc900', dark: '#705d00' },
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
