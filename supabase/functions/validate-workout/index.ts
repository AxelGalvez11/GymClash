// Supabase Edge Function: validate-workout (V2)
// Server-authoritative validation pipeline.
// Handles: strength, scout, and active_recovery workouts.
// V2 additions: Wilks normalization, Brzycki 1RM, diminishing volume,
// 1RM plausibility check, trophy updates, weekly clan contribution cap,
// daily goal completion.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Constants ───────────────────────────────────────────

const PARTICIPATION_BONUS = 50;
const MAX_STREAK_BONUS = 0.15;
const STREAK_MAX_DAYS = 30;
const MAX_HUMAN_SPEED_KMH = 25;
const MAX_SESSION_TONNAGE = 50000;
const MAX_SETS_PER_HOUR = 40;
const DAILY_CAP = 500;
const WEEKLY_CAP = 20000;
const DIMINISHING_FACTOR = 0.25;
const ONE_RM_PLAUSIBILITY_FACTOR = 1.25;
const ACTIVE_RECOVERY_MIN_DURATION = 600;

// Trophy rewards
const TROPHY_ACCEPTED = 12;
const TROPHY_LOW_CONFIDENCE = 8;
const TROPHY_ACTIVE_RECOVERY = 4;

// ─── Types ───────────────────────────────────────────────

interface CheckResult {
  validation_type: string;
  passed: boolean;
  confidence_impact: number;
  reason_code: string;
  details: Record<string, unknown>;
}

// ─── Diminishing Volume ──────────────────────────────────

function getSetMultiplier(setIndex: number): number {
  if (setIndex < 5) return 1.0;
  if (setIndex < 10) return 0.5;
  return 0.1;
}

function calculateStrengthRawWithDiminishing(sets: any[]): number {
  const exerciseCounts: Record<string, number> = {};
  let total = 0;

  for (const entry of sets) {
    const exercise = entry.exercise;
    const count = exerciseCounts[exercise] ?? 0;
    const perSet = entry.reps * entry.weight_kg;

    for (let i = 0; i < entry.sets; i++) {
      total += perSet * getSetMultiplier(count + i);
    }
    exerciseCounts[exercise] = count + entry.sets;
  }

  return Math.round(total * 100) / 100;
}

// ─── Brzycki 1RM ─────────────────────────────────────────

function brzycki1RM(weight: number, reps: number): number | null {
  if (reps < 1 || reps > 10 || weight <= 0) return null;
  if (reps === 1) return weight;
  return Math.round((weight * (36 / (37 - reps))) * 100) / 100;
}

// ─── Wilks Coefficient ───────────────────────────────────

function wilksCoefficient(bw: number | null, sex: string | null): number {
  if (!bw || bw <= 0 || !sex) return 1.0;

  let a: number, b: number, c: number, d: number, e: number, f: number;
  if (sex === 'male') {
    a = -216.0475144; b = 16.2606339; c = -0.002388645;
    d = -0.00113732; e = 7.01863e-6; f = -1.291e-8;
  } else if (sex === 'female') {
    a = 594.31747775582; b = -27.23842536447; c = 0.82112226871;
    d = -0.00930733913; e = 4.731582e-5; f = -9.054e-8;
  } else {
    return 1.0;
  }

  const denom = a + b*bw + c*bw**2 + d*bw**3 + e*bw**4 + f*bw**5;
  if (denom <= 0) return 1.0;

  const coeff = 500 / denom;
  const baseline = sex === 'male' ? 0.736 : 0.882;
  return Math.max(0.5, Math.min(2.0, coeff / baseline));
}

// ─── Validation Checks ──────────────────────────────────

