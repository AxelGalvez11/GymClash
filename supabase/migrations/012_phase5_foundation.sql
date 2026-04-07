-- Migration 012: Phase 5 foundation
-- Character support, cosmetic catalog, shop, war roles, location leaderboards, chat, HIIT

-- ─── Character Workout Distribution ─────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS strength_workout_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scout_workout_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS gym_coins integer NOT NULL DEFAULT 0;

-- ─── Equipped Cosmetics ─────────────────────────────────

ALTER TABLE cosmetic_inventory
  ADD COLUMN IF NOT EXISTS equipped boolean NOT NULL DEFAULT false;

-- Equip/unequip RPC (max 1 per cosmetic_type equipped at a time)
CREATE OR REPLACE FUNCTION equip_cosmetic(p_cosmetic_id uuid)
RETURNS void AS $$
DECLARE
  v_item record;
BEGIN
  SELECT * INTO v_item FROM cosmetic_inventory WHERE id = p_cosmetic_id AND user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;

  -- Unequip all of same type first
  UPDATE cosmetic_inventory SET equipped = false
    WHERE user_id = auth.uid() AND cosmetic_type = v_item.cosmetic_type;

  -- Equip this one
  UPDATE cosmetic_inventory SET equipped = true WHERE id = p_cosmetic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unequip_cosmetic(p_cosmetic_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE cosmetic_inventory SET equipped = false
    WHERE id = p_cosmetic_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Cosmetic Catalog ───────────────────────────────────

CREATE TABLE IF NOT EXISTS cosmetic_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  cosmetic_type cosmetic_type NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  price_coins integer,
  preview_url text,
  released_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cosmetic_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_select ON cosmetic_catalog FOR SELECT USING (true);

-- Purchase cosmetic with gym coins
CREATE OR REPLACE FUNCTION purchase_cosmetic(p_catalog_id text)
RETURNS cosmetic_inventory AS $$
DECLARE
  v_item record;
  v_coins integer;
  v_owned integer;
  v_result cosmetic_inventory;
BEGIN
  SELECT * INTO v_item FROM cosmetic_catalog WHERE id = p_catalog_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found in catalog'; END IF;
  IF v_item.price_coins IS NULL THEN RAISE EXCEPTION 'Item not directly purchasable'; END IF;

  -- Check if already owned
  SELECT COUNT(*) INTO v_owned FROM cosmetic_inventory
    WHERE user_id = auth.uid() AND cosmetic_id = p_catalog_id;
  IF v_owned > 0 THEN RAISE EXCEPTION 'Already owned'; END IF;

  -- Check coins
  SELECT gym_coins INTO v_coins FROM profiles WHERE id = auth.uid();
  IF v_coins < v_item.price_coins THEN RAISE EXCEPTION 'Not enough coins'; END IF;

  -- Deduct coins
  UPDATE profiles SET gym_coins = gym_coins - v_item.price_coins WHERE id = auth.uid();

  -- Grant item
  INSERT INTO cosmetic_inventory (user_id, cosmetic_type, cosmetic_id, acquired_via)
    VALUES (auth.uid(), v_item.cosmetic_type, p_catalog_id, 'purchase')
    RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── HIIT Workout Type ──────────────────────────────────

ALTER TYPE workout_type ADD VALUE IF NOT EXISTS 'hiit';

-- ─── War Role Specialization ────────────────────────────

DO $$ BEGIN
  CREATE TYPE war_role AS ENUM ('strength_specialist', 'cardio_specialist', 'flex');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS clan_war_member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id uuid NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  role war_role NOT NULL DEFAULT 'flex',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(war_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_war_roles_war ON clan_war_member_roles(war_id, clan_id);
ALTER TABLE clan_war_member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY war_roles_select ON clan_war_member_roles FOR SELECT USING (true);

-- Set war role (once per war, locked after first contribution)
CREATE OR REPLACE FUNCTION set_war_role(p_war_id uuid, p_role text)
RETURNS clan_war_member_roles AS $$
DECLARE
  v_membership record;
  v_existing record;
  v_has_contributions boolean;
  v_result clan_war_member_roles;
BEGIN
  SELECT clan_id INTO v_membership FROM clan_memberships WHERE user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not in a clan'; END IF;

  -- Check if already has contributions (role locked)
  SELECT EXISTS(
    SELECT 1 FROM clan_war_contributions WHERE war_id = p_war_id AND user_id = auth.uid()
  ) INTO v_has_contributions;

  SELECT * INTO v_existing FROM clan_war_member_roles WHERE war_id = p_war_id AND user_id = auth.uid();

  IF FOUND AND v_has_contributions THEN
    RAISE EXCEPTION 'Role locked after first contribution';
  END IF;

  IF FOUND THEN
    UPDATE clan_war_member_roles SET role = p_role::war_role WHERE id = v_existing.id
      RETURNING * INTO v_result;
  ELSE
    INSERT INTO clan_war_member_roles (war_id, user_id, clan_id, role)
      VALUES (p_war_id, auth.uid(), v_membership.clan_id, p_role::war_role)
      RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── War Chat ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS war_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  war_id uuid NOT NULL REFERENCES clan_wars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clan_id uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_war_chat_war ON war_chat_messages(war_id, created_at);
ALTER TABLE war_chat_messages ENABLE ROW LEVEL SECURITY;

-- Only participating clan members can read/write war chat
CREATE POLICY war_chat_select ON war_chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM clan_memberships cm
    JOIN clan_wars cw ON (cw.clan_a_id = cm.clan_id OR cw.clan_b_id = cm.clan_id)
    WHERE cm.user_id = auth.uid() AND cw.id = war_chat_messages.war_id
  )
);

