import { create } from 'zustand';
import type { GpsRoutePoint, GpsRoute, GpsTrackingStatus } from '@/types';

interface GpsState {
  readonly status: GpsTrackingStatus;
  readonly points: readonly GpsRoutePoint[];
  readonly currentRoute: GpsRoute | null;
  readonly error: string | null;
}

interface GpsActions {
  readonly setStatus: (status: GpsTrackingStatus) => void;
  readonly addPoint: (point: GpsRoutePoint) => void;
  readonly setRoute: (route: GpsRoute) => void;
  readonly setError: (error: string | null) => void;
  readonly reset: () => void;
}

type GpsStore = GpsState & GpsActions;

const initialState: GpsState = {
  status: 'idle',
  points: [],
  currentRoute: null,
  error: null,
};

export const useGpsStore = create<GpsStore>()((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  addPoint: (point) =>
    set((state) => ({
      // Use immutable spread to ensure Zustand state updates trigger re-renders correctly
      points: [...state.points, point],
    })),

  setRoute: (route) => set({ currentRoute: route }),

  setError: (error) =>
    set({
      error,
      status: error !== null ? 'error' : 'idle',
    }),

  reset: () => set(initialState),
}));
