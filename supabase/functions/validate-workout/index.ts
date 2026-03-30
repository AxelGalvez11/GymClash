// Supabase Edge Function: validate-workout
// Called after a workout is submitted. Runs anti-cheat checks,
// computes confidence score, sets validation status, and calculates final score.
//
// This is the server-authoritative validation pipeline.
// Trigger: Database webhook on workouts.status = 'submitted', or called via RPC.
//
// NOTE: This file uses Deno APIs (Supabase Edge Functions runtime).
// It duplicates some logic from lib/validation/ and lib/scoring/ because
// Edge Functions run in Deno, not Node.js. In production, consider sharing
// types via a common package or code generation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Constants (mirrors constants/theme.ts GameConfig) ───

const PARTICIPATION_BONUS = 50;
const MAX_STREAK_BONUS = 0.15;
const STREAK_MAX_DAYS = 30;
const MAX_HUMAN_SPEED_KMH = 25;
const MAX_SESSION_TONNAGE = 50000;
const MAX_SETS_PER_HOUR = 40;

// ─── Validation checks ──────────────────────────────────

interface CheckResult {
  validation_type: string;
  passed: boolean;
  confidence_impact: number;
  reason_code: string;
  details: Record<string, unknown>;
}

function validateStrength(sets: any[], durationSeconds: number): CheckResult[] {
  const checks: CheckResult[] = [];
  const totalTonnage = sets.reduce((sum: number, s: any) => sum + s.sets * s.reps * s.weight_kg, 0);
  const totalSets = sets.reduce((sum: number, s: any) => sum + s.sets, 0);

  // Tonnage plausibility
  checks.push({
    validation_type: 'strength_tonnage_check',
    passed: totalTonnage <= MAX_SESSION_TONNAGE,
    confidence_impact: totalTonnage <= MAX_SESSION_TONNAGE ? 0 : -0.7,
    reason_code: totalTonnage <= MAX_SESSION_TONNAGE ? 'clean' : 'tonnage_spike',
    details: { total_tonnage_kg: totalTonnage },
  });

  // Density check
  const durationHours = durationSeconds / 3600;
  const setsPerHour = durationHours > 0 ? totalSets / durationHours : 0;
  checks.push({
    validation_type: 'strength_density_check',
    passed: setsPerHour <= MAX_SETS_PER_HOUR,
    confidence_impact: setsPerHour <= MAX_SETS_PER_HOUR ? 0 : -0.6,
    reason_code: setsPerHour <= MAX_SETS_PER_HOUR ? 'clean' : 'impossible_density',
    details: { sets_per_hour: Math.round(setsPerHour * 100) / 100 },
  });

  return checks;
}

function validateScout(routeData: any, durationSeconds: number): CheckResult[] {
  const checks: CheckResult[] = [];
  const durationHours = durationSeconds / 3600;
  const speedKmh = durationHours > 0 ? routeData.distance_km / durationHours : 0;

  // Speed check
  checks.push({
    validation_type: 'scout_speed_check',
    passed: speedKmh <= MAX_HUMAN_SPEED_KMH,
    confidence_impact: speedKmh <= MAX_HUMAN_SPEED_KMH ? 0 : -0.8,
    reason_code: speedKmh <= MAX_HUMAN_SPEED_KMH ? 'clean' : 'impossible_speed',
    details: { calculated_speed_kmh: Math.round(speedKmh * 100) / 100 },
  });

  // Pace sanity
  const pace = routeData.avg_pace_min_per_km;
  const paceOk = pace >= 2.4 && pace <= 20;
  checks.push({
    validation_type: 'scout_pace_sanity',
    passed: paceOk,
    confidence_impact: paceOk ? 0 : -0.5,
    reason_code: paceOk ? 'clean' : 'route_sanity_fail',
    details: { reported_pace: pace },
  });

  return checks;
}

// ─── Score calculation ───────────────────────────────────

function calculateRawScore(type: string, sets: any[] | null, routeData: any | null): number {
  if (type === 'strength' && sets) {
    return sets.reduce((sum: number, s: any) => sum + s.sets * s.reps * s.weight_kg, 0);
  }
  if (type === 'scout' && routeData) {
    const basePace = 6.0;
    const paceMultiplier = Math.max(0.5, Math.min(1.5, basePace / Math.max(routeData.avg_pace_min_per_km, 3.0)));
    return routeData.distance_km * paceMultiplier * 100;
  }
  return 0;
}

