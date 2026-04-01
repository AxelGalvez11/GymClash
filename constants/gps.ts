export const GPS_CONFIG = {
  /** Minimum meters between recorded GPS points */
  DISTANCE_FILTER: 10,

  /** Update interval for Android (ms) */
  UPDATE_INTERVAL: 3000,

  /** GPS accuracy mode */
  ACCURACY: 'high' as const,

  /** Maximum acceptable accuracy in meters (points worse than this are discarded) */
  MAX_ACCURACY_METERS: 30,

  /** Gym proximity radius in meters */
  GYM_PROXIMITY_RADIUS: 200,

  /** Minimum distance in km for GPS-scored runs */
  MIN_SCORED_DISTANCE_KM: 0.5,

  /** Maximum speed in m/s before flagging as suspicious (45 km/h) */
  MAX_PLAUSIBLE_SPEED: 12.5,

  /** Minimum points for a valid GPS route */
  MIN_ROUTE_POINTS: 5,
} as const;
