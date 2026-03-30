// ─── Enums ───────────────────────────────────────────────

export type WorkoutType = 'strength' | 'scout';

export type ValidationStatus =
  | 'accepted'
  | 'accepted_with_low_confidence'
  | 'held_for_review'
  | 'excluded_from_clan_score'
  | 'rejected';

export type WorkoutStatus = 'draft' | 'submitted' | 'validated' | 'rejected';

export type EvidenceSource = 'manual' | 'sensor' | 'wearable';

export type Rank =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'champion';

export type ClanRole = 'leader' | 'officer' | 'member';

export type ClanWarStatus = 'scheduled' | 'active' | 'completed';

export type AppealStatus = 'pending' | 'under_review' | 'approved' | 'denied';

export type ReportCategory =
  | 'impossible_stats'
  | 'suspected_spoofing'
  | 'inappropriate_behavior'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'investigating'
  | 'resolved'
  | 'dismissed';

export type EvidenceType =
  | 'gps_route'
  | 'heart_rate_log'
  | 'accelerometer_summary'
  | 'photo'
  | 'wearable_sync'
  | 'manual_note';

// ─── Data Structures ─────────────────────────────────────

export interface StrengthSet {
  readonly exercise: string;
  readonly sets: number;
  readonly reps: number;
  readonly weight_kg: number;
}

export interface RouteData {
  readonly distance_km: number;
  readonly avg_pace_min_per_km: number;
  readonly elevation_gain_m: number;
}

export interface Profile {
  readonly id: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
  readonly rank: Rank;
  readonly xp: number;
  readonly level: number;
  readonly current_streak: number;
  readonly longest_streak: number;
  readonly last_workout_date: string | null;
}

export interface Workout {
  readonly id: string;
  readonly user_id: string;
  readonly type: WorkoutType;
  readonly status: WorkoutStatus;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly duration_seconds: number;
  readonly raw_score: number | null;
  readonly final_score: number | null;
  readonly confidence_score: number | null;
  readonly validation_status: ValidationStatus | null;
  readonly source: EvidenceSource;
  readonly idempotency_key: string;
  readonly strength_sets: readonly StrengthSet[] | null;
  readonly route_data: RouteData | null;
}

export interface WorkoutEvidence {
  readonly id: string;
  readonly workout_id: string;
  readonly evidence_type: EvidenceType;
  readonly data: Record<string, unknown>;
  readonly trust_level: number;
}

export interface ValidationResult {
  readonly validation_type: string;
  readonly passed: boolean;
  readonly confidence_impact: number;
  readonly reason_code: string;
  readonly details: Record<string, unknown>;
}

export interface WorkoutValidation {
  readonly status: ValidationStatus;
  readonly confidence_score: number;
  readonly checks: readonly ValidationResult[];
}

export interface Clan {
  readonly id: string;
  readonly name: string;
  readonly tag: string;
  readonly description: string;
  readonly leader_id: string;
  readonly member_count: number;
}

export interface ClanWar {
  readonly id: string;
  readonly clan_a_id: string;
  readonly clan_b_id: string;
  readonly week_number: number;
  readonly status: ClanWarStatus;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly winner_clan_id: string | null;
}

export interface Appeal {
  readonly id: string;
  readonly user_id: string;
  readonly workout_id: string;
  readonly reason: string;
  readonly status: AppealStatus;
}

// ─── Scoring Types ───────────────────────────────────────

export interface ScoreModifiers {
  readonly streak_bonus: number;
  readonly participation_bonus: number;
  readonly confidence_multiplier: number;
}

export interface ScoredWorkout {
  readonly raw_score: number;
  readonly modifiers: ScoreModifiers;
  readonly final_score: number;
}

export interface ClanWarScore {
  readonly total_output: number;
  readonly participation_rate: number;
  readonly consistency_score: number;
  readonly diversity_score: number;
  readonly final_score: number;
}

// ─── Validation Types ────────────────────────────────────

export type ReasonCode =
  | 'impossible_speed'
  | 'route_sanity_fail'
  | 'pace_cadence_mismatch'
  | 'pace_hr_mismatch'
  | 'spoof_detected'
  | 'pause_abuse'
  | 'impossible_density'
  | 'tonnage_spike'
  | 'progression_jump'
  | 'impossible_rest'
  | 'suspicious_edit'
  | 'effort_biometric_mismatch'
  | 'clean';
