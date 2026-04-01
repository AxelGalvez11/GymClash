# GymClash — Execution Plan: Raising Alignment Scores

## Current Scores → Target Scores

| Area | Current | After 2A | After 2B | After 2C | After 3 | After 4 | After 5 | Notes |
|------|---------|----------|----------|----------|---------|---------|---------|-------|
| Workout logging | 85% | 85% | 85% | **95%** | 95% | 95% | **100%** | 2C: bodyweight + per-exercise feedback. 5: video evidence |
| Scoring engine | 90% | 90% | **98%** | 98% | 98% | 98% | **100%** | 2B: VO2max, experience baselines, 1RM input |
| Anti-cheat | 95% | 95% | 95% | 95% | 95% | **98%** | **100%** | 4: admin tooling. 5: device integration |
| Clan system | 80% | **82%** | 82% | 82% | **95%** | 95% | **100%** | 2A: trophy fix. 3: war types, challenges. 5: chat, roles |
| Account model | 60% | 60% | **80%** | **90%** | 90% | 90% | **100%** | 2B: biodata expansion. 2C: guest mode, tier display. 5: full device tiers |
| Character/visual | 20% | 20% | 20% | 20% | 20% | 20% | **85%** | Needs art assets — all gains in Phase 5 |
| Shop/monetization | 10% | 10% | 10% | 10% | 10% | 10% | **90%** | All gains in Phase 5 (shop, crates, GymPass) |
| Social | 40% | 40% | 40% | 40% | **55%** | 55% | **85%** | 3: profile viewing. 5: chat, video |
| Leaderboards | 0% | 0% | 0% | 0% | **30%** | **80%** | **100%** | 3: clan leaderboard. 4: personal. 5: local/national |

---

## Phase 2A — Bug Fixes (1 session) ✅ DONE

**Alignment gains:** Clan system 80% → 82%

| Fix | Status | File |
|-----|--------|------|
| B1: Active recovery CHECK constraint | **DONE** | `supabase/migrations/008_bugfixes.sql` |
| B2: Finalize-wars trophy awards | **DONE** | `supabase/functions/finalize-wars/index.ts` |
| B3: Home screen war score display | **DONE** | `app/(app)/home.tsx` |

**Remaining in 2A:** Deploy to Supabase (requires you to create a project).

---

## Phase 2B — Biodata & Scoring Expansion (2 sessions)

**Alignment gains:** Scoring 90% → 98%, Account 60% → 80%

### Tasks

**1. Schema migration (009_biodata_expansion.sql)**

Add to `profiles`:
```sql
lifting_experience text CHECK (lifting_experience IN ('beginner','intermediate','advanced'))
running_experience text CHECK (running_experience IN ('beginner','intermediate','advanced'))
resting_hr integer CHECK (resting_hr BETWEEN 30 AND 120)
estimated_vo2max numeric
max_heart_rate integer
```

Update `update_my_biodata` RPC to accept new fields.
Update `biological_sex` validation to allow `'prefer_not_to_say'`.

**2. Biodata screen expansion**

Add to `app/(app)/settings/biodata.tsx`:
- Lifting experience picker (beginner/intermediate/advanced)
- Running experience picker (beginner/intermediate/advanced)
- Resting heart rate input (optional, number)
- "Prefer not to say" option for sex
- Auto-calculate and display: max heart rate (220 - age), estimated VO2max (Nes formula)

**3. Optional 1RM input**

Add to biodata screen:
- Bench press 1RM (optional, kg)
- Squat 1RM (optional, kg)
- Deadlift 1RM (optional, kg)
- On save: call `upsert_1rm_record` for each non-empty field

**4. Experience-based baseline initialization**

In `validate-workout` edge function, when user has < 5 workouts and has `lifting_experience` or `running_experience`:
- beginner: use 0.6 × population_median as baseline
- intermediate: use 1.0 × population_median
- advanced: use 1.4 × population_median

**5. VO2max / max heart rate calculation**

Client-side calculation from biodata:
- `maxHR = 220 - age` (where age = years since birth_date)
- `VO2max = 15.3 × (maxHR / restingHR)` (Nes formula, requires resting HR)
- Store on profile, display on profile screen

**6. Types expansion**

Add to `types/index.ts`:
```typescript
lifting_experience: 'beginner' | 'intermediate' | 'advanced' | null;
running_experience: 'beginner' | 'intermediate' | 'advanced' | null;
resting_hr: number | null;
estimated_vo2max: number | null;
max_heart_rate: number | null;
```

**7. History filter for recovery**

Add "Recovery" tab to filter pills in `history/index.tsx`.

**8. Settings screen**

Create `app/(app)/settings/index.tsx` with links to biodata, account info, sign out.

