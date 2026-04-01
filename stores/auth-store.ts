import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  readonly session: Session | null;
  readonly user: User | null;
  readonly isLoading: boolean;
  readonly isGuest: boolean;
  readonly setSession: (session: Session | null) => void;
  readonly setLoading: (loading: boolean) => void;
  readonly enterGuestMode: () => void;
  readonly exitGuestMode: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isGuest: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false, isGuest: false }),
  setLoading: (isLoading) => set({ isLoading }),
  enterGuestMode: () => set({ isGuest: true, isLoading: false }),
  exitGuestMode: () => set({ isGuest: false }),
}));
