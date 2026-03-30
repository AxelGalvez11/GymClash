-- Clan management RPCs.
-- All business rules enforced server-side. Clients call these via supabase.rpc().

-- Create a clan (user becomes leader + first member)
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
  -- Check user isn't already in a clan
  SELECT clan_id INTO v_existing FROM clan_memberships WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You must leave your current clan before creating a new one';
  END IF;

  -- Create the clan
  INSERT INTO clans (name, tag, description, leader_id, member_count)
  VALUES (p_name, p_tag, p_description, v_user_id, 1)
  RETURNING * INTO v_clan;

  -- Add creator as leader
  INSERT INTO clan_memberships (clan_id, user_id, role)
  VALUES (v_clan.id, v_user_id, 'leader');

  RETURN v_clan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join an existing clan
CREATE OR REPLACE FUNCTION join_clan(p_clan_id uuid)
RETURNS clan_memberships AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing uuid;
  v_clan clans;
  v_membership clan_memberships;
BEGIN
  -- Check user isn't already in a clan
  SELECT clan_id INTO v_existing FROM clan_memberships WHERE user_id = v_user_id;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You must leave your current clan first';
  END IF;

  -- Check clan exists and has room
  SELECT * INTO v_clan FROM clans WHERE id = p_clan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clan not found';
  END IF;
  IF v_clan.member_count >= v_clan.max_members THEN
    RAISE EXCEPTION 'Clan is full';
  END IF;

  -- Add membership (trigger updates member_count)
  INSERT INTO clan_memberships (clan_id, user_id, role)
  VALUES (p_clan_id, v_user_id, 'member')
  RETURNING * INTO v_membership;

  RETURN v_membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Leave current clan
CREATE OR REPLACE FUNCTION leave_clan()
RETURNS void AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_membership clan_memberships;
  v_new_leader uuid;
BEGIN
  SELECT * INTO v_membership FROM clan_memberships WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not in a clan';
  END IF;

  -- If leader, transfer or dissolve
  IF v_membership.role = 'leader' THEN
    -- Try to find another member to promote
    SELECT user_id INTO v_new_leader
    FROM clan_memberships
    WHERE clan_id = v_membership.clan_id
      AND user_id <> v_user_id
    ORDER BY
      CASE role WHEN 'officer' THEN 0 WHEN 'member' THEN 1 END,
      joined_at ASC
    LIMIT 1;

    IF v_new_leader IS NOT NULL THEN
      -- Transfer leadership
      UPDATE clan_memberships SET role = 'leader'
      WHERE user_id = v_new_leader AND clan_id = v_membership.clan_id;
      UPDATE clans SET leader_id = v_new_leader
      WHERE id = v_membership.clan_id;
    ELSE
      -- Last member — delete the clan
      DELETE FROM clans WHERE id = v_membership.clan_id;
      RETURN;
    END IF;
  END IF;

  -- Remove membership (trigger decrements member_count)
  DELETE FROM clan_memberships WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get clan roster with profiles
CREATE OR REPLACE FUNCTION get_clan_roster(p_clan_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  rank rank_type,
  level integer,
  role clan_role,
  joined_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.user_id,
    p.display_name,
    p.avatar_url,
    p.rank,
    p.level,
    cm.role,
    cm.joined_at
  FROM clan_memberships cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.clan_id = p_clan_id
  ORDER BY
    CASE cm.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 WHEN 'member' THEN 2 END,
    cm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search clans (for join screen)
CREATE OR REPLACE FUNCTION search_clans(p_query text DEFAULT '', p_limit integer DEFAULT 20)
RETURNS SETOF clans AS $$
BEGIN
  IF p_query = '' THEN
    RETURN QUERY SELECT * FROM clans ORDER BY member_count DESC LIMIT p_limit;
  ELSE
    RETURN QUERY SELECT * FROM clans
    WHERE name ILIKE '%' || p_query || '%' OR tag ILIKE '%' || p_query || '%'
    ORDER BY member_count DESC
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get war contributions for a specific war + clan
CREATE OR REPLACE FUNCTION get_war_contributions(p_war_id uuid, p_clan_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  contribution_points numeric,
  workout_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cwc.user_id,
    p.display_name,
    SUM(cwc.contribution_points) AS contribution_points,
    COUNT(*) AS workout_count
  FROM clan_war_contributions cwc
  JOIN profiles p ON p.id = cwc.user_id
  WHERE cwc.war_id = p_war_id AND cwc.clan_id = p_clan_id
  GROUP BY cwc.user_id, p.display_name
  ORDER BY contribution_points DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
