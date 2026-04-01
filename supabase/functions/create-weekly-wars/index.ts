// Supabase Edge Function: create-weekly-wars
// Called weekly (via cron or manual trigger) to pair clans for the upcoming war week.
//
// Algorithm:
// 1. Find the active season
// 2. Find all eligible clans (3+ members)
// 3. Sort by member_count for balanced matchups
// 4. Pair adjacent clans; odd clan out gets a bye
// 5. Insert clan_wars rows with status 'active'

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MIN_CLAN_SIZE = 3;

const CRON_SECRET = Deno.env.get('CRON_SECRET');

Deno.serve(async (req) => {
  try {
    // Verify caller: must be service_role (Supabase cron) or CRON_SECRET header
    const authHeader = req.headers.get('Authorization') ?? '';
    const cronHeader = req.headers.get('X-Cron-Secret') ?? '';
    const isServiceRole = authHeader.includes(supabaseServiceKey);
    const hasCronSecret = CRON_SECRET && cronHeader === CRON_SECRET;

    if (!isServiceRole && !hasCronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find active season
    const { data: season, error: seasonErr } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single();

    if (seasonErr || !season) {
      return new Response(JSON.stringify({ error: 'No active season found' }), { status: 400 });
    }

    // Calculate week number within season
    const seasonStart = new Date(season.started_at);
    const now = new Date();
    const weekNumber = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

    // Check if wars already exist for this week
    const { data: existingWars } = await supabase
      .from('clan_wars')
      .select('id')
      .eq('season_id', season.id)
      .eq('week_number', weekNumber)
      .limit(1);

    if (existingWars && existingWars.length > 0) {
      return new Response(JSON.stringify({
        message: 'Wars already created for this week',
        week_number: weekNumber,
      }), { status: 200 });
    }

    // Find eligible clans (minimum member count)
    const { data: clans, error: clansErr } = await supabase
      .from('clans')
      .select('id, member_count')
      .gte('member_count', MIN_CLAN_SIZE)
      .order('member_count', { ascending: false });

    if (clansErr || !clans || clans.length < 2) {
      return new Response(JSON.stringify({
        message: 'Not enough eligible clans for matchmaking',
        eligible: clans?.length ?? 0,
        minimum_required: 2,
      }), { status: 200 });
    }

    // Pair clans by similar size (sorted, pair adjacent)
    const pairs: { clan_a: string; clan_b: string }[] = [];
    const shuffled = [...clans];

    // Light shuffle within size tiers to add variety
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Only swap with a neighbor (±2 positions) for balanced but varied matchups
      const j = Math.max(0, i - Math.floor(Math.random() * 3));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    for (let i = 0; i + 1 < shuffled.length; i += 2) {
      pairs.push({
        clan_a: shuffled[i].id,
        clan_b: shuffled[i + 1].id,
      });
    }

    // War starts now, ends in 7 days
    const warStart = new Date();
    warStart.setUTCHours(0, 0, 0, 0); // Start of today UTC
    const warEnd = new Date(warStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Insert wars
    const warRows = pairs.map((p) => ({
      season_id: season.id,
      clan_a_id: p.clan_a,
      clan_b_id: p.clan_b,
      week_number: weekNumber,
      status: 'active',
      started_at: warStart.toISOString(),
      ended_at: warEnd.toISOString(),
    }));

    const { data: wars, error: insertErr } = await supabase
      .from('clan_wars')
      .insert(warRows)
      .select('id');

    if (insertErr) {
      return new Response(JSON.stringify({ error: 'Failed to create wars', details: insertErr.message }), { status: 500 });
    }

    return new Response(JSON.stringify({
      season: season.name,
      week_number: weekNumber,
      wars_created: wars?.length ?? 0,
      bye_clan: shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1].id : null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('create-weekly-wars error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
