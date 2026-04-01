-- Migration 009: Biodata expansion for Phase 2B
-- Adds: experience levels, resting HR, VO2max, max HR, prefer-not-to-say sex option

-- ─── New profile columns ────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lifting_experience text
    CHECK (lifting_experience IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS running_experience text
    CHECK (running_experience IN ('beginner', 'intermediate', 'advanced')),
  ADD COLUMN IF NOT EXISTS resting_hr integer
    CHECK (resting_hr IS NULL OR (resting_hr BETWEEN 30 AND 120)),
  ADD COLUMN IF NOT EXISTS estimated_vo2max numeric,
  ADD COLUMN IF NOT EXISTS max_heart_rate integer;

-- ─── Update biodata RPC to accept new fields + prefer_not_to_say ────

CREATE OR REPLACE FUNCTION update_my_biodata(
  p_body_weight_kg numeric DEFAULT NULL,
  p_height_cm numeric DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_biological_sex text DEFAULT NULL,
  p_lifting_experience text DEFAULT NULL,
  p_running_experience text DEFAULT NULL,
  p_resting_hr integer DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
  v_age integer;
  v_max_hr integer;
  v_vo2max numeric;
BEGIN
  -- Validate biological_sex if provided
  IF p_biological_sex IS NOT NULL AND p_biological_sex NOT IN ('male', 'female', 'prefer_not_to_say') THEN
    RAISE EXCEPTION 'biological_sex must be male, female, or prefer_not_to_say';
  END IF;

  -- Validate experience levels if provided
  IF p_lifting_experience IS NOT NULL AND p_lifting_experience NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'lifting_experience must be beginner, intermediate, or advanced';
  END IF;
  IF p_running_experience IS NOT NULL AND p_running_experience NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'running_experience must be beginner, intermediate, or advanced';
  END IF;

  -- Calculate max heart rate and VO2max if we have the data
  v_max_hr := NULL;
  v_vo2max := NULL;

  -- Use provided birth date or existing one
  IF p_birth_date IS NOT NULL THEN
    v_age := EXTRACT(YEAR FROM age(p_birth_date));
    v_max_hr := 220 - v_age;
  ELSE
    -- Try existing birth_date
    SELECT EXTRACT(YEAR FROM age(birth_date))::integer INTO v_age
      FROM profiles WHERE id = auth.uid() AND birth_date IS NOT NULL;
    IF v_age IS NOT NULL THEN
      v_max_hr := 220 - v_age;
    END IF;
  END IF;

  -- VO2max via Nes formula: 15.3 × (maxHR / restingHR)
  IF v_max_hr IS NOT NULL AND COALESCE(p_resting_hr, (SELECT resting_hr FROM profiles WHERE id = auth.uid())) IS NOT NULL THEN
    v_vo2max := ROUND(15.3 * (v_max_hr::numeric / COALESCE(p_resting_hr, (SELECT resting_hr FROM profiles WHERE id = auth.uid()))::numeric), 1);
  END IF;

  UPDATE profiles SET
    body_weight_kg = COALESCE(p_body_weight_kg, body_weight_kg),
    height_cm = COALESCE(p_height_cm, height_cm),
    birth_date = COALESCE(p_birth_date, birth_date),
    biological_sex = COALESCE(p_biological_sex, biological_sex),
    lifting_experience = COALESCE(p_lifting_experience, lifting_experience),
    running_experience = COALESCE(p_running_experience, running_experience),
    resting_hr = COALESCE(p_resting_hr, resting_hr),
    max_heart_rate = COALESCE(v_max_hr, max_heart_rate),
    estimated_vo2max = COALESCE(v_vo2max, estimated_vo2max),
    updated_at = now()
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
