-- GymClash Initial Schema
-- Run against a Supabase project with auth.users already available.

-- ─── Enums ───────────────────────────────────────────────

CREATE TYPE rank_type AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');
CREATE TYPE workout_type AS ENUM ('strength', 'scout');
CREATE TYPE workout_status AS ENUM ('draft', 'submitted', 'validated', 'rejected');
CREATE TYPE validation_status AS ENUM ('accepted', 'accepted_with_low_confidence', 'held_for_review', 'excluded_from_clan_score', 'rejected');
CREATE TYPE evidence_source AS ENUM ('manual', 'sensor', 'wearable');
CREATE TYPE evidence_type AS ENUM ('gps_route', 'heart_rate_log', 'accelerometer_summary', 'photo', 'wearable_sync', 'manual_note');
CREATE TYPE clan_role AS ENUM ('leader', 'officer', 'member');
CREATE TYPE clan_war_status AS ENUM ('scheduled', 'active', 'completed');
CREATE TYPE appeal_status AS ENUM ('pending', 'under_review', 'approved', 'denied');
CREATE TYPE report_category AS ENUM ('impossible_stats', 'suspected_spoofing', 'inappropriate_behavior', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');
CREATE TYPE cosmetic_type AS ENUM ('badge', 'theme', 'title', 'clan_banner');
CREATE TYPE cosmetic_acquisition AS ENUM ('season_reward', 'purchase', 'achievement');
CREATE TYPE season_status AS ENUM ('upcoming', 'active', 'completed');

-- ─── Utility: updated_at trigger ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Profiles ────────────────────────────────────────────

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  rank rank_type NOT NULL DEFAULT 'bronze',
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_workout_date date,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ─── Seasons ─────────────────────────────────────────────

CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  number integer NOT NULL UNIQUE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  status season_status NOT NULL DEFAULT 'upcoming',
  config jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Workouts ────────────────────────────────────────────

CREATE TABLE workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type workout_type NOT NULL,
  status workout_status NOT NULL DEFAULT 'draft',
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  duration_seconds integer,
  sets jsonb,
  route_data jsonb,
  raw_score numeric,
  final_score numeric,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  validation_status validation_status,
  idempotency_key text UNIQUE NOT NULL,
  source evidence_source NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_data_check CHECK (
    (type = 'strength' AND sets IS NOT NULL) OR
    (type = 'scout' AND route_data IS NOT NULL) OR
    status = 'draft'
  )
);

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_user_status ON workouts(user_id, status);
CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC);
CREATE INDEX idx_workouts_validation_status ON workouts(validation_status)
  WHERE validation_status IN ('held_for_review', 'excluded_from_clan_score');

-- ─── Workout Evidence ────────────────────────────────────

CREATE TABLE workout_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  evidence_type evidence_type NOT NULL,
  data jsonb NOT NULL,
  trust_level integer CHECK (trust_level >= 1 AND trust_level <= 5),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_workout_id ON workout_evidence(workout_id);

-- ─── Workout Validations ─────────────────────────────────

CREATE TABLE workout_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  validation_type text NOT NULL,
  passed boolean NOT NULL,
  confidence_impact numeric NOT NULL DEFAULT 0,
  reason_code text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_validations_workout_id ON workout_validations(workout_id);

-- ─── Clans ───────────────────────────────────────────────

CREATE TABLE clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  tag text UNIQUE NOT NULL CHECK (length(tag) BETWEEN 3 AND 6 AND tag ~ '^[A-Za-z0-9]+$'),
  description text DEFAULT '',
  leader_id uuid NOT NULL REFERENCES auth.users(id),
  max_members integer NOT NULL DEFAULT 30,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER clans_updated_at
  BEFORE UPDATE ON clans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Clan Memberships ────────────────────────────────────

CREATE TABLE clan_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role clan_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clan_id, user_id),
  UNIQUE(user_id) -- one clan per user
);

CREATE INDEX idx_memberships_clan_id ON clan_memberships(clan_id);

-- Update clan member_count on membership changes
CREATE OR REPLACE FUNCTION update_clan_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE clans SET member_count = member_count + 1 WHERE id = NEW.clan_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE clans SET member_count = member_count - 1 WHERE id = OLD.clan_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_membership_change
  AFTER INSERT OR DELETE ON clan_memberships
  FOR EACH ROW EXECUTE FUNCTION update_clan_member_count();

-- ─── Clan Wars ───────────────────────────────────────────

CREATE TABLE clan_wars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id),
  clan_a_id uuid NOT NULL REFERENCES clans(id),
  clan_b_id uuid NOT NULL REFERENCES clans(id),
  week_number integer NOT NULL,
  status clan_war_status NOT NULL DEFAULT 'scheduled',
  started_at timestamptz,
  ended_at timestamptz,
  winner_clan_id uuid REFERENCES clans(id),
  clan_a_score jsonb,
  clan_b_score jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clan_a_id <> clan_b_id)
);

