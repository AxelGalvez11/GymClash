import type { ReasonCode } from '@/types';

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  impossible_speed: 'Speed exceeds human capabilities',
  route_sanity_fail: 'Route data appears inconsistent',
  pace_cadence_mismatch: 'Pace does not match step cadence',
  pace_hr_mismatch: 'Pace does not match heart rate data',
  spoof_detected: 'Location data appears spoofed',
  pause_abuse: 'Excessive pausing detected',
  impossible_density: 'Too many sets in the recorded time',
  tonnage_spike: 'Volume far exceeds recent history',
  progression_jump: 'Weight progression exceeds expected rate',
  impossible_rest: 'Rest periods are impossibly short',
  suspicious_edit: 'Manual edits to validated data detected',
  effort_biometric_mismatch: 'Claimed effort does not match biometric data',
  clean: 'No issues detected',
};

export const REASON_CODE_SEVERITY: Record<ReasonCode, 'critical' | 'warning' | 'info'> = {
  impossible_speed: 'critical',
  route_sanity_fail: 'warning',
  pace_cadence_mismatch: 'warning',
  pace_hr_mismatch: 'info',
  spoof_detected: 'critical',
  pause_abuse: 'warning',
  impossible_density: 'critical',
  tonnage_spike: 'warning',
  progression_jump: 'warning',
  impossible_rest: 'critical',
  suspicious_edit: 'warning',
  effort_biometric_mismatch: 'info',
  clean: 'info',
};