function validateStrength(sets: any[], durationSeconds: number): CheckResult[] {
  const checks: CheckResult[] = [];
  const totalTonnage = sets.reduce((s: number, e: any) => s + e.sets * e.reps * e.weight_kg, 0);
  const totalSets = sets.reduce((s: number, e: any) => s + e.sets, 0);

  checks.push({
    validation_type: 'strength_tonnage_check',
    passed: totalTonnage <= MAX_SESSION_TONNAGE,
    confidence_impact: totalTonnage <= MAX_SESSION_TONNAGE ? 0 : -0.7,
    reason_code: totalTonnage <= MAX_SESSION_TONNAGE ? 'clean' : 'tonnage_spike',
    details: { total_tonnage_kg: totalTonnage },
  });

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

  checks.push({
    validation_type: 'scout_speed_check',
    passed: speedKmh <= MAX_HUMAN_SPEED_KMH,
    confidence_impact: speedKmh <= MAX_HUMAN_SPEED_KMH ? 0 : -0.8,
    reason_code: speedKmh <= MAX_HUMAN_SPEED_KMH ? 'clean' : 'impossible_speed',
    details: { calculated_speed_kmh: Math.round(speedKmh * 100) / 100 },
  });

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

function validateActiveRecovery(durationSeconds: number): CheckResult[] {
  const passed = durationSeconds >= ACTIVE_RECOVERY_MIN_DURATION;
  return [{
    validation_type: 'active_recovery_duration',
    passed,
    confidence_impact: passed ? 0 : -1.0,
    reason_code: passed ? 'clean' : 'active_recovery_too_short',
    details: { duration_seconds: durationSeconds, minimum: ACTIVE_RECOVERY_MIN_DURATION },
  }];
}

// ─── 1RM Plausibility Check ─────────────────────────────

async function check1RMPlausibility(
  supabase: any,
  userId: string,
  sets: any[]
): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  // Fetch user's stored 1RM records
  const { data: records } = await supabase
    .from('user_1rm_records')
    .select('exercise, best_estimated_1rm')
    .eq('user_id', userId);

  const storedMap: Record<string, number> = {};
  for (const r of (records ?? [])) {
    storedMap[r.exercise] = Number(r.best_estimated_1rm);
  }

  // Check each set for suspicious 1RM jumps
  for (const entry of sets) {
    if (entry.reps < 1 || entry.reps > 10) continue;
    const estimated = brzycki1RM(entry.weight_kg, entry.reps);
    if (!estimated) continue;

    const stored = storedMap[entry.exercise];
    if (stored && estimated > stored * ONE_RM_PLAUSIBILITY_FACTOR) {
      checks.push({
        validation_type: 'strength_1rm_plausibility',
        passed: false,
        confidence_impact: -0.3, // warning level
        reason_code: 'one_rm_plausibility',
        details: {
          exercise: entry.exercise,
          estimated_1rm: estimated,
          stored_best: stored,
          ratio: Math.round((estimated / stored) * 100) / 100,
          threshold: ONE_RM_PLAUSIBILITY_FACTOR,
        },
      });
    }
  }

  return checks;
}

// ─── 1RM Upsert ─────────────────────────────────────────

async function upsert1RMRecords(
  supabase: any,
  userId: string,
  workoutId: string,
  sets: any[]
): Promise<void> {
  // Find best estimated 1RM per exercise from this workout
  const bestPerExercise: Record<string, { estimated: number; weight: number; reps: number }> = {};

  for (const entry of sets) {
    // Expand each batch entry into individual set evaluation
    for (let i = 0; i < entry.sets; i++) {
      if (entry.reps < 1 || entry.reps > 10) continue;
      const estimated = brzycki1RM(entry.weight_kg, entry.reps);
      if (!estimated) continue;

      const current = bestPerExercise[entry.exercise];
      if (!current || estimated > current.estimated) {
        bestPerExercise[entry.exercise] = {
          estimated,
          weight: entry.weight_kg,
          reps: entry.reps,
        };
      }
    }
  }

  // Upsert each exercise's best
  for (const [exercise, best] of Object.entries(bestPerExercise)) {
    await supabase.rpc('upsert_1rm_record', {
      p_user_id: userId,
      p_exercise: exercise,
      p_estimated_1rm: best.estimated,
      p_weight_kg: best.weight,
      p_reps: best.reps,
      p_workout_id: workoutId,
    });
  }
}

// ─── Score Calculation ───────────────────────────────────

function calculateScoutRaw(routeData: any): number {
  const basePace = 6.0;
  const mult = Math.max(0.5, Math.min(1.5, basePace / Math.max(routeData.avg_pace_min_per_km, 3.0)));
  return routeData.distance_km * mult * 100;
}

function normalizeScore(raw: number, baseline: number | null, median: number): number {
  const effective = baseline ?? median;
  if (effective <= 0) return raw;
  const relative = Math.max(0.5, Math.min(2.0, raw / effective));
  return Math.round((raw * 0.6 + relative * median * 0.4) * 100) / 100;
}

function calculateFinalScore(normalized: number, streakDays: number, confidence: number): number {
  const streakBonus = (Math.min(streakDays, STREAK_MAX_DAYS) / STREAK_MAX_DAYS) * MAX_STREAK_BONUS;
  const withParticipation = normalized + PARTICIPATION_BONUS;
  const withStreak = withParticipation * (1 + streakBonus);
  return Math.round(withStreak * confidence * 100) / 100;
}

