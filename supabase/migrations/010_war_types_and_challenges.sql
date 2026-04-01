-- Migration 010: War type variants + directed clan challenges

-- ─── War Type ───────────────────────────────────────────

-- Add war_type to clan_wars (strength_only, cardio_only, mixed)
DO $$ BEGIN
  CREATE TYPE war_type AS ENUM ('strength_only', 'cardio_only', 'mixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE clan_wars ADD COLUMN IF NOT EXISTS war_type war_type NOT NULL DEFAULT 'mixed';

-- ─── Clan War Challenges ────────────────────────────────

DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS clan_war_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  target_clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  challenger_user_id uuid NOT NULL REFERENCES auth.users(id),
  war_type war_type NOT NULL DEFAULT 'mixed',
  status challenge_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  responded_at timestamptz,
  resulting_war_id uuid REFERENCES clan_wars(id),
  CONSTRAINT no_self_challenge CHECK (challenger_clan_id <> target_clan_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_target ON clan_war_challenges(target_clan_id, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON clan_war_challenges(challenger_clan_id, status);

ALTER TABLE clan_war_challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges (public competition data)
CREATE POLICY challenges_select ON clan_war_challenges FOR SELECT USING (true);
-- All mutations go through RPCs (service_role)

-- ─── Challenge RPCs ─────────────────────────────────────

-- Send a challenge (caller must be leader/officer of challenger clan)
CREATE OR REPLACE FUNCTION send_war_challenge(
  p_target_clan_id uuid,
  p_war_type text DEFAULT 'mixed'
)
RETURNS clan_war_challenges AS $$
DECLARE
  v_membership record;
  v_target_exists boolean;
  v_existing_pending integer;
  v_challenge clan_war_challenges;
  v_war_type_enum war_type;
BEGIN
  -- Validate war_type
  v_war_type_enum := p_war_type::war_type;

  -- Check caller is in a clan with leader/officer role
  SELECT clan_id, role INTO v_membership
    FROM clan_memberships WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in a clan';
  END IF;
  IF v_membership.role NOT IN ('leader', 'officer') THEN
    RAISE EXCEPTION 'Only leaders and officers can send challenges';
  END IF;
  IF v_membership.clan_id = p_target_clan_id THEN
    RAISE EXCEPTION 'Cannot challenge your own clan';
  END IF;

  -- Check target clan exists
  SELECT EXISTS(SELECT 1 FROM clans WHERE id = p_target_clan_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'Target clan not found';
  END IF;

  -- Check no pending challenge between these clans
  SELECT COUNT(*) INTO v_existing_pending
    FROM clan_war_challenges
    WHERE status = 'pending'
      AND expires_at > now()
      AND (
        (challenger_clan_id = v_membership.clan_id AND target_clan_id = p_target_clan_id)
        OR (challenger_clan_id = p_target_clan_id AND target_clan_id = v_membership.clan_id)
      );
  IF v_existing_pending > 0 THEN
    RAISE EXCEPTION 'A pending challenge already exists between these clans';
  END IF;

  INSERT INTO clan_war_challenges (challenger_clan_id, target_clan_id, challenger_user_id, war_type)
    VALUES (v_membership.clan_id, p_target_clan_id, auth.uid(), v_war_type_enum)
    RETURNING * INTO v_challenge;

  RETURN v_challenge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Respond to a challenge (caller must be leader/officer of target clan)
CREATE OR REPLACE FUNCTION respond_to_challenge(
  p_challenge_id uuid,
  p_accept boolean
)
RETURNS clan_war_challenges AS $$
DECLARE
  v_challenge clan_war_challenges;
  v_membership record;
  v_season record;
  v_week_number integer;
  v_war_start timestamptz;
  v_war_end timestamptz;
  v_war_id uuid;
BEGIN
  SELECT * INTO v_challenge FROM clan_war_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;
  IF v_challenge.status <> 'pending' THEN
    RAISE EXCEPTION 'Challenge is no longer pending';
  END IF;
  IF v_challenge.expires_at <= now() THEN
    UPDATE clan_war_challenges SET status = 'expired' WHERE id = p_challenge_id;
    RAISE EXCEPTION 'Challenge has expired';
  END IF;

  -- Check caller is leader/officer of target clan
  SELECT clan_id, role INTO v_membership
    FROM clan_memberships WHERE user_id = auth.uid();
  IF NOT FOUND OR v_membership.clan_id <> v_challenge.target_clan_id THEN
    RAISE EXCEPTION 'You are not in the challenged clan';
  END IF;
  IF v_membership.role NOT IN ('leader', 'officer') THEN
    RAISE EXCEPTION 'Only leaders and officers can respond to challenges';
  END IF;

  IF NOT p_accept THEN
    UPDATE clan_war_challenges
      SET status = 'declined', responded_at = now()
      WHERE id = p_challenge_id
      RETURNING * INTO v_challenge;
    RETURN v_challenge;
  END IF;

  -- Accept: create a war
  SELECT * INTO v_season FROM seasons WHERE status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active season';
  END IF;

  v_week_number := FLOOR(EXTRACT(EPOCH FROM (now() - v_season.started_at)) / (7 * 24 * 3600))::integer + 1;
  v_war_start := date_trunc('day', now());
  v_war_end := v_war_start + interval '7 days';

  INSERT INTO clan_wars (season_id, clan_a_id, clan_b_id, week_number, status, started_at, ended_at, war_type)
    VALUES (v_season.id, v_challenge.challenger_clan_id, v_challenge.target_clan_id, v_week_number, 'active', v_war_start, v_war_end, v_challenge.war_type)
    RETURNING id INTO v_war_id;

  UPDATE clan_war_challenges
    SET status = 'accepted', responded_at = now(), resulting_war_id = v_war_id
    WHERE id = p_challenge_id
    RETURNING * INTO v_challenge;

  RETURN v_challenge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fetch pending challenges for my clan
CREATE OR REPLACE FUNCTION get_my_clan_challenges()
RETURNS SETOF clan_war_challenges AS $$
BEGIN
  RETURN QUERY
    SELECT c.*
    FROM clan_war_challenges c
    JOIN clan_memberships cm ON (cm.clan_id = c.target_clan_id OR cm.clan_id = c.challenger_clan_id)
    WHERE cm.user_id = auth.uid()
      AND c.status = 'pending'
      AND c.expires_at > now()
    ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
