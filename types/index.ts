// ─── Enums ───────────────────────────────────────────────

export type WorkoutType = 'strength' | 'scout' | 'active_recovery' | 'hiit';

export type ValidationStatus =
  | 'accepted'
  | 'accepted_with_low_confidence'
  | 'held_for_review'
  | 'excluded_from_clan_score'
  | 'rejected';

export type WorkoutStatus = 'draft' | 'submitted' | 'validated' | 'rejected';

export type EvidenceSource = 'manual' | 'sensor' | 'wearable';

export type Rank =
  | 'rookie'
  | 'iron'
  | 'bronze_plate'
  | 'silver_plate'
  | 'gold_plate'
  | 'elite'
  | 'champion'
  | 'olympian';

export type ArenaTier =
  | 'sweat_zone'
  | 'pump_room'
  | 'grindhouse'
  | 'rack_arena'
  | 'the_iron_yard'
  | 'barbell_pit'
  | 'plate_factory'
  | 'pr_chamber'
  | 'strength_circuit'
  | 'deadlift_den'
  | 'titan_training_grounds'
  | 'forge_of_strength'
  | 'arena_of_reps'
  | 'champions_floor'
  | 'iron_pantheon'
  | 'valhalla_barbell'
  | 'hall_of_ascension'
  | 'mount_olympus'
  | 'the_colosseum';

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

export type DailyGoalType = 'complete_any_workout' | 'strength_intensity';

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
  readonly trophy_rating: number;
  readonly arena_tier: ArenaTier;
  readonly body_weight_kg: number | null;
  readonly height_cm: number | null;
  readonly birth_date: string | null;
  readonly biological_sex: string | null;
  readonly lifting_experience: 'beginner' | 'intermediate' | 'advanced' | null;
  readonly running_experience: 'beginner' | 'intermediate' | 'advanced' | null;
  readonly resting_hr: number | null;
  readonly estimated_vo2max: number | null;
  readonly max_heart_rate: number | null;
  readonly last_trophy_decay_date: string | null;
  readonly strength_workout_count: number;
  readonly scout_workout_count: number;
  readonly country_code: string | null;
  readonly region_code: string | null;
  readonly gym_coins: number;
}

export type CharacterBuild = 'balanced' | 'strength' | 'cardio';
export type CharacterState = 'active' | 'resting' | 'sleeping';
export type CharacterTier = 'basic' | 'equipped' | 'geared' | 'elite' | 'legendary' | 'mythic';
export type WarRole = 'strength_specialist' | 'cardio_specialist' | 'flex';

export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cosmetic_type: string;
  readonly rarity: CosmeticRarity;
  readonly price_coins: number | null;
  readonly preview_url: string | null;
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
  /** DB column is `sets` (jsonb). Matches the actual Supabase column name. */
  readonly sets: readonly StrengthSet[] | null;
  readonly route_data: RouteData | null;
  readonly scoring_version: number | null;
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

export interface User1RMRecord {
  readonly id: string;
  readonly user_id: string;
  readonly exercise: string;
  readonly best_estimated_1rm: number;
  readonly best_weight_kg: number;
  readonly best_reps: number;
  readonly achieved_at: string;
  readonly workout_id: string | null;
}

