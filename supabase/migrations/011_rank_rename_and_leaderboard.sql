-- Migration 011: Rank name refresh + leaderboard view + audit log + flagged notifications

-- ─── Rank Name Refresh ──────────────────────────────────
-- Old: bronze, silver, gold, platinum, diamond, champion
-- New: rookie, iron, steel, titan, apex, demon_slayer
-- Postgres 10+ supports ALTER TYPE RENAME VALUE

ALTER TYPE rank_type RENAME VALUE 'bronze' TO 'rookie';
ALTER TYPE rank_type RENAME VALUE 'silver' TO 'iron';
ALTER TYPE rank_type RENAME VALUE 'gold' TO 'steel';
ALTER TYPE rank_type RENAME VALUE 'platinum' TO 'titan';
ALTER TYPE rank_type RENAME VALUE 'diamond' TO 'apex';
ALTER TYPE rank_type RENAME VALUE 'champion' TO 'demon_slayer';

-- ─── Update increment_user_xp to use new rank names ─────

CREATE OR REPLACE FUNCTION increment_user_xp(p_user_id uuid, p_xp integer)
RETURNS void AS $$
DECLARE
  v_new_xp integer;
  v_new_level integer;
  v_new_rank rank_type;
BEGIN
  UPDATE profiles
  SET xp = xp + p_xp
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  v_new_level := GREATEST(1, floor(v_new_xp / 1000.0)::integer + 1);

  v_new_rank := CASE
    WHEN v_new_xp >= 30000 THEN 'demon_slayer'::rank_type
    WHEN v_new_xp >= 15000 THEN 'apex'::rank_type
    WHEN v_new_xp >= 7000 THEN 'titan'::rank_type
    WHEN v_new_xp >= 3000 THEN 'steel'::rank_type
    WHEN v_new_xp >= 1000 THEN 'iron'::rank_type
    ELSE 'rookie'::rank_type
  END;

  UPDATE profiles
  SET level = v_new_level, rank = v_new_rank
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Update create_profile_for_new_user trigger ─────────
-- New users start as 'rookie' (was 'bronze')
-- The default on the column handles this since we renamed the enum value.
-- No trigger change needed — the column default references the enum value by position.

-- ─── Personal Leaderboard View ──────────────────────────

CREATE OR REPLACE VIEW leaderboard_players AS
SELECT
  p.id,
  p.display_name,
  p.rank,
  p.level,
  p.xp,
  p.trophy_rating,
  p.arena_tier,
  p.current_streak,
  p.created_at,
  (SELECT COUNT(*) FROM workouts w
   WHERE w.user_id = p.id AND w.status = 'validated') AS workout_count
FROM profiles p
WHERE
  -- Ranked-eligible: biodata complete + 10 workouts + 14 days
  p.body_weight_kg IS NOT NULL
  AND p.height_cm IS NOT NULL
  AND p.birth_date IS NOT NULL
  AND p.biological_sex IS NOT NULL
  AND (SELECT COUNT(*) FROM workouts w WHERE w.user_id = p.id AND w.status = 'validated') >= 10
  AND p.created_at <= now() - interval '14 days'
ORDER BY p.trophy_rating DESC;

GRANT SELECT ON leaderboard_players TO authenticated, anon;

-- ─── Clan Leaderboard View ──────────────────────────────

CREATE OR REPLACE VIEW leaderboard_clans AS
SELECT
  c.id,
  c.name,
  c.tag,
  c.member_count,
  c.created_at,
  COALESCE(SUM(CASE WHEN cw.winner_clan_id = c.id THEN 1 ELSE 0 END), 0) AS war_wins,
  COALESCE(COUNT(cw.id), 0) AS wars_played,
  (SELECT COALESCE(SUM(p.trophy_rating), 0)
   FROM clan_memberships cm JOIN profiles p ON p.id = cm.user_id
   WHERE cm.clan_id = c.id) AS total_trophies
FROM clans c
LEFT JOIN clan_wars cw ON (cw.clan_a_id = c.id OR cw.clan_b_id = c.id) AND cw.status = 'completed'
GROUP BY c.id
ORDER BY war_wins DESC, total_trophies DESC;

GRANT SELECT ON leaderboard_clans TO authenticated, anon;

-- ─── Admin Audit Log ────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
-- Admin-only access (service_role bypasses RLS)

-- ─── RPC: Resolve Appeal with Audit ─────────────────────

CREATE OR REPLACE FUNCTION resolve_appeal(
  p_appeal_id uuid,
  p_approved boolean,
  p_reviewer_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_appeal record;
  v_new_status text;
BEGIN
  SELECT * INTO v_appeal FROM appeals WHERE id = p_appeal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appeal not found'; END IF;
  IF v_appeal.status NOT IN ('pending', 'under_review') THEN
    RAISE EXCEPTION 'Appeal already resolved';
  END IF;

  v_new_status := CASE WHEN p_approved THEN 'approved' ELSE 'denied' END;

  UPDATE appeals
  SET status = v_new_status::appeal_status,
      reviewer_notes = p_reviewer_notes,
      resolved_at = now()
  WHERE id = p_appeal_id;

  -- If approved, reinstate the workout
  IF p_approved THEN
    UPDATE workouts
    SET validation_status = 'accepted',
        confidence_score = 0.8
    WHERE id = v_appeal.workout_id;

    -- Recalculate XP (add back the final_score)
    PERFORM increment_user_xp(v_appeal.user_id,
      COALESCE((SELECT ROUND(final_score)::integer FROM workouts WHERE id = v_appeal.workout_id), 0));
  END IF;

  -- Audit log
  INSERT INTO admin_audit_log (action, target_type, target_id, details)
  VALUES (
    CASE WHEN p_approved THEN 'appeal_approved' ELSE 'appeal_denied' END,
    'appeal',
    p_appeal_id,
    jsonb_build_object(
      'workout_id', v_appeal.workout_id,
      'user_id', v_appeal.user_id,
      'reviewer_notes', p_reviewer_notes
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RPC: Resolve Report with Audit ─────────────────────

CREATE OR REPLACE FUNCTION resolve_report(
  p_report_id uuid,
  p_status text,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_status NOT IN ('resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Status must be resolved or dismissed';
  END IF;

  UPDATE reports
  SET status = p_status::report_status,
      resolution_notes = p_resolution_notes,
      resolved_at = now()
  WHERE id = p_report_id;

  INSERT INTO admin_audit_log (action, target_type, target_id, details)
  VALUES (
    'report_' || p_status,
    'report',
    p_report_id,
    jsonb_build_object('resolution_notes', p_resolution_notes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
