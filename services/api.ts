import { supabase } from './supabase';
import type { StrengthSet, RouteData, WorkoutType, EvidenceSource } from '@/types';

// ─── Profile ─────────────────────────────────────────────

export async function fetchMyProfile() {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return data;
}

/**
 * Update profile display fields via server RPC.
 * Only display_name and avatar_url are client-writable.
 */
export async function updateProfile(updates: {
  display_name?: string;
  avatar_url?: string | null;
}) {
  const { data, error } = await supabase.rpc('update_my_display', {
    p_display_name: updates.display_name ?? null,
    p_avatar_url: updates.avatar_url ?? null,
  });
  if (error) throw error;
  return data;
}

/**
 * Update biodata fields via direct table update.
 * Restricted to biodata-only fields. Server-readable for scoring.
 */
export async function updateBiodata(updates: {
  body_weight_kg?: number | null;
  height_cm?: number | null;
  birth_date?: string | null;
  biological_sex?: string | null;
  lifting_experience?: string | null;
  running_experience?: string | null;
  resting_hr?: number | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      body_weight_kg: updates.body_weight_kg ?? null,
      height_cm: updates.height_cm ?? null,
      birth_date: updates.birth_date ?? null,
      biological_sex: updates.biological_sex ?? null,
      lifting_experience: updates.lifting_experience ?? null,
      running_experience: updates.running_experience ?? null,
      resting_hr: updates.resting_hr ?? null,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Daily Goals ─────────────────────────────────────────

export async function fetchOrCreateDailyGoal() {
  const { data, error } = await supabase.rpc('get_or_create_daily_goal');
  if (error) throw error;
  return data;
}

// ─── 1RM Records ─────────────────────────────────────────

export async function fetchMy1RMRecords() {
  const { data, error } = await supabase.rpc('get_my_1rm_records');
  if (error) throw error;
  return data ?? [];
}

// ─── Workouts ────────────────────────────────────────────

export interface CreateWorkoutInput {
  readonly type: WorkoutType;
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_seconds: number;
  readonly sets: readonly StrengthSet[] | null;
  readonly route_data: RouteData | null;
  readonly source: EvidenceSource;
  readonly idempotency_key: string;
}

/**
 * Create, submit, and trigger validation for a workout.
 *
 * Flow:
 * 1. Insert as 'draft' (client-permitted by RLS)
 * 2. Call submit_workout RPC to transition to 'submitted' (server-authoritative)
 * 3. Invoke validate-workout edge function (server-authoritative scoring + anti-cheat)
 * 4. Return the validated workout
 *
 * The client never directly sets status='submitted' — this is enforced by RLS.
 * Validation runs server-side; the client only triggers it.
 */
export async function createWorkout(input: CreateWorkoutInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Step 1: Insert as draft
  const { data: draft, error: insertErr } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      type: input.type,
      status: 'draft',
      started_at: input.started_at,
      completed_at: input.completed_at,
      duration_seconds: input.duration_seconds,
      sets: input.sets,
      route_data: input.route_data,
      source: input.source,
      idempotency_key: input.idempotency_key,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  // Step 2: Submit via RPC (transitions draft → submitted, server-authoritative)
  const { data: submitted, error: submitErr } = await supabase.rpc(
    'submit_workout',
    { p_workout_id: draft.id }
  );
  if (submitErr) throw submitErr;

  // Step 3: Trigger server-side validation (async — don't block on failure)
  triggerValidation(draft.id).catch((err) =>
    console.warn('Validation trigger failed (will retry):', err)
  );

  return submitted ?? draft;
}

/**
 * Invoke the validate-workout edge function.
 * This is the server-authoritative validation pipeline.
 * The edge function uses the service_role internally — we call it
 * with the user's anon token; the function authenticates via its own env.
 */
async function triggerValidation(workoutId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/validate-workout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ workout_id: workoutId }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Validation failed (${response.status}): ${body}`);
  }
}

export async function fetchMyWorkouts(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchWorkoutWithValidation(workoutId: string) {
  const { data: workout, error: wErr } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();
  if (wErr) throw wErr;

  const { data: validations, error: vErr } = await supabase
    .from('workout_validations')
    .select('*')
    .eq('workout_id', workoutId);
  if (vErr) throw vErr;

  return { workout, validations: validations ?? [] };
}

// ─── Clan ────────────────────────────────────────────────

export async function fetchMyClan() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: membership } = await supabase
    .from('clan_memberships')
    .select('clan_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  const { data: clan, error } = await supabase
    .from('clans')
    .select('*')
    .eq('id', membership.clan_id)
    .single();
  if (error) throw error;

  return { ...clan, my_role: membership.role };
}

export async function fetchActiveWar() {
  const { data, error } = await supabase.rpc('get_my_active_war');
  if (error) throw error;
  return data;
}

export async function fetchWarHistory(clanId: string, limit = 10) {
  const { data, error } = await supabase
    .from('clan_wars')
    .select('*')
    .or(`clan_a_id.eq.${clanId},clan_b_id.eq.${clanId}`)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchTopClans(limit = 20) {
  const { data, error } = await supabase
    .from('clans')
    .select('*')
    .order('member_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createClan(name: string, tag: string, description: string) {
  const { data, error } = await supabase.rpc('create_clan', {
    p_name: name,
    p_tag: tag,
    p_description: description,
  });
  if (error) throw error;
  return data;
}

export async function joinClan(clanId: string) {
  const { data, error } = await supabase.rpc('join_clan', {
    p_clan_id: clanId,
  });
  if (error) throw error;
  return data;
}

export async function leaveClan() {
  const { error } = await supabase.rpc('leave_clan');
  if (error) throw error;
}

export async function searchClans(query = '', limit = 20) {
  const { data, error } = await supabase.rpc('search_clans', {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchClanRoster(clanId: string) {
  const { data, error } = await supabase.rpc('get_clan_roster', {
    p_clan_id: clanId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWarContributions(warId: string, clanId: string) {
  const { data, error } = await supabase.rpc('get_war_contributions', {
    p_war_id: warId,
    p_clan_id: clanId,
  });
  if (error) throw error;
  return data ?? [];
}

// ─── Challenges ─────────────────────────────────────

export async function sendWarChallenge(targetClanId: string, warType: 'strength_only' | 'cardio_only' | 'mixed' = 'mixed') {
  const { data, error } = await supabase.rpc('send_war_challenge', {
    p_target_clan_id: targetClanId,
    p_war_type: warType,
  });
  if (error) throw error;
  return data;
}

export async function respondToChallenge(challengeId: string, accept: boolean) {
  const { data, error } = await supabase.rpc('respond_to_challenge', {
    p_challenge_id: challengeId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}

export async function fetchMyClanChallenges() {
  const { data, error } = await supabase.rpc('get_my_clan_challenges');
  if (error) throw error;
  return data ?? [];
}

// ─── Leaderboards ───────────────────────────────────

export async function fetchClanLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from('leaderboard_clans' as any)
    .select('*')
    .limit(limit);
  if (error) {
    // Fallback if view doesn't exist yet (pre-migration 011)
    const { data: fallback, error: fbErr } = await supabase
      .from('clans')
      .select('id, name, tag, member_count')
      .order('member_count', { ascending: false })
      .limit(limit);
    if (fbErr) throw fbErr;
    return (fallback ?? []).map((c: any) => ({ ...c, war_wins: 0, wars_played: 0, total_trophies: 0 }));
  }
  return data ?? [];
}

export async function fetchPersonalLeaderboard(limit = 100) {
  const { data, error } = await supabase
    .from('leaderboard_players' as any)
    .select('*')
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPublicProfile(userId: string) {
  const { data, error } = await supabase.rpc('get_public_profile', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

// ─── Appeals ─────────────────────────────────────────────

export async function createAppeal(workoutId: string, reason: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('appeals')
    .insert({
      user_id: user.id,
      workout_id: workoutId,
      reason,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Reports ─────────────────────────────────────────────

export async function createReport(input: {
  reported_user_id: string;
  reported_workout_id?: string;
  category: 'impossible_stats' | 'suspected_spoofing' | 'inappropriate_behavior' | 'other';
  description: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: input.reported_user_id,
      reported_workout_id: input.reported_workout_id ?? null,
      category: input.category,
      description: input.description,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMyReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