function calculateFinalScore(rawScore: number, streakDays: number, confidence: number): number {
  const streakBonus = (Math.min(streakDays, STREAK_MAX_DAYS) / STREAK_MAX_DAYS) * MAX_STREAK_BONUS;
  const withParticipation = rawScore + PARTICIPATION_BONUS;
  const withStreak = withParticipation * (1 + streakBonus);
  return Math.round(withStreak * confidence * 100) / 100;
}

// ─── Main handler ────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const { workout_id } = await req.json();
    if (!workout_id) {
      return new Response(JSON.stringify({ error: 'workout_id required' }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch workout
    const { data: workout, error: wErr } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', workout_id)
      .single();

    if (wErr || !workout) {
      return new Response(JSON.stringify({ error: 'Workout not found' }), { status: 404 });
    }

    if (workout.status !== 'submitted') {
      return new Response(JSON.stringify({ error: 'Workout not in submitted status' }), { status: 400 });
    }

    // Run validation checks
    const checks: CheckResult[] = workout.type === 'strength'
      ? validateStrength(workout.sets ?? [], workout.duration_seconds ?? 0)
      : validateScout(workout.route_data ?? {}, workout.duration_seconds ?? 0);

    // Calculate confidence
    const sourceBonus = workout.source === 'wearable' ? 0.1 : workout.source === 'sensor' ? 0.05 : 0;
    const baseConfidence = 0.9 + sourceBonus;
    const totalImpact = checks.reduce((sum, c) => sum + (c.passed ? 0 : c.confidence_impact), 0);
    const confidence = Math.max(0, Math.min(1, baseConfidence + totalImpact));

    // Determine status
    const hasCritical = checks.some((c) => !c.passed && c.confidence_impact <= -0.7);
    let validationStatus: string;
    if (hasCritical || confidence < 0.2) validationStatus = 'rejected';
    else if (confidence < 0.4) validationStatus = 'held_for_review';
    else if (confidence < 0.6) validationStatus = 'excluded_from_clan_score';
    else if (confidence < 0.8) validationStatus = 'accepted_with_low_confidence';
    else validationStatus = 'accepted';

    // Insert validation records
    const validationRows = checks.map((c) => ({
      workout_id,
      validation_type: c.validation_type,
      passed: c.passed,
      confidence_impact: c.confidence_impact,
      reason_code: c.reason_code,
      details: c.details,
    }));

    await supabase.from('workout_validations').insert(validationRows);

    // Calculate scores
    const rawScore = calculateRawScore(workout.type, workout.sets, workout.route_data);

    // Fetch user profile for streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', workout.user_id)
      .single();

    const finalScore = calculateFinalScore(rawScore, profile?.current_streak ?? 0, confidence);

    // Update workout with results
    const workoutStatus = validationStatus === 'rejected' ? 'rejected' : 'validated';
    await supabase
      .from('workouts')
      .update({
        status: workoutStatus,
        raw_score: rawScore,
        final_score: finalScore,
        confidence_score: Math.round(confidence * 1000) / 1000,
        validation_status: validationStatus,
      })
      .eq('id', workout_id);

    // Update user XP and streak if accepted
    if (validationStatus === 'accepted' || validationStatus === 'accepted_with_low_confidence') {
      const xpGain = Math.round(finalScore);
      await supabase.rpc('increment_user_xp', { p_user_id: workout.user_id, p_xp: xpGain });

      // Update streak using the workout's completion date
      const workoutDate = workout.completed_at
        ? new Date(workout.completed_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      await supabase.rpc('update_user_streak', {
        p_user_id: workout.user_id,
        p_workout_date: workoutDate,
      });
    }

    return new Response(JSON.stringify({
      workout_id,
      validation_status: validationStatus,
      confidence_score: Math.round(confidence * 1000) / 1000,
      raw_score: rawScore,
      final_score: finalScore,
      checks: checks.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('validate-workout error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
