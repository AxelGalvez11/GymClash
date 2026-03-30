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
 * Direct UPDATE on profiles table is blocked by RLS (no UPDATE policy).
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
 * Create and submit a workout.
 *
 * Flow:
 * 1. Insert as 'draft' (client-permitted by RLS)
 * 2. Call submit_workout RPC to transition to 'submitted' (server-authoritative)
 * 3. A database webhook then triggers the validate-workout edge function
 *
 * The client never directly sets status='submitted' — this is enforced by RLS.
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

  return submitted ?? draft;
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
