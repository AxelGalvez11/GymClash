-- GymClash V2 Hardening
-- Fixes: biodata privacy, RPC execution boundaries, scoring version column

-- ═══════════════════════════════════════════════════════════
-- FIX 1: Biodata privacy
-- ═══════════════════════════════════════════════════════════
-- Problem: profiles_select is USING (true), exposing biodata to all users.
-- RLS cannot restrict by column. We must restrict row access instead.
--
-- Strategy:
-- 1. Replace the open SELECT policy with own-row-only
-- 2. Create a public_profiles view that excludes biodata
-- 3. Create an RPC for fetching another user's public profile
-- 4. Existing get_my_profile RPC (SECURITY DEFINER) still returns all columns
--    to the profile owner since it bypasses RLS.

-- Drop the open SELECT policy
DROP POLICY IF EXISTS profiles_select ON profiles;

-- Own-row-only SELECT on the base table
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Public-safe view (no biodata, no subscription_tier)
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  display_name,
  avatar_url,
  rank,
  xp,
  level,
  current_streak,
  longest_streak,
  last_workout_date,
  trophy_rating,
  arena_tier,
  created_at
FROM profiles;

-- Grant read access on the view to authenticated and anon roles
GRANT SELECT ON public_profiles TO authenticated, anon;

-- RPC to fetch any user's public profile (for clan rosters, leaderboards)
CREATE OR REPLACE FUNCTION get_public_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  rank rank_type,
  xp integer,
  level integer,
  current_streak integer,
  longest_streak integer,
  trophy_rating integer,
  arena_tier arena_tier
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.display_name,
    pp.avatar_url,
    pp.rank,
    pp.xp,
    pp.level,
    pp.current_streak,
    pp.longest_streak,
    pp.trophy_rating,
    pp.arena_tier
  FROM public_profiles pp
  WHERE pp.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_clan_roster to use the view instead of joining profiles directly.
-- This ensures even if someone modifies the function, biodata can't leak.
-- Must DROP first because the return type changed (added trophy_rating, arena_tier).
DROP FUNCTION IF EXISTS get_clan_roster(uuid);
CREATE FUNCTION get_clan_roster(p_clan_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  rank rank_type,
  level integer,
  trophy_rating integer,
  arena_tier arena_tier,
  role clan_role,
  joined_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.user_id,
    pp.display_name,
    pp.avatar_url,
    pp.rank,
    pp.level,
    pp.trophy_rating,
    pp.arena_tier,
    cm.role,
    cm.joined_at
  FROM clan_memberships cm
  JOIN public_profiles pp ON pp.id = cm.user_id
  WHERE cm.clan_id = p_clan_id
  ORDER BY
    CASE cm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 WHEN 'member' THEN 2 END,
    cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════
-- FIX 2: Server-only RPC execution boundaries
-- ═══════════════════════════════════════════════════════════
-- Problem: SECURITY DEFINER functions taking p_user_id are callable by any
-- authenticated client via supabase.rpc(). Comments saying "service_role only"
-- are not enforcement.
--
-- Fix: REVOKE EXECUTE from public, authenticated, and anon roles.
-- GRANT EXECUTE only to service_role (used by edge functions).
-- The service_role key bypasses RLS and has full access.

-- Revoke from all non-service roles
REVOKE EXECUTE ON FUNCTION update_trophy_rating(uuid, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION upsert_1rm_record(uuid, text, numeric, numeric, integer, uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION complete_daily_goal(uuid, date) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION award_daily_goal_trophy(uuid, date) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION apply_trophy_decay(uuid) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION increment_user_xp(uuid, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION update_user_streak(uuid, date) FROM PUBLIC, authenticated, anon;

-- Grant to service_role only
GRANT EXECUTE ON FUNCTION update_trophy_rating(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION upsert_1rm_record(uuid, text, numeric, numeric, integer, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION complete_daily_goal(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION award_daily_goal_trophy(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION apply_trophy_decay(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_user_xp(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_streak(uuid, date) TO service_role;

-- ═══════════════════════════════════════════════════════════
-- FIX 3: Scoring version column for normalization compatibility
-- ═══════════════════════════════════════════════════════════
-- Problem: V2 raw_score is Wilks-adjusted + diminishing-volume-adjusted.
-- Legacy raw_score is plain tonnage. Mixing these in the 30-day baseline
-- creates unfair normalization for ~30 days after V2 launch.
--
-- Fix: Add a scoring_version column. The edge function sets it on every
-- validated workout. Normalization baseline queries filter by version.

ALTER TABLE workouts
  ADD COLUMN scoring_version integer NOT NULL DEFAULT 1;

-- Backfill: all existing workouts are version 1 (already the default)
-- New V2 workouts will be written with scoring_version = 2

CREATE INDEX idx_workouts_scoring_version ON workouts(user_id, type, status, scoring_version)
  WHERE status = 'validated';