**Exit criteria:** New user → fills all biodata → sees VO2max/maxHR on profile → first workout uses experience-calibrated baseline → recovery filter works.

---

## Phase 2C — Workout UX & Guest Mode (2 sessions)

**Alignment gains:** Workout logging 85% → 95%, Account 80% → 90%

### Tasks

**1. Bodyweight exercise detection**

In `workout/strength.tsx`:
- Define `BODYWEIGHT_EXERCISES` list: pushups, pullups, dips, planks, sit-ups, burpees, etc.
- When user selects a bodyweight exercise, auto-fill weight with `profile.body_weight_kg`
- Show "(bodyweight)" label next to weight field
- If no body_weight_kg on profile, prompt to enter weight or go to biodata

**2. Per-exercise score feedback**

After user finishes each exercise in strength workout:
- Calculate provisional score for just that exercise
- Show animated badge: "+320 pts" with brief animation
- Accumulate running total visible at top of workout screen

**3. Guest mode**

Landing screen changes:
- Add "Skip for now" link below the two buttons
- Routes to home with limited functionality

Guest state:
- New Zustand slice: `guestWorkouts` (persisted to AsyncStorage, max 5)
- Guest users see home screen with demo data / empty states
- Guest users can log workouts that save locally only
- Workout screens check auth: if guest, store locally instead of submitting to server
- After 5 workouts, show "Sign up to keep your progress" prompt
- Tab bar: Home only (Clan and Profile show "Sign up to unlock")

Sign-up sync:
- On registration, offer to submit local guest workouts to server
- Iterate `guestWorkouts`, call `createWorkout` for each
- Clear guest store after successful sync

**4. Account tier display**

Server-side RPC `get_account_tier`:
- `unverified`: biodata incomplete (missing body_weight_kg OR height_cm OR birth_date OR biological_sex)
- `verified`: all biodata fields present
- `ranked_eligible`: verified + 10 validated workouts + account age >= 14 days

Client display:
- Badge on profile screen showing tier
- "Complete biodata to verify" CTA for unverified users

**Exit criteria:** Guest logs 5 workouts → signs up → workouts sync → bodyweight exercises auto-detect → per-exercise score animation shows → profile displays account tier badge.

---

## Phase 3 — Clan Wars: Full Feature Set (3 sessions)

**Alignment gains:** Clan system 82% → 95%, Social 40% → 55%, Leaderboards 0% → 30%

### Session 1: Deploy & War Polish

| Task | Detail |
|------|--------|
| Deploy clan system | Verify RPCs, deploy war crons |
| Fix create-weekly-wars auth | Add `Authorization` header check for cron secret |
| War countdown | Timer showing days/hours until war ends |
| Live contribution updates | Refresh war data on pull-to-refresh and after workout submission |

### Session 2: War Types & Challenges

| Task | Detail |
|------|--------|
| War type enum | Add `war_type` column: `strength_only`, `cardio_only`, `mixed` (default) |
| War type effects | `strength_only`: only strength workouts count. `cardio_only`: only scout counts. `mixed`: both count (current behavior). Diversity score = 1.0 for typed wars. |
| Directed challenges | New RPC: `challenge_clan(target_clan_id, war_type)`. Creates a `clan_war_challenges` table with `challenger_id`, `target_id`, `war_type`, `status` (pending/accepted/declined/expired). Target clan leader can accept/decline. Accepted → creates war. Declined → falls back to matchmaking. Expires after 48h. |
| Challenge UI | In clan screen: "Challenge" button on other clan profiles. Pending challenge indicator. Accept/decline for leaders. |

### Session 3: Leaderboard & Profile Viewing

| Task | Detail |
|------|--------|
| Clan leaderboard | New screen: rank clans by war wins + total member trophies. Top 50. |
| View other profiles | Tap clan member → see public profile (rank, arena, stats, 1RM records, workout count) |
| War detail screen | Tap completed war → per-member contributions, score breakdown, result |

**Exit criteria:** War types work → clan challenges accepted → war ends with trophies → clan leaderboard shows rankings → can view member profiles.

---

## Phase 4 — Anti-Cheat, Leaderboards & Rankings (2 sessions)

**Alignment gains:** Anti-cheat 95% → 98%, Leaderboards 30% → 80%

### Session 1: Admin Tooling & Notifications

| Task | Detail |
|------|--------|
| Appeal admin dashboard | Simple web page (can be a Supabase dashboard custom page or a standalone page): list pending appeals, view workout + validation details, approve/deny buttons |
| Report admin queue | Same dashboard: view reports, investigate, resolve/dismiss |
| Audit logging | `admin_audit_log` table: action, admin_id, target_id, timestamp, details |
| Flagged workout indicator | Home screen: if any workouts are held_for_review, show alert banner with count |

