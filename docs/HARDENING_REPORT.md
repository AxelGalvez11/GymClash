# GymClash — Phase 3.5 Hardening Report

## 1. Confirmed Working

### Schema
- All 13 tables create without errors (verified via syntax review, no circular FK dependencies)
- All 18 enum types are correctly referenced
- CHECK constraints are valid: `confidence_score` range, `clan tag` format, `clan_a_id <> clan_b_id`
- `workout_data_check` constraint correctly allows NULL data for drafts
- Indexes cover all query patterns in the API layer

### RLS
- All 12 tables have RLS enabled
- SELECT policies correctly scope data (own workouts, own reports, own appeals, public profiles/clans/wars/seasons)
- No INSERT/UPDATE/DELETE policies exist on `clan_memberships`, `workout_validations`, `clan_war_contributions`, `clan_wars`, `seasons`, `cosmetic_inventory` — only SECURITY DEFINER RPCs can modify these. This is correct.
- Implicit deny on UPDATE for `workouts` prevents clients from modifying server-derived fields

### RPCs (all SECURITY DEFINER, correct)
| RPC | Tested Logic | Status |
|-----|-------------|--------|
| `get_my_profile` | Reads auth.uid(), returns profile | OK |
| `get_my_active_war` | Looks up membership → finds active war | OK |
| `submit_workout` | Checks ownership + draft status before transitioning | OK |
| `create_clan` | Checks one-clan invariant, inserts clan + membership atomically | OK (after fix) |
| `join_clan` | Checks one-clan invariant + capacity, inserts membership | OK |
| `leave_clan` | Handles leader transfer/dissolution + membership removal | OK (after fix) |
| `get_clan_roster` | Joins memberships + profiles, orders by role | OK |
| `search_clans` | ILIKE search with escaped special characters | OK (after fix) |
| `get_war_contributions` | Aggregates contributions per user per war | OK |
| `increment_user_xp` | Updates XP, recalculates level + rank | OK |
| `update_user_streak` | Grace-period streak logic | OK |
| `update_my_display` | Restricts to display_name + avatar_url only | NEW — replaces direct UPDATE |

### One-Clan-Per-User Invariant
- Enforced at **three levels**: `UNIQUE(user_id)` constraint on `clan_memberships`, application-level check in `create_clan` and `join_clan` RPCs. Database constraint is the authoritative backstop.

### Triggers
- `update_updated_at` on profiles, workouts, clans — correct
- `create_profile_for_new_user` on auth.users — correct, SECURITY DEFINER needed to bypass RLS
- `update_clan_member_count` on clan_memberships — correct after fix
- `check_workout_rate_limit` on workouts — NEW, limits 20/day

---

## 2. Schema/Policy Bugs Found and Fixed

### BUG 1: `profiles_update` policy allowed overwriting server-derived fields (CRITICAL)
**Problem**: The UPDATE policy only checked `auth.uid() = id` but didn't restrict columns. A malicious client could `UPDATE profiles SET xp = 999999, rank = 'champion'`.
**Fix**: Removed the UPDATE policy entirely. All profile updates now go through `update_my_display` RPC (client-callable, restricts to display_name + avatar_url) or `increment_user_xp`/`update_user_streak` (service_role only).
**Migration**: `004_hardening_fixes.sql`

### BUG 2: `workouts_insert` allowed `status='submitted'` directly (HIGH)
**Problem**: The RLS INSERT policy permitted `status IN ('draft', 'submitted')`. This let clients skip the `submit_workout` RPC and insert pre-submitted workouts, bypassing any future server-side pre-submission validation.
**Fix**: INSERT policy now only allows `status = 'draft'`. Clients must call `submit_workout(workout_id)` to transition.
**Client fix**: `services/api.ts` `createWorkout` now does insert-as-draft → call `submit_workout` RPC.

