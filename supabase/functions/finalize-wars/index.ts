// Supabase Edge Function: finalize-wars
// Called at the end of each war week to compute final scores and determine winners.
//
// For each active war where ended_at has passed:
// 1. Aggregate contributions per clan
// 2. Calculate 4-component war score
// 3. Determine winner
// 4. Update clan_wars with scores and status='completed'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// War score weights (must match constants/theme.ts GameConfig)
const WAR_WEIGHT_OUTPUT = 0.3;
const WAR_WEIGHT_PARTICIPATION = 0.3;
const WAR_WEIGHT_CONSISTENCY = 0.2;
const WAR_WEIGHT_DIVERSITY = 0.2;

// Trophy rewards (must match constants/theme.ts TrophyRewards)
const TROPHY_CLAN_WAR_WIN = 30;
const TROPHY_CLAN_WAR_LOSS = -15;

interface ClanWarMetrics {
  totalOutput: number;
  activeMemberCount: number;
  totalMemberCount: number;
  avgDaysActive: number;
  hasStrength: boolean;
  hasScout: boolean;
}

function calculateWarScore(metrics: ClanWarMetrics, maxOutput: number) {
  const normalizedOutput = maxOutput > 0 ? metrics.totalOutput / maxOutput : 0;
  const participation = metrics.totalMemberCount > 0
    ? metrics.activeMemberCount / metrics.totalMemberCount : 0;
  const consistency = Math.min(1, metrics.avgDaysActive / 7);
  const diversity = (metrics.hasStrength ? 0.5 : 0) + (metrics.hasScout ? 0.5 : 0);

  const finalScore =
    normalizedOutput * WAR_WEIGHT_OUTPUT +
    participation * WAR_WEIGHT_PARTICIPATION +
    consistency * WAR_WEIGHT_CONSISTENCY +
    diversity * WAR_WEIGHT_DIVERSITY;

  return {
    total: Math.round(finalScore * 10000) / 10000,
    total_output: Math.round(metrics.totalOutput * 100) / 100,
    participation_rate: Math.round(participation * 10000) / 10000,
    consistency_score: Math.round(consistency * 10000) / 10000,
    diversity_score: Math.round(diversity * 10000) / 10000,
    contributor_count: metrics.activeMemberCount,
  };
}

async function getWarMetrics(
  supabase: any,
  warId: string,
  clanId: string
): Promise<ClanWarMetrics> {
  // Get total contribution points
  const { data: contributions } = await supabase
    .from('clan_war_contributions')
    .select('user_id, contribution_points, workout_id')
    .eq('war_id', warId)
    .eq('clan_id', clanId);

  const contribs = contributions ?? [];
  const totalOutput = contribs.reduce((sum: number, c: any) => sum + Number(c.contribution_points), 0);

  // Unique contributors
  const uniqueUsers = new Set(contribs.map((c: any) => c.user_id));
  const activeMemberCount = uniqueUsers.size;

  // Total clan members
  const { count: totalMemberCount } = await supabase
    .from('clan_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('clan_id', clanId);

  // Days active per member (average)
  // Get the workout dates for each contributor
  const workoutIds = contribs.map((c: any) => c.workout_id);
  let avgDaysActive = 0;
  if (workoutIds.length > 0) {
    const { data: workouts } = await supabase
      .from('workouts')
      .select('user_id, completed_at')
      .in('id', workoutIds);

    // Count distinct days per user, then average
    const userDays: Record<string, Set<string>> = {};
    for (const w of (workouts ?? [])) {
      const uid = w.user_id;
      const day = w.completed_at ? new Date(w.completed_at).toISOString().split('T')[0] : '';
      if (day) {
        if (!userDays[uid]) userDays[uid] = new Set();
        userDays[uid].add(day);
      }
    }
    const totalDays = Object.values(userDays).reduce((sum, days) => sum + days.size, 0);
    const memberCount = totalMemberCount ?? 1;
    avgDaysActive = memberCount > 0 ? totalDays / memberCount : 0;
  }

  // Check workout type diversity
  let hasStrength = false;
  let hasScout = false;
  if (workoutIds.length > 0) {
    const { data: types } = await supabase
      .from('workouts')
      .select('type')
      .in('id', workoutIds);
    for (const w of (types ?? [])) {
      if (w.type === 'strength') hasStrength = true;
      if (w.type === 'scout') hasScout = true;
    }
  }

  return {
    totalOutput,
    activeMemberCount,
    totalMemberCount: totalMemberCount ?? 0,
    avgDaysActive,
    hasStrength,
    hasScout,
  };
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active wars that have ended
    const now = new Date().toISOString();
    const { data: wars, error: warsErr } = await supabase
      .from('clan_wars')
      .select('*')
      .eq('status', 'active')
      .lte('ended_at', now);

    if (warsErr) {
      return new Response(JSON.stringify({ error: warsErr.message }), { status: 500 });
    }

    if (!wars || wars.length === 0) {
      return new Response(JSON.stringify({ message: 'No wars to finalize' }), { status: 200 });
    }

    const results: any[] = [];

    for (const war of wars) {
      const metricsA = await getWarMetrics(supabase, war.id, war.clan_a_id);
      const metricsB = await getWarMetrics(supabase, war.id, war.clan_b_id);

      // Normalize output against the higher of the two
      const maxOutput = Math.max(metricsA.totalOutput, metricsB.totalOutput);

      const scoreA = calculateWarScore(metricsA, maxOutput);
      const scoreB = calculateWarScore(metricsB, maxOutput);

      // Determine winner (null = draw)
      let winnerId: string | null = null;
      if (scoreA.total > scoreB.total) winnerId = war.clan_a_id;
      else if (scoreB.total > scoreA.total) winnerId = war.clan_b_id;

      // Update the war
      await supabase
        .from('clan_wars')
        .update({
          status: 'completed',
          winner_clan_id: winnerId,
          clan_a_score: scoreA,
          clan_b_score: scoreB,
        })
        .eq('id', war.id);

      // Award trophies to all members of both clans
      const winnerClanId = winnerId;
      const loserClanId = winnerId === war.clan_a_id ? war.clan_b_id
        : winnerId === war.clan_b_id ? war.clan_a_id
        : null; // null = draw

      if (winnerClanId) {
        // Winner members get +30 trophies
        const { data: winnerMembers } = await supabase
          .from('clan_memberships')
          .select('user_id')
          .eq('clan_id', winnerClanId);
        for (const m of (winnerMembers ?? [])) {
          await supabase.rpc('update_trophy_rating', {
            p_user_id: m.user_id,
            p_delta: TROPHY_CLAN_WAR_WIN,
          });
        }

        // Loser members get -15 trophies
        if (loserClanId) {
          const { data: loserMembers } = await supabase
            .from('clan_memberships')
            .select('user_id')
            .eq('clan_id', loserClanId);
          for (const m of (loserMembers ?? [])) {
            await supabase.rpc('update_trophy_rating', {
              p_user_id: m.user_id,
              p_delta: TROPHY_CLAN_WAR_LOSS,
            });
          }
        }
      }
      // Draw: no trophy changes for either clan

      results.push({
        war_id: war.id,
        clan_a_score: scoreA.total,
        clan_b_score: scoreB.total,
        winner: winnerId,
      });
    }

    return new Response(JSON.stringify({
      finalized: results.length,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('finalize-wars error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
