-- GymClash V2 Phase 1: Competitive Expansion
-- Adds: arena tiers, trophies, biodata, 1RM tracking, daily goals, active recovery

-- ─── New Enums ───────────────────────────────────────────

CREATE TYPE arena_tier AS ENUM ('rustyard', 'iron_forge', 'titan_vault', 'apex_colosseum');

-- Extend workout_type with active_recovery
ALTER TYPE workout_type ADD VALUE 'active_recovery';

-- ─── Profiles Extension ──────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN body_weight_kg numeric,
  ADD COLUMN height_cm numeric,
  ADD COLUMN birth_date date,
  ADD COLUMN biological_sex text,
  ADD COLUMN trophy_rating integer NOT NULL DEFAULT 0,
  ADD COLUMN arena_tier arena_tier NOT NULL DEFAULT 'rustyard',
  ADD COLUMN last_trophy_decay_date date;

-- ─── 1RM Records ─────────────────────────────────────────

CREATE TABLE user_1rm_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  best_estimated_1rm numeric NOT NULL,
  best_weight_kg numeric NOT NULL,
  best_reps integer NOT NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  workout_id uuid REFERENCES workouts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise)
);

CREATE INDEX idx_1rm_user ON user_1rm_records(user_id);
CREATE INDEX idx_1rm_user_exercise ON user_1rm_records(user_id, exercise);

CREATE TRIGGER user_1rm_updated_at
  BEFORE UPDATE ON user_1rm_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_1rm_records ENABLE ROW LEVEL SECURITY;

-- Users can read their own 1RM records
CREATE POLICY user_1rm_select ON user_1rm_records FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Daily Goals ─────────────────────────────────────────

CREATE TABLE daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_date date NOT NULL,
  goal_type text NOT NULL, -- 'complete_any_workout' | 'strength_intensity'
  goal_metadata jsonb NOT NULL DEFAULT '{}',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  trophy_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_date)
);

CREATE INDEX idx_daily_goals_user_date ON daily_goals(user_id, goal_date);

ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

-- Users can read their own goals
CREATE POLICY daily_goals_select ON daily_goals FOR SELECT
  USING (auth.uid() = user_id);

-- ─── RPCs ────────────────────────────────────────────────