### Session 2: Leaderboards & Rank Names

| Task | Detail |
|------|--------|
| Personal leaderboard | New screen: top 100 ranked-eligible users by trophies. Shows rank, name, arena, trophies. |
| Rank name refresh | Rename to gym-culture themed names. Propose: Rookie (0) → Iron (1k) → Steel (3k) → Titan (7k) → Apex (15k) → Demon Slayer (30k). Update `constants/theme.ts`, migration for enum, edge function. |
| Materialized leaderboard | Supabase view or materialized query for top-N users/clans. Refresh on schedule. |
| Enhanced 1RM plausibility | Cross-reference with experience-level-derived estimates for users with < 5 workouts |

**Exit criteria:** Admin can review appeals → leaderboard shows top players → rank names feel "gamey" → flagged workouts show alert on home.

---

## Phase 5 — Character, Shop, Device Integration (8+ sessions)

**Alignment gains:** Character 20% → 85%, Shop 10% → 90%, Everything else → 95-100%

### 5A: Character & Visual Identity (3 sessions)

| Task | Alignment Area | Score Impact |
|------|---------------|-------------|
| Commission/generate character sprites (5-10 level tiers) | Character | 20% → 50% |
| Character on home screen replacing emoji | Character | 50% → 60% |
| Character state (working out / resting / sleeping) | Character | 60% → 70% |
| Gym arena background per tier (4 illustrations) | Character | 70% → 75% |
| Specialization appearance (workout type distribution → build type) | Character | 75% → 85% |
| Character on other profiles | Social | 55% → 65% |

### 5B: Device Integration & Cardio Depth (3 sessions)

| Task | Alignment Area | Score Impact |
|------|---------------|-------------|
| HealthKit adapter (iOS) | Anti-cheat | 98% → 100% |
| Health Connect adapter (Android) | Anti-cheat | (same) |
| Live GPS tracking during scout workouts | Workout logging | 95% → 98% |
| Territory heatmap (map of covered ground) | Workout logging | 98% → 100% |
| HR zone classification (zone 1-5 from maxHR) | Scoring | 98% → 100% |
| Verified cardio badge (+0.15 trust for device-connected runs) | Account | 90% → 95% |
| HIIT workout type with interval-based scoring | Scoring | (100%) |

### 5C: Shop & Monetization (2 sessions)

| Task | Alignment Area | Score Impact |
|------|---------------|-------------|
| Shop screen (browse cosmetics) | Shop | 10% → 40% |
| Cosmetic inventory UI (view + equip) | Shop | 40% → 55% |
| Crate system (random cosmetic drops) | Shop | 55% → 70% |
| GymPass (seasonal cosmetic track) | Shop | 70% → 80% |
| XP boosts (2x XP only, NOT competitive score) | Shop | 80% → 85% |
| Subscription flow (RevenueCat) | Shop | 85% → 90% |

### 5D: Social & Chat (2 sessions)

| Task | Alignment Area | Score Impact |
|------|---------------|-------------|
| Cross-clan war chat | Social | 65% → 75% |
| Video evidence upload for strength workouts | Social | 75% → 80% |
| View others' workout videos | Social | 80% → 85% |
| War role specialization (cardio/strength/flex) | Clan | 95% → 100% |
| Chat moderation (report, auto-filter) | Social | 85% → 85% |
| Local/national leaderboards | Leaderboards | 80% → 100% |

---

## Phase 6 — Launch Prep (2 sessions)

| Task | Area |
|------|------|
| Push notifications | Engagement |
| Onboarding animations | UX polish |
| Performance optimization | Technical |
| E2E test suite | Quality |
| App Store / Play Store submission | Launch |

---

## Summary: Fastest Path to High Alignment

| Phase | Sessions | Biggest Gains |
|-------|----------|--------------|
| **2A** | 1 | Fix 3 blocking bugs, unblock deployment |
| **2B** | 2 | Scoring 90→98%, Account 60→80% |
| **2C** | 2 | Workout 85→95%, Account 80→90% |
| **3** | 3 | Clan 82→95%, Social 40→55%, Leaderboards 0→30% |
| **4** | 2 | Anti-cheat 95→98%, Leaderboards 30→80% |
| **5** | 8+ | Character 20→85%, Shop 10→90%, everything else → 95-100% |

**Total to get every area above 80%:** Phases 2A through 5 = ~18 sessions

**Total to get every area above 90%:** Requires all of Phase 5 = ~18+ sessions

**Minimum viable for app store submission:** Phases 2A through 4 (~10 sessions) gets you a competitive fitness app with all core mechanics working, proper anti-cheat, leaderboards, and clan wars. Character visuals and shop can be v1.1 updates.