export interface DailyGoal {
  readonly id: string;
  readonly user_id: string;
  readonly goal_date: string;
  readonly goal_type: DailyGoalType;
  readonly goal_metadata: {
    readonly exercise?: string;
    readonly target_1rm?: number;
    readonly threshold_pct?: number;
  };
  readonly completed: boolean;
  readonly completed_at: string | null;
  readonly trophy_awarded: boolean;
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
  | 'one_rm_plausibility'
  | 'active_recovery_too_short'
  | 'clean';

// ─── GPS / Location Types ───────────────────────────────

export interface GpsRoutePoint {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude: number | null;
  readonly timestamp: string;
  readonly accuracy: number;
  readonly speed: number | null;
}

export interface GpsRoute {
  readonly points: readonly GpsRoutePoint[];
  readonly total_distance_km: number;
  readonly total_elevation_gain_m: number;
  readonly avg_pace_min_per_km: number;
  readonly started_at: string;
  readonly ended_at: string;
}

export type GpsTrackingStatus = 'idle' | 'requesting_permission' | 'tracking' | 'paused' | 'stopped' | 'error';

export interface GymLocationResult {
  readonly is_near_gym: boolean;
  readonly nearest_gym_name: string | null;
  readonly distance_meters: number | null;
  readonly confidence: number;
}

// ─── Player Type System ─────────────────────────────────

export type CardioSpecialization = 'sprinter' | 'trail_runner' | 'marathoner';
export type StrengthSpecialization = 'bench_baron' | 'squat_king' | 'deadlift_demon' | 'all_rounder';
export type PlayerCategory = 'cardio_specialist' | 'strength_specialist' | 'balanced';

export interface PlayerType {
  readonly category: PlayerCategory;
  readonly specialization: CardioSpecialization | StrengthSpecialization | 'hybrid';
  readonly display_name: string;
  readonly confidence: number;
  readonly dominant_exercises: readonly string[];
  readonly strength_pct: number;
  readonly scout_pct: number;
}

export interface PlayerTypeDetectionInput {
  readonly workouts: readonly {
    readonly type: WorkoutType;
    readonly sets: readonly StrengthSet[] | null;
    readonly route_data: RouteData | null;
    readonly completed_at: string;
  }[];
}

export interface SpecializationBonus {
  readonly applies: boolean;
  readonly multiplier: number;
  readonly reason: string;
}

// ─── Game Feel Types ────────────────────────────────────

export type StreakTier = 'ember' | 'torch' | 'bonfire' | 'inferno' | 'supernova' | 'eternal';

export interface StreakTierConfig {
  readonly tier: StreakTier;
  readonly minDays: number;
  readonly label: string;
  readonly color: string;
  readonly emoji: string;
  readonly pulseSpeed: number;
  readonly glowRadius: number;
}

export type LeaderboardZone = 'promote' | 'safe' | 'demote';

export type WarChatReaction = 'flex' | 'fire' | 'trophy' | 'lets_go' | 'rest_day';

export interface ConfettiConfig {
  readonly particleCount: number;
  readonly colors: readonly string[];
  readonly duration: number;
  readonly spread: number;
}

// ─── Video Analysis ─────────────────────────────────────

export type VideoExerciseType =
  | 'squat'
  | 'push_up'
  | 'lunge'
  | 'jumping_jack'
  | 'bicep_curl'
  | 'shoulder_press'
  | 'deadlift'
  | 'bench_press'
  | 'pull_up'
  | 'row'
  | 'burpee';

export type VideoVerificationStatus = 'verified' | 'needs_review' | 'rejected';

export type VideoRepQuality = 'good' | 'acceptable' | 'poor' | 'invalid';

export interface VideoRepMetrics {
  readonly primary_angle_min?: number;
  readonly primary_angle_max?: number;
  readonly range_of_motion?: number;
  readonly depth_score?: number;
  readonly lockout_score?: number;
  readonly symmetry_left_right?: number;
  readonly torso_lean?: number;
  readonly tempo_seconds?: number;
}

export interface VideoRepResult {
  readonly rep_index: number;
  readonly start_time_ms: number;
  readonly end_time_ms: number;
  readonly duration_ms: number;
  readonly quality: VideoRepQuality;
  readonly confidence: number;
  readonly range_of_motion_score: number;
  readonly tempo_score: number;
  readonly symmetry_score: number;
  readonly form_flags: readonly string[];
  readonly metrics: VideoRepMetrics;
}

export interface VideoAggregateMetrics {
  readonly avg_range_of_motion?: number;
  readonly avg_tempo_seconds?: number;
  readonly avg_symmetry?: number;
  readonly avg_depth?: number;
  readonly tempo_consistency?: number;
  readonly best_rep_index?: number;
  readonly worst_rep_index?: number;
}

export interface VideoSummary {
  readonly duration_ms: number;
  readonly total_frames: number;
  readonly sampled_frames: number;
  readonly fps: number;
  readonly resolution_width: number;
  readonly resolution_height: number;
}

export interface VideoAnalysisResult {
  readonly exercise_type: VideoExerciseType;
  readonly video_summary: VideoSummary;
  readonly rep_count: number;
  readonly valid_rep_count: number;
  readonly form_score: number;
  readonly analysis_confidence: number;
  readonly verification_status: VideoVerificationStatus;
  readonly camera_angle: string;
  readonly cheat_flags: readonly string[];
  readonly warnings: readonly string[];
  readonly aggregate_metrics: VideoAggregateMetrics;
  readonly reps: readonly VideoRepResult[];
}

export interface WorkoutVideoAnalysis {
  readonly id: string;
  readonly workout_id: string;
  readonly user_id: string;
  readonly exercise_type: VideoExerciseType;
  readonly rep_count: number;
  readonly valid_rep_count: number;
  readonly form_score: number;
  readonly analysis_confidence: number;
  readonly verification_status: VideoVerificationStatus;
  readonly camera_angle: string;
  readonly cheat_flags: readonly string[];
  readonly warnings: readonly string[];
  readonly aggregate_metrics: VideoAggregateMetrics;
  readonly reps: readonly VideoRepResult[];
  readonly created_at: string;
}
