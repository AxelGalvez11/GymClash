-- Server-side helper functions for the validation pipeline.
-- These run with service_role privileges, not called directly by clients.

-- Increment user XP and update rank/level accordingly
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

  -- Calculate level (1 level per 1000 XP)
  v_new_level := GREATEST(1, floor(v_new_xp / 1000.0)::integer + 1);

  -- Calculate rank from XP thresholds
  v_new_rank := CASE
    WHEN v_new_xp >= 30000 THEN 'champion'::rank_type
    WHEN v_new_xp >= 15000 THEN 'diamond'::rank_type
    WHEN v_new_xp >= 7000 THEN 'platinum'::rank_type
    WHEN v_new_xp >= 3000 THEN 'gold'::rank_type
    WHEN v_new_xp >= 1000 THEN 'silver'::rank_type
    ELSE 'bronze'::rank_type
  END;

  UPDATE profiles
  SET level = v_new_level, rank = v_new_rank
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update streak for a user after a validated workout
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id uuid, p_workout_date date)
RETURNS void AS $$
DECLARE
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
BEGIN
  SELECT last_workout_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM profiles WHERE id = p_user_id;

  IF v_last_date IS NULL OR p_workout_date - v_last_date > 2 THEN
    -- No previous workout or gap > grace period: reset streak
    v_current_streak := 1;
  ELSIF p_workout_date - v_last_date >= 1 THEN
    -- Next day (or grace day): increment streak
    v_current_streak := v_current_streak + 1;
  END IF;
  -- Same day: no change to streak

  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  UPDATE profiles
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_workout_date = p_workout_date
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