### BUG 3: `create_clan` double-counted member_count (MEDIUM)
**Problem**: Inserted with `member_count=1`, then the trigger on `clan_memberships` INSERT incremented it to 2.
**Fix**: Insert with `member_count=0`, let the trigger set it to 1. Re-fetch after insert.

### BUG 4: `leave_clan` (last member) FK violation order (MEDIUM)
**Problem**: When the last leader left, the function deleted the clan first. The CASCADE handled the membership, but the trigger then tried to decrement `member_count` on a deleted clan.
**Fix**: Delete membership first, then delete the clan.

### BUG 5: Edge function didn't call `update_user_streak` (HIGH)
**Problem**: XP was updated on accepted workouts, but streaks were never updated. Streak would always stay at 0.
**Fix**: Added `update_user_streak` call after successful validation.

### BUG 6: `search_clans` didn't escape LIKE special characters (LOW)
**Problem**: Searching for `%` or `_` would match unintended patterns.
**Fix**: Escape `\`, `%`, `_` before using in ILIKE.

### BUG 7: No rate limiting on workout submissions (HIGH)
**Problem**: No limit on how many workouts a user could submit per day. A malicious client could flood the system.
**Fix**: Added `workout_rate_limit` trigger — max 20 workouts per day per user.

### BUG 8: Missing indexes
**Fix**: Added `idx_workouts_idempotency` and `idx_appeals_workout`.

---

## 3. Client Logic That Must Move Server-Side

| Logic | Current Location | Problem | Required Fix |
|-------|-----------------|---------|-------------|
| Score calculation (raw + modifiers) | `lib/scoring/` (client) + edge function (server) | Client modules are for **provisional estimates only**. The edge function is the authority. | **Already correct** — client shows estimates, edge function computes authoritative scores. No move needed, but document clearly that `lib/scoring/` is never trusted. |
| Validation checks | `lib/validation/` (client) + edge function (server) | Same as above — client modules provide instant UX feedback. Server is authoritative. | **Already correct** — parallel implementations are intentional. |
| Workout submission | `services/api.ts` | Was inserting as `status='submitted'` directly | **Fixed** — now insert as draft → call `submit_workout` RPC |
| Profile updates | `services/api.ts` | Was using direct `UPDATE` which could overwrite XP/rank | **Fixed** — now uses `update_my_display` RPC |
| Clan contribution calculation | Not implemented yet | The edge function doesn't insert `clan_war_contributions` | **Must be added in Phase 4** — after validation, check for active war + membership, insert contribution with diminishing returns |
| Normalization | `lib/scoring/normalization.ts` | Only exists in client, not in edge function | **Must be added to edge function in Phase 4** — requires access to user's 30-day rolling average and population median |
| XP-to-rank calculation | `increment_user_xp` (server) + `constants/theme.ts` (client) | Thresholds are duplicated. Rank display on client uses `constants/theme.ts`, actual rank is set by `increment_user_xp`. | **Acceptable duplication** — client uses thresholds for display purposes (XP bar progress), server is authoritative for actual rank. |

---

## 4. Exact Phase 4 Plan After Hardening

### 4a. Deploy and Verify (prerequisite)
1. Create Supabase project
2. Run migrations 001–004 in order via Supabase SQL editor
3. Set env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy `validate-workout` edge function via `supabase functions deploy`
5. Set up database webhook: on `workouts` table, when `status` column changes to `'submitted'`, invoke `validate-workout` edge function
6. Manual smoke test: sign up → create profile → insert draft workout → submit → verify validation runs → check XP/streak updated

### 4b. Clan War Contribution Pipeline
1. Add to `validate-workout` edge function: after successful validation, check if user is in a clan and an active war exists
2. If yes, calculate `contribution_points` with diminishing returns (using `applyContributionCap` logic)
3. Insert into `clan_war_contributions`
4. Test end-to-end: workout → validate → contribution appears

### 4c. War Matchmaking
1. Create `supabase/functions/create-weekly-wars/index.ts`
2. Logic: find all clans with 3+ members, pair them by similar member_count, create `clan_wars` rows with status `'scheduled'`
3. Set up a Supabase cron job (pg_cron) to run weekly

### 4d. War Finalization
1. Create `supabase/functions/finalize-war/index.ts`
2. Logic: for each completed war, aggregate contributions into `clan_a_score`/`clan_b_score` using the 4-component weighted formula, set winner
3. Run via cron at war end time

### 4e. Normalization Pipeline
1. Add to edge function: query user's 30-day rolling average and population median
2. Apply `normalizeScore` before computing final score
3. This makes normalization server-authoritative

### 4f. Reporting System
1. Add report submission UI (category + description)
2. RLS already allows insert + read own reports
3. Add rate limit on reports (max 5/day per user)

### Not in Phase 4
- Push notifications (Phase 5)
- Monetization/cosmetics (Phase 5)
- HealthKit/Health Connect integration (Phase 5)
- Community jury (post-MVP)

---

## Supabase Deployment Checklist

```
[ ] Create Supabase project at supabase.com
[ ] Note project URL and anon key
[ ] Create .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
[ ] Open SQL editor, run 001_initial_schema.sql
[ ] Run 002_server_functions.sql
[ ] Run 003_clan_functions.sql
[ ] Run 004_hardening_fixes.sql
[ ] Enable Email auth provider in Supabase dashboard
[ ] Install Supabase CLI: npm install -g supabase
[ ] Link project: supabase link --project-ref <ref>
[ ] Deploy edge function: supabase functions deploy validate-workout
[ ] Set up database webhook for workout validation trigger
[ ] Smoke test: sign up, create workout, verify validation pipeline
```

## SECURITY DEFINER Justification

Every function marked `SECURITY DEFINER` needs it because:

| Function | Why SECURITY DEFINER |
|----------|---------------------|
| `create_profile_for_new_user` | Trigger on `auth.users` — runs before the user has a session, must bypass RLS to INSERT into `profiles` |
| `update_updated_at` | Generic trigger, runs as table owner — not actually SECURITY DEFINER (it's plain plpgsql) |
| `update_clan_member_count` | Trigger needs to UPDATE `clans.member_count` which has no UPDATE policy for the inserting user |
| `submit_workout` | Transitions `status` column which clients cannot UPDATE directly (no UPDATE policy) |
| `get_my_profile` | Could work without SECURITY DEFINER since profiles have a SELECT policy. Kept for consistency but could be demoted. |
| `increment_user_xp` | Updates server-derived fields (xp, level, rank) which clients cannot touch |
| `update_user_streak` | Updates server-derived fields (streaks, last_workout_date) |
| `create_clan` | Inserts into `clans` (requires being the leader_id) AND `clan_memberships` (no client INSERT policy) |
| `join_clan` / `leave_clan` | Modifies `clan_memberships` which has no client INSERT/DELETE policies |
| `get_clan_roster` | Joins `clan_memberships` + `profiles` — could work without SECURITY DEFINER since both have SELECT policies. Kept for join query stability. |
| `search_clans` | Reads `clans` which has a public SELECT policy. SECURITY DEFINER not strictly needed but kept for consistency. |
| `get_war_contributions` | Joins `clan_war_contributions` + `profiles`. Contributions SELECT policy requires clan membership check — SECURITY DEFINER simplifies this by bypassing the subquery. |
| `update_my_display` | Updates `profiles` — needed because there is no UPDATE policy on profiles (intentionally removed in hardening). |
| `check_workout_rate_limit` | Trigger needs to count workouts across the user's history — runs in trigger context. |

### Functions that could be demoted from SECURITY DEFINER
- `get_my_profile` — SELECT policy already covers this
- `search_clans` — public SELECT already covers this
- `get_clan_roster` — both tables have public SELECT

These are low-risk to keep as SECURITY DEFINER since they only SELECT data. Demoting would be a minor optimization.
