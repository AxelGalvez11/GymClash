import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  readonly session: Session | null;
  readonly user: User | null;
  readonly isLoading: boolean;
  readonly setSession: (session: Session | null) => void;
  readonly setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