CREATE INDEX idx_wars_season ON clan_wars(season_id, week_number);
CREATE INDEX idx_wars_clans ON clan_wars(clan_a_id, clan_b_id);
CREATE INDEX idx_wars_active ON clan_wars(status) WHERE status = 'active';

-- ─── Clan War Contributions ──────────────────────────────

CREATE TABLE clan_war_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id uuid NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  clan_id uuid NOT NULL REFERENCES clans(id),
  workout_id uuid NOT NULL REFERENCES workouts(id),
  contribution_points numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workout_id) -- one workout → one war contribution
);

CREATE INDEX idx_contributions_war_clan ON clan_war_contributions(war_id, clan_id);
CREATE INDEX idx_contributions_war_user ON clan_war_contributions(war_id, user_id);

-- ─── Reports ─────────────────────────────────────────────

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id),
  reported_user_id uuid NOT NULL REFERENCES auth.users(id),
  reported_workout_id uuid REFERENCES workouts(id),
  category report_category NOT NULL,
  description text NOT NULL DEFAULT '',
  status report_status NOT NULL DEFAULT 'pending',
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_reports_status ON reports(status) WHERE status IN ('pending', 'investigating');
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);

-- ─── Appeals ─────────────────────────────────────────────

CREATE TABLE appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  workout_id uuid NOT NULL REFERENCES workouts(id),
  reason text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status appeal_status NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(workout_id) -- one appeal per workout
);

CREATE INDEX idx_appeals_status ON appeals(status) WHERE status IN ('pending', 'under_review');
CREATE INDEX idx_appeals_user ON appeals(user_id);

-- ─── Cosmetic Inventory ──────────────────────────────────

CREATE TABLE cosmetic_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_type cosmetic_type NOT NULL,
  cosmetic_id text NOT NULL,
  acquired_via cosmetic_acquisition NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cosmetic_type, cosmetic_id)
);

CREATE INDEX idx_cosmetics_user ON cosmetic_inventory(user_id);

-- ─── Row Level Security ──────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_war_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmetic_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Profiles: read any, update own (display_name + avatar_url only)
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Workouts: read own, insert own
CREATE POLICY workouts_select ON workouts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY workouts_insert ON workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'submitted'));

-- Workout evidence: read own, insert for own workouts
CREATE POLICY evidence_select ON workout_evidence FOR SELECT
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY evidence_insert ON workout_evidence FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_id AND workouts.user_id = auth.uid()));

-- Workout validations: read own (read-only for clients)
CREATE POLICY validations_select ON workout_validations FOR SELECT
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_id AND workouts.user_id = auth.uid()));

-- Clans: read all, insert (create clan), update by leader
CREATE POLICY clans_select ON clans FOR SELECT USING (true);
CREATE POLICY clans_insert ON clans FOR INSERT
  WITH CHECK (auth.uid() = leader_id);
CREATE POLICY clans_update ON clans FOR UPDATE
  USING (auth.uid() = leader_id);

-- Clan memberships: read all (for clan rosters), no direct client insert/delete (use edge functions)
CREATE POLICY memberships_select ON clan_memberships FOR SELECT USING (true);

-- Clan wars: read all active/completed wars
CREATE POLICY wars_select ON clan_wars FOR SELECT USING (true);

-- Clan war contributions: read own clan's contributions
CREATE POLICY contributions_select ON clan_war_contributions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clan_memberships
    WHERE clan_memberships.user_id = auth.uid()
    AND clan_memberships.clan_id = clan_war_contributions.clan_id
  ));

-- Reports: insert own, read own
CREATE POLICY reports_insert ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY reports_select ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Appeals: insert own, read own
CREATE POLICY appeals_insert ON appeals FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY appeals_select ON appeals FOR SELECT
  USING (auth.uid() = user_id);

-- Cosmetic inventory: read own
CREATE POLICY cosmetics_select ON cosmetic_inventory FOR SELECT
  USING (auth.uid() = user_id);

-- Seasons: read all
CREATE POLICY seasons_select ON seasons FOR SELECT USING (true);

-- ─── Server Functions (RPCs) ─────────────────────────────

-- Submit a workout (transitions draft → submitted and triggers validation)
CREATE OR REPLACE FUNCTION submit_workout(p_workout_id uuid)
RETURNS workouts AS $$
DECLARE
  v_workout workouts;
BEGIN
  UPDATE workouts
  SET status = 'submitted', updated_at = now()
  WHERE id = p_workout_id
    AND user_id = auth.uid()
    AND status = 'draft'
  RETURNING * INTO v_workout;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workout not found, not owned by user, or not in draft status';
  END IF;

  RETURN v_workout;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's profile with computed fields
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active clan war for user's clan
CREATE OR REPLACE FUNCTION get_my_active_war()
RETURNS clan_wars AS $$
DECLARE
  v_clan_id uuid;
  v_war clan_wars;
BEGIN
  SELECT clan_id INTO v_clan_id FROM clan_memberships WHERE user_id = auth.uid();

  IF v_clan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_war FROM clan_wars
  WHERE (clan_a_id = v_clan_id OR clan_b_id = v_clan_id)
    AND status = 'active'
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN v_war;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
