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
    set((state) => {
      // Mutable push to avoid O(n^2) copying on long runs
      const next = (state.points as GpsRoutePoint[]);
      next.push(point);
      return { points: next };
    }),

  setRoute: (route) => set({ currentRoute: route }),

  setError: (error) =>
    set({
      error,
      status: error !== null ? 'error' : 'idle',
    }),

  reset: () => set(initialState),
}));