-- Update biodata (client-callable, restricted to biodata fields only)
CREATE OR REPLACE FUNCTION update_my_biodata(
  p_body_weight_kg numeric DEFAULT NULL,
  p_height_cm numeric DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_biological_sex text DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- Validate biological_sex if provided
  IF p_biological_sex IS NOT NULL AND p_biological_sex NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'biological_sex must be male or female';
  END IF;

  UPDATE profiles
  SET
    body_weight_kg = COALESCE(p_body_weight_kg, body_weight_kg),
    height_cm = COALESCE(p_height_cm, height_cm),
    birth_date = COALESCE(p_birth_date, birth_date),
    biological_sex = COALESCE(p_biological_sex, biological_sex)
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trophy rating and arena tier (service_role only)
CREATE OR REPLACE FUNCTION update_trophy_rating(p_user_id uuid, p_delta integer)
RETURNS void AS $$
DECLARE
  v_new_rating integer;
  v_new_tier arena_tier;
BEGIN
  UPDATE profiles
  SET trophy_rating = GREATEST(0, trophy_rating + p_delta)
  WHERE id = p_user_id
  RETURNING trophy_rating INTO v_new_rating;

  -- Derive arena tier from trophy rating
  v_new_tier := CASE
    WHEN v_new_rating >= 1200 THEN 'apex_colosseum'::arena_tier
    WHEN v_new_rating >= 700 THEN 'titan_vault'::arena_tier
    WHEN v_new_rating >= 300 THEN 'iron_forge'::arena_tier
    ELSE 'rustyard'::arena_tier
  END;

  UPDATE profiles
  SET arena_tier = v_new_tier
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert a 1RM record (service_role only — called from edge function)
CREATE OR REPLACE FUNCTION upsert_1rm_record(
  p_user_id uuid,
  p_exercise text,
  p_estimated_1rm numeric,
  p_weight_kg numeric,
  p_reps integer,
  p_workout_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_1rm_records (user_id, exercise, best_estimated_1rm, best_weight_kg, best_reps, workout_id, achieved_at)
  VALUES (p_user_id, p_exercise, p_estimated_1rm, p_weight_kg, p_reps, p_workout_id, now())
  ON CONFLICT (user_id, exercise) DO UPDATE
  SET
    best_estimated_1rm = EXCLUDED.best_estimated_1rm,
    best_weight_kg = EXCLUDED.best_weight_kg,
    best_reps = EXCLUDED.best_reps,
    workout_id = EXCLUDED.workout_id,
    achieved_at = EXCLUDED.achieved_at
  WHERE EXCLUDED.best_estimated_1rm > user_1rm_records.best_estimated_1rm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate or fetch today's daily goal (client-callable)
CREATE OR REPLACE FUNCTION get_or_create_daily_goal()
RETURNS daily_goals AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_goal daily_goals;
  v_has_1rm boolean;
  v_goal_type text;
  v_metadata jsonb;
  v_exercise text;
  v_target_1rm numeric;
BEGIN
  -- Return existing goal if already generated today
  SELECT * INTO v_goal FROM daily_goals
  WHERE user_id = v_user_id AND goal_date = v_today;

  IF FOUND THEN
    RETURN v_goal;
  END IF;

  -- Check if user has any 1RM records
  SELECT EXISTS(SELECT 1 FROM user_1rm_records WHERE user_id = v_user_id) INTO v_has_1rm;

  IF v_has_1rm THEN
    -- Pick the exercise with the highest 1RM for the intensity goal
    SELECT exercise, best_estimated_1rm INTO v_exercise, v_target_1rm
    FROM user_1rm_records
    WHERE user_id = v_user_id
    ORDER BY best_estimated_1rm DESC
    LIMIT 1;

    v_goal_type := 'strength_intensity';
    v_metadata := jsonb_build_object(
      'exercise', v_exercise,
      'target_1rm', v_target_1rm,
      'threshold_pct', 0.80
    );
  ELSE
    v_goal_type := 'complete_any_workout';
    v_metadata := '{}'::jsonb;
  END IF;

  INSERT INTO daily_goals (user_id, goal_date, goal_type, goal_metadata)
  VALUES (v_user_id, v_today, v_goal_type, v_metadata)
  RETURNING * INTO v_goal;

  RETURN v_goal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete a daily goal (service_role only — called from edge function)
CREATE OR REPLACE FUNCTION complete_daily_goal(p_user_id uuid, p_date date)
RETURNS boolean AS $$
DECLARE
  v_completed boolean;
BEGIN
  UPDATE daily_goals
  SET completed = true, completed_at = now()
  WHERE user_id = p_user_id
    AND goal_date = p_date
    AND completed = false
  RETURNING true INTO v_completed;

  RETURN COALESCE(v_completed, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award daily goal trophy (service_role only — called from edge function)
CREATE OR REPLACE FUNCTION award_daily_goal_trophy(p_user_id uuid, p_date date)
RETURNS boolean AS $$
DECLARE
  v_awarded boolean;
BEGIN
  UPDATE daily_goals
  SET trophy_awarded = true
  WHERE user_id = p_user_id
    AND goal_date = p_date
    AND completed = true
    AND trophy_awarded = false
  RETURNING true INTO v_awarded;

  IF COALESCE(v_awarded, false) THEN
    PERFORM update_trophy_rating(p_user_id, 6);
  END IF;

  RETURN COALESCE(v_awarded, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trophy decay for missed days (service_role only)
CREATE OR REPLACE FUNCTION apply_trophy_decay(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_last_decay date;
  v_last_workout date;
  v_check_date date;
BEGIN
  SELECT last_trophy_decay_date, last_workout_date
  INTO v_last_decay, v_last_workout
  FROM profiles WHERE id = p_user_id;

  -- Start checking from the day after last decay check (or 2 days ago if never checked)
  v_check_date := COALESCE(v_last_decay, current_date - 2) + 1;

  -- Don't check today (day isn't over yet) or future
  WHILE v_check_date < current_date LOOP
    -- Check if user had any validated workout or active recovery that day
    IF NOT EXISTS (
      SELECT 1 FROM workouts
      WHERE user_id = p_user_id
        AND status = 'validated'
        AND DATE(completed_at) = v_check_date
    ) THEN
      -- No workout that day → -5 trophies
      PERFORM update_trophy_rating(p_user_id, -5);
    END IF;

    v_check_date := v_check_date + 1;
  END LOOP;

  UPDATE profiles SET last_trophy_decay_date = current_date - 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's 1RM records (client-callable)
CREATE OR REPLACE FUNCTION get_my_1rm_records()
RETURNS SETOF user_1rm_records AS $$
BEGIN
  RETURN QUERY SELECT * FROM user_1rm_records
  WHERE user_id = auth.uid()
  ORDER BY best_estimated_1rm DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Override get_my_profile to include new fields but exclude biodata from public view
-- (Biodata is only returned to the owning user, not in clan rosters etc.)
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