CREATE POLICY war_chat_insert ON war_chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM clan_memberships cm
    JOIN clan_wars cw ON (cw.clan_a_id = cm.clan_id OR cw.clan_b_id = cm.clan_id)
    WHERE cm.user_id = auth.uid() AND cw.id = war_chat_messages.war_id
    AND cw.status = 'active'
  )
);

-- Chat rate limit trigger (30 messages per hour per user per war)
CREATE OR REPLACE FUNCTION check_chat_rate_limit()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM war_chat_messages
  WHERE user_id = NEW.user_id
    AND war_id = NEW.war_id
    AND created_at > now() - interval '1 hour';

  IF v_count >= 30 THEN
    RAISE EXCEPTION 'Chat rate limit exceeded (30 messages/hour)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_chat_rate_limit
  BEFORE INSERT ON war_chat_messages
  FOR EACH ROW EXECUTE FUNCTION check_chat_rate_limit();

-- ─── Video Evidence Type ────────────────────────────────

ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'video';

-- ─── Location-Filtered Leaderboard Views ────────────────

CREATE OR REPLACE VIEW leaderboard_players_by_country AS
SELECT
  p.id, p.display_name, p.rank, p.level, p.xp, p.trophy_rating,
  p.arena_tier, p.current_streak, p.country_code, p.region_code,
  (SELECT COUNT(*) FROM workouts w WHERE w.user_id = p.id AND w.status = 'validated') AS workout_count
FROM profiles p
WHERE p.body_weight_kg IS NOT NULL
  AND p.height_cm IS NOT NULL
  AND p.birth_date IS NOT NULL
  AND p.biological_sex IS NOT NULL
  AND (SELECT COUNT(*) FROM workouts w WHERE w.user_id = p.id AND w.status = 'validated') >= 10
  AND p.created_at <= now() - interval '14 days'
ORDER BY p.trophy_rating DESC;

GRANT SELECT ON leaderboard_players_by_country TO authenticated, anon;

-- ─── GymPass Progress ───────────────────────────────────

CREATE TABLE IF NOT EXISTS gym_pass_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  current_level integer NOT NULL DEFAULT 0,
  xp_earned integer NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, season_id)
);

ALTER TABLE gym_pass_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY gym_pass_select ON gym_pass_progress FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Active Boosts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS active_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boost_type text NOT NULL CHECK (boost_type IN ('xp_2x')),
  activated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boosts_user_active ON active_boosts(user_id, expires_at);
ALTER TABLE active_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY boosts_select ON active_boosts FOR SELECT USING (auth.uid() = user_id);

-- ─── Coin Rewards ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_gym_coins(p_user_id uuid, p_delta integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET gym_coins = GREATEST(0, gym_coins + p_delta) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment workout distribution counter
CREATE OR REPLACE FUNCTION increment_workout_counter(p_user_id uuid, p_type text)
RETURNS void AS $$
BEGIN
  IF p_type = 'strength' THEN
    UPDATE profiles SET strength_workout_count = strength_workout_count + 1 WHERE id = p_user_id;
  ELSIF p_type = 'scout' THEN
    UPDATE profiles SET scout_workout_count = scout_workout_count + 1 WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
