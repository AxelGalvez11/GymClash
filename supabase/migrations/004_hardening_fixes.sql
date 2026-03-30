-- Phase 3.5 Hardening Fixes
-- Addresses all issues found in the security and schema audit.

-- ─── BUG 1: profiles_update allows overwriting server-derived fields ───
-- The current policy only checks ownership, but doesn't restrict WHICH columns
-- can be updated. A malicious client could SET xp=999999 and it would succeed.
-- Fix: Drop the permissive policy, replace with a column-restricted RPC.

DROP POLICY IF EXISTS profiles_update ON profiles;

-- New policy: clients cannot directly UPDATE profiles at all
-- All profile updates go through RPCs:
--   - update_my_display for display_name + avatar_url (client-callable)
--   - increment_user_xp / update_user_streak (service_role only)

CREATE OR REPLACE FUNCTION update_my_display(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  UPDATE profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url)
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BUG 2: workouts_insert allows status='submitted' directly ───
-- Client can skip the draft→submitted transition and bypass any future
-- server-side pre-submission checks. Fix: only allow 'draft' on insert.
-- The submit_workout RPC transitions to 'submitted'.

DROP POLICY IF EXISTS workouts_insert ON workouts;
CREATE POLICY workouts_insert ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'draft');

-- ─── BUG 3: No UPDATE policy on workouts for client ───
-- The submit_workout RPC is SECURITY DEFINER so it bypasses RLS.
-- But there's no explicit block on client UPDATE. With RLS enabled and
-- no UPDATE policy, this is actually safe (implicit deny). Document this.
-- No fix needed, but add an explicit deny for clarity.

-- (No-op: RLS with no UPDATE policy = implicit deny. This is correct.)

-- ─── BUG 4: member_count trigger fires AFTER the SECURITY DEFINER insert ───
-- Since create_clan inserts with member_count=1 and THEN the trigger fires
-- on clan_memberships INSERT, we get member_count=2 after create_clan.
-- Fix: insert with member_count=0 and let the trigger handle it.

-- This is fixed in the create_clan function:
CREATE OR REPLACE FUNCTION create_clan(
  p_name text,
  p_tag text,
  p_description text DEFAULT ''
)
RETURNS clans AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_clan clans;
BEGIN
  SELECT clan_id INTO v_existing FROM clan_memberships WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You must leave your current clan before creating a new one';
  END IF;

  -- Insert with member_count=0; the trigger on clan_memberships INSERT will set it to 1
  INSERT INTO clans (name, tag, description, leader_id, member_count)
  VALUES (p_name, p_tag, p_description, v_user_id, 0)
  RETURNING * INTO v_clan;

  INSERT INTO clan_memberships (clan_id, user_id, role)
  VALUES (v_clan.id, v_user_id, 'leader');

  -- Re-fetch to get the trigger-updated member_count
  SELECT * INTO v_clan FROM clans WHERE id = v_clan.id;

  RETURN v_clan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BUG 5: leave_clan deletes clan before membership (FK violation) ───
-- When the last leader leaves, we DELETE FROM clans, but the membership
-- row still exists. The CASCADE on clan_memberships.clan_id handles this,
-- BUT the membership DELETE trigger then tries to decrement member_count
-- on a now-deleted clan, which silently fails (no row to update).
-- Fix: delete membership first, then delete clan.

CREATE OR REPLACE FUNCTION leave_clan()
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_membership clan_memberships;
  v_new_leader uuid;
  v_clan_id uuid;
BEGIN
  SELECT * INTO v_membership FROM clan_memberships WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in a clan';
  END IF;

  v_clan_id := v_membership.clan_id;

  IF v_membership.role = 'leader' THEN
    SELECT user_id INTO v_new_leader
    FROM clan_memberships
    WHERE clan_id = v_clan_id
      AND user_id <> v_user_id
    ORDER BY
      CASE role WHEN 'officer' THEN 0 WHEN 'member' THEN 1 END,
      joined_at ASC
    LIMIT 1;

    IF v_new_leader IS NOT NULL THEN
      UPDATE clan_memberships SET role = 'leader'
      WHERE user_id = v_new_leader AND clan_id = v_clan_id;
      UPDATE clans SET leader_id = v_new_leader
      WHERE id = v_clan_id;
      -- Now remove the leaving leader
      DELETE FROM clan_memberships WHERE user_id = v_user_id;
    ELSE
      -- Last member: remove membership first, then clan
      DELETE FROM clan_memberships WHERE user_id = v_user_id;
      DELETE FROM clans WHERE id = v_clan_id;
    END IF;
  ELSE
    DELETE FROM clan_memberships WHERE user_id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BUG 6: Edge function doesn't call update_user_streak ───
-- The validate-workout edge function updates XP but never updates streaks.
-- Fix: this will be addressed in the edge function code, not SQL.
-- But ensure the RPC is callable by service_role.
-- (Already SECURITY DEFINER, so it works when called from edge function
--  using service_role key. No SQL fix needed.)

-- ─── BUG 7: search_clans is vulnerable to SQL injection via ILIKE ───
-- The '%' || p_query || '%' pattern is safe because p_query is a PL/pgSQL
-- parameter, not string concatenation in raw SQL. PL/pgSQL parameterizes
-- automatically. However, we should escape LIKE special characters.

CREATE OR REPLACE FUNCTION search_clans(p_query text DEFAULT '', p_limit integer DEFAULT 20)
RETURNS SETOF clans AS $$
DECLARE
  v_escaped text;
BEGIN
  IF p_query = '' THEN
    RETURN QUERY SELECT * FROM clans ORDER BY member_count DESC LIMIT p_limit;
  ELSE
    -- Escape LIKE special characters
    v_escaped := replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_');
    RETURN QUERY SELECT * FROM clans
    WHERE name ILIKE '%' || v_escaped || '%' OR tag ILIKE '%' || v_escaped || '%'
    ORDER BY member_count DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BUG 8: No rate limiting on workout submissions ───
-- A malicious client could spam thousands of workouts.
-- Add a CHECK constraint or trigger. For MVP, add a simple daily limit.

CREATE OR REPLACE FUNCTION check_workout_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM workouts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 day';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit: maximum 20 workouts per day';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workout_rate_limit
  BEFORE INSERT ON workouts
  FOR EACH ROW EXECUTE FUNCTION check_workout_rate_limit();

-- ─── BUG 9: submit_workout doesn't trigger validation ───
-- Currently the client inserts directly with status='submitted' (bypassing
-- the submit_workout RPC). After fixing BUG 2, clients must insert as
-- 'draft' then call submit_workout. But submit_workout doesn't trigger
-- the validation edge function. Add a comment and document that
-- the edge function must be invoked separately (via DB webhook or
-- directly by the client after submission).

-- For now, the flow is:
-- 1. Client inserts workout with status='draft'
-- 2. Client calls submit_workout(workout_id) to transition to 'submitted'
-- 3. DB webhook on status='submitted' invokes validate-workout edge function
-- 4. Edge function validates and updates to 'validated' or 'rejected'

-- ─── ENHANCEMENT: Prevent clan_memberships direct manipulation ───
-- Ensure no INSERT or DELETE policies exist for clan_memberships
-- (only SECURITY DEFINER RPCs can modify). Already correct — no
-- insert/delete policies exist, only SELECT.

-- ─── ENHANCEMENT: Add missing indexes ───
CREATE INDEX IF NOT EXISTS idx_workouts_idempotency ON workouts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_appeals_workout ON appeals(workout_id);