// ─── Daily Goal Evaluation ──────────────────────────────

async function evaluateDailyGoal(
  supabase: any,
  userId: string,
  workoutType: string,
  sets: any[] | null,
  workoutDate: string
): Promise<boolean> {
  // Fetch today's goal
  const { data: goal } = await supabase
    .from('daily_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('goal_date', workoutDate)
    .single();

  if (!goal || goal.completed) return false;

  let completed = false;

  if (goal.goal_type === 'complete_any_workout') {
    // Any validated workout completes this
    completed = true;
  } else if (goal.goal_type === 'strength_intensity' && workoutType === 'strength' && sets) {
    // Check if any set is at or above 80% of the target 1RM weight
    const targetExercise = goal.goal_metadata?.exercise;
    const target1RM = goal.goal_metadata?.target_1rm;
    const thresholdPct = goal.goal_metadata?.threshold_pct ?? 0.80;

    if (targetExercise && target1RM) {
      const targetWeight = target1RM * thresholdPct;
      for (const entry of sets) {
        if (entry.exercise === targetExercise && entry.weight_kg >= targetWeight) {
          completed = true;
          break;
        }
      }
    }
  }

  if (completed) {
    await supabase.rpc('complete_daily_goal', { p_user_id: userId, p_date: workoutDate });
    await supabase.rpc('award_daily_goal_trophy', { p_user_id: userId, p_date: workoutDate });
  }

  return completed;
}

// ─── Clan Contribution with Weekly Cap ───────────────────

async function handleClanContribution(
  supabase: any,
  userId: string,
  workoutId: string,
  finalScore: number
): Promise<number | null> {
  const { data: membership } = await supabase
    .from('clan_memberships')
    .select('clan_id')
    .eq('user_id', userId)
    .single();

  if (!membership) return null;

  const { data: activeWar } = await supabase
    .from('clan_wars')
    .select('id, started_at')
    .eq('status', 'active')
    .or(`clan_a_id.eq.${membership.clan_id},clan_b_id.eq.${membership.clan_id}`)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (!activeWar) return null;

  // Weekly total for this user in this war
  const { data: weekContribs } = await supabase
    .from('clan_war_contributions')
    .select('contribution_points')
    .eq('war_id', activeWar.id)
    .eq('user_id', userId);

  const weeklyTotal = (weekContribs ?? []).reduce(
    (sum: number, c: any) => sum + Number(c.contribution_points), 0
  );

  // Check weekly cap first
  const weeklyRemaining = Math.max(0, WEEKLY_CAP - weeklyTotal);
  if (weeklyRemaining <= 0) return 0;

  // Daily cap with diminishing returns
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { data: todayContribs } = await supabase
    .from('clan_war_contributions')
    .select('contribution_points')
    .eq('war_id', activeWar.id)
    .eq('user_id', userId)
    .gte('created_at', todayStart.toISOString());

  const todayTotal = (todayContribs ?? []).reduce(
    (sum: number, c: any) => sum + Number(c.contribution_points), 0
  );

  const dailyRemaining = Math.max(0, DAILY_CAP - todayTotal);
  let contribution: number;
  if (finalScore <= dailyRemaining) {
    contribution = finalScore;
  } else {
    contribution = dailyRemaining + (finalScore - dailyRemaining) * DIMINISHING_FACTOR;
  }

  // Apply weekly cap
  contribution = Math.min(contribution, weeklyRemaining);
  contribution = Math.round(contribution * 100) / 100;

  if (contribution > 0) {
    await supabase.from('clan_war_contributions').insert({
      war_id: activeWar.id,
      user_id: userId,
      clan_id: membership.clan_id,
      workout_id: workoutId,
      contribution_points: contribution,
    });
  }

  return contribution;
}

// ─── Main Handler ────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401 });
    }

    const callerToken = authHeader.replace('Bearer ', '');
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { data: { user }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

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
    if (workout.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not your workout' }), { status: 403 });
    }
    if (workout.status !== 'submitted') {
      return new Response(JSON.stringify({ error: 'Workout not in submitted status' }), { status: 400 });
    }

    // ─── Active Recovery Path ────────────────────────────
    if (workout.type === 'active_recovery') {
      const checks = validateActiveRecovery(workout.duration_seconds ?? 0);
      const passed = checks.every((c) => c.passed);

      await supabase.from('workout_validations').insert(
        checks.map((c) => ({ workout_id, ...c }))
      );

      const status = passed ? 'validated' : 'rejected';
      const validationStatus = passed ? 'accepted' : 'rejected';

      await supabase.from('workouts').update({
        status,
        raw_score: 0,
        final_score: 0,
        confidence_score: passed ? 1.0 : 0,
        validation_status: validationStatus,
      }).eq('id', workout_id);

      if (passed) {
        // Streak update
        const workoutDate = (workout.completed_at ?? new Date().toISOString()).split('T')[0];
        await supabase.rpc('update_user_streak', { p_user_id: workout.user_id, p_workout_date: workoutDate });

        // Trophy reward
        await supabase.rpc('update_trophy_rating', { p_user_id: workout.user_id, p_delta: TROPHY_ACTIVE_RECOVERY });

        // Trophy decay check
        await supabase.rpc('apply_trophy_decay', { p_user_id: workout.user_id });

        // Daily goal evaluation
        await evaluateDailyGoal(supabase, workout.user_id, 'active_recovery', null, workoutDate);
      }

      return new Response(JSON.stringify({
        workout_id,
        validation_status: validationStatus,
        confidence_score: passed ? 1.0 : 0,
        raw_score: 0,
        final_score: 0,
        clan_contribution: null,
        checks: checks.length,
        type: 'active_recovery',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // ─── Strength / Scout Path ───────────────────────────

    // Run type-specific validation checks
    let checks: CheckResult[];
    if (workout.type === 'strength') {
      checks = validateStrength(workout.sets ?? [], workout.duration_seconds ?? 0);
      // Add 1RM plausibility checks
      const rmChecks = await check1RMPlausibility(supabase, workout.user_id, workout.sets ?? []);
      checks = [...checks, ...rmChecks];
    } else {
      checks = validateScout(workout.route_data ?? {}, workout.duration_seconds ?? 0);
    }

    // Calculate confidence
    const sourceBonus = workout.source === 'wearable' ? 0.1 : workout.source === 'sensor' ? 0.05 : 0;
    const baseConfidence = 0.9 + sourceBonus;
    const totalImpact = checks.reduce((s, c) => s + (c.passed ? 0 : c.confidence_impact), 0);
    const confidence = Math.max(0, Math.min(1, baseConfidence + totalImpact));

    // Determine validation status
    const hasCritical = checks.some((c) => !c.passed && c.confidence_impact <= -0.7);
    let validationStatus: string;
    if (hasCritical || confidence < 0.2) validationStatus = 'rejected';
    else if (confidence < 0.4) validationStatus = 'held_for_review';
    else if (confidence < 0.6) validationStatus = 'excluded_from_clan_score';
    else if (confidence < 0.8) validationStatus = 'accepted_with_low_confidence';
    else validationStatus = 'accepted';

    // Insert validation records
    await supabase.from('workout_validations').insert(
      checks.map((c) => ({ workout_id, ...c }))
    );

    // Calculate raw score
    let rawScore: number;
    if (workout.type === 'strength') {
      rawScore = calculateStrengthRawWithDiminishing(workout.sets ?? []);

      // Apply Wilks coefficient if biodata available
      const { data: profile } = await supabase
        .from('profiles')
        .select('body_weight_kg, biological_sex, current_streak')
        .eq('id', workout.user_id)
        .single();

      const wilks = wilksCoefficient(profile?.body_weight_kg, profile?.biological_sex);
      rawScore = Math.round(rawScore * wilks * 100) / 100;

      // Normalization
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('workouts').select('raw_score')
        .eq('user_id', workout.user_id).eq('type', 'strength').eq('status', 'validated')
        .gte('created_at', thirtyDaysAgo);

      const baseline = recent?.length ? recent.reduce((s: number, w: any) => s + Number(w.raw_score), 0) / recent.length : null;

      const { data: medianResult } = await supabase
        .from('workouts').select('raw_score')
        .eq('type', 'strength').eq('status', 'validated').not('raw_score', 'is', null)
        .order('raw_score', { ascending: true });

      const median = medianResult?.length ? Number(medianResult[Math.floor(medianResult.length / 2)].raw_score) : rawScore;
      const normalized = normalizeScore(rawScore, baseline, median);
      const finalScore = calculateFinalScore(normalized, profile?.current_streak ?? 0, confidence);

      // Update workout
      const workoutStatus = validationStatus === 'rejected' ? 'rejected' : 'validated';
      await supabase.from('workouts').update({
        status: workoutStatus,
        raw_score: rawScore,
        final_score: finalScore,
        confidence_score: Math.round(confidence * 1000) / 1000,
        validation_status: validationStatus,
      }).eq('id', workout_id);

      // Post-validation actions for accepted workouts
      let clanContribution: number | null = null;
      if (validationStatus === 'accepted' || validationStatus === 'accepted_with_low_confidence') {
        await supabase.rpc('increment_user_xp', { p_user_id: workout.user_id, p_xp: Math.round(finalScore) });

        const workoutDate = (workout.completed_at ?? new Date().toISOString()).split('T')[0];
        await supabase.rpc('update_user_streak', { p_user_id: workout.user_id, p_workout_date: workoutDate });

        // Trophy update
        const trophyDelta = validationStatus === 'accepted' ? TROPHY_ACCEPTED : TROPHY_LOW_CONFIDENCE;
        await supabase.rpc('update_trophy_rating', { p_user_id: workout.user_id, p_delta: trophyDelta });
        await supabase.rpc('apply_trophy_decay', { p_user_id: workout.user_id });

        // 1RM tracking (only for accepted strength workouts)
        await upsert1RMRecords(supabase, workout.user_id, workout_id, workout.sets ?? []);

        // Daily goal evaluation
        await evaluateDailyGoal(supabase, workout.user_id, 'strength', workout.sets, workoutDate);

        // Clan contribution (only for fully accepted)
        if (validationStatus === 'accepted') {
          clanContribution = await handleClanContribution(supabase, workout.user_id, workout_id, finalScore);
        }
      }

      return new Response(JSON.stringify({
        workout_id, validation_status: validationStatus,
        confidence_score: Math.round(confidence * 1000) / 1000,
        raw_score: rawScore, final_score: finalScore,
        wilks_applied: wilks !== 1.0, clan_contribution: clanContribution,
        checks: checks.length, type: 'strength',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } else {
      // Scout path
      rawScore = calculateScoutRaw(workout.route_data ?? {});

      const { data: profile } = await supabase
        .from('profiles').select('current_streak').eq('id', workout.user_id).single();

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('workouts').select('raw_score')
        .eq('user_id', workout.user_id).eq('type', 'scout').eq('status', 'validated')
        .gte('created_at', thirtyDaysAgo);

      const baseline = recent?.length ? recent.reduce((s: number, w: any) => s + Number(w.raw_score), 0) / recent.length : null;

      const { data: medianResult } = await supabase
        .from('workouts').select('raw_score')
        .eq('type', 'scout').eq('status', 'validated').not('raw_score', 'is', null)
        .order('raw_score', { ascending: true });

      const median = medianResult?.length ? Number(medianResult[Math.floor(medianResult.length / 2)].raw_score) : rawScore;
      const normalized = normalizeScore(rawScore, baseline, median);
      const finalScore = calculateFinalScore(normalized, profile?.current_streak ?? 0, confidence);

      const workoutStatus = validationStatus === 'rejected' ? 'rejected' : 'validated';
      await supabase.from('workouts').update({
        status: workoutStatus, raw_score: rawScore, final_score: finalScore,
        confidence_score: Math.round(confidence * 1000) / 1000, validation_status: validationStatus,
      }).eq('id', workout_id);

      let clanContribution: number | null = null;
      if (validationStatus === 'accepted' || validationStatus === 'accepted_with_low_confidence') {
        await supabase.rpc('increment_user_xp', { p_user_id: workout.user_id, p_xp: Math.round(finalScore) });

        const workoutDate = (workout.completed_at ?? new Date().toISOString()).split('T')[0];
        await supabase.rpc('update_user_streak', { p_user_id: workout.user_id, p_workout_date: workoutDate });

        const trophyDelta = validationStatus === 'accepted' ? TROPHY_ACCEPTED : TROPHY_LOW_CONFIDENCE;
        await supabase.rpc('update_trophy_rating', { p_user_id: workout.user_id, p_delta: trophyDelta });
        await supabase.rpc('apply_trophy_decay', { p_user_id: workout.user_id });

        await evaluateDailyGoal(supabase, workout.user_id, 'scout', null, workoutDate);

        if (validationStatus === 'accepted') {
          clanContribution = await handleClanContribution(supabase, workout.user_id, workout_id, finalScore);
        }
      }

      return new Response(JSON.stringify({
        workout_id, validation_status: validationStatus,
        confidence_score: Math.round(confidence * 1000) / 1000,
        raw_score: rawScore, final_score: finalScore,
        clan_contribution: clanContribution, checks: checks.length, type: 'scout',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (err) {
    console.error('validate-workout error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
