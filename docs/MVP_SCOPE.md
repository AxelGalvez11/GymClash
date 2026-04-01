# GymClash — MVP Scope & Phased Roadmap

## What's In Version 1 (MVP)

### Core
- Strength workout logging with set-by-set entry + bodyweight exercise detection
- Scout (running) workout logging with distance/pace
- Active recovery logging (timer-based, streak maintenance)
- Personal profile: rank, level, XP, streaks, trophies, arena tier
- Daily goals (complete any workout, hit strength intensity targets)
- Score generation: raw → modifiers → normalization → final
- Dark-mode-first UI with competitive RPG aesthetic

### Competition
- Clans: create, join, leave, roster, contribution visibility
- Weekly async clan wars with 4-component war score
- Per-user daily/weekly contribution caps
- Trophy-based arena progression (Rustyard → Apex Colosseum)

### Trust & Safety
- Server-authoritative scoring (client shows estimates only)
- Automated anti-cheat checks (server-side validation pipeline)
- Confidence scoring with 5-tier validation status
- Review screen with flagged issue explanation
- Appeal submission (text-based)
- User reporting system (rate-limited)
- Rate limiting on workout submissions (20/day)

### Account
- Email/password auth (Supabase Auth)
- 2-step onboarding (name → ready)
- Expanded biodata: weight, height, birth date, sex, lifting experience, running experience, optional 1RM, resting HR, VO2max estimation
- Verified and ranked-eligible status computed server-side

### Stubbed / Scaffolded
- Cosmetic inventory table (exists, no shop UI)
- Season system (table exists, season config stored in DB)
- Health adapter interfaces (typed, mock implementation)
- Subscription tier field on profile (no purchase flow)

---

## Phased Roadmap

### Phase 2A — Bug Fixes & Deploy (1 session)

Fix the 3 critical bugs blocking deployment, then deploy to Supabase.

| Task | Detail |
|------|--------|
| **B1: Fix active_recovery CHECK constraint** | New migration `008_fix_active_recovery_check.sql` — add `OR type = 'active_recovery'` to `workout_data_check` |
| **B2: Fix finalize-wars trophy awards** | After determining winner, loop through clan members and call `update_trophy_rating` (+30 win, -15 loss) |
| **B3: Fix home screen war score** | Check which side user's clan is on before displaying scores |
| **Deploy to Supabase** | Create project → run migrations 001-008 → deploy 3 edge functions → set env vars → smoke test |

**Exit criteria:** Sign up → log all 3 workout types → scores validate → clan war finalizes with trophies → no crashes.

---

### Phase 2B — Idea Alignment: Onboarding & Biodata (2 sessions)

Fill the gaps between the original idea and the current onboarding/scoring system.

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Expanded biodata screen** | Add lifting_experience, running_experience (beginner/intermediate/advanced), prefer-not-to-say sex option | "Onboarding for setting up biodata like workout experience" |
| **Optional 1RM input** | Add bench/squat/deadlift 1RM fields to biodata screen. Pre-populate 1RM records on save. | "For lifting this may ask for 1 rep max" |
| **VO2max estimation** | Calculate estimated VO2max from age + resting HR (Nes formula: `VO2max = 15.3 × (maxHR / restHR)`). Add resting HR field to biodata. Store on profile. | "For cardio this could include calculating their VO2max" |
| **Max heart rate** | Calculate from age: `maxHR = 220 - age`. Display on profile. Used for cardio zone classification. | "Max heart rate based on age and scientific evidence" |
| **Biodata migration** | New migration: add `lifting_experience`, `running_experience`, `resting_hr`, `estimated_vo2max`, `max_heart_rate` to profiles | Schema expansion |
| **Biodata-informed baselines** | When user has biodata but < 5 workouts, use experience level to set initial baseline (beginner=0.6×median, intermediate=1.0×median, advanced=1.4×median) | "App creates a profile and calculates the users workout trajectory" |
| **History filter for recovery** | Add "Recovery" tab to history filter | Missing filter |
| **Settings screen** | Create settings index with links to biodata, account, sign out | Missing screen |

**Exit criteria:** New user → fills biodata → sees VO2max/maxHR on profile → first workout score uses experience-calibrated baseline → all biodata fields persist.

---

### Phase 2C — Idea Alignment: Workout UX (2 sessions)

Improve the workout flow to match the original idea's vision.

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Bodyweight exercise detection** | When user selects pushups/pullups/dips/planks/etc., auto-fill weight with `body_weight_kg` from profile. Show "(bodyweight)" label. | "If bodyweight based exercises are inputted then their own bodyweight is used" |
| **Per-exercise score feedback** | After each exercise, show animated score earned (e.g., "+320 pts") before returning to exercise selection screen | "Users will see their character level up after each exercise" |
| **Guest mode** | Allow skip on landing screen. Store up to 5 workouts locally. On sign-up, offer to submit local workouts to server. | "User is asked to create account but has option to skip" |
| **Guest workout store** | Extend workout-store.ts with `guestWorkouts` array persisted to AsyncStorage. On registration, iterate and submit. | Guest data persistence |
| **Account tier display** | Compute verified (biodata complete) and ranked-eligible (verified + 10 workouts + 14 days) server-side. Show badge on profile. | "Unverified users have not entered all required biodata" |

**Exit criteria:** Guest can log 5 workouts → signs up → workouts sync → bodyweight exercises auto-detect → per-exercise score animation shows during workout.

---

### Phase 3A — Clan Wars: Deploy & Polish (2 sessions)

Everything for clan wars is already built (RPCs, edge functions, war scoring). This phase deploys and polishes.

| Task | Detail |
|------|--------|
| **Deploy clan system** | Verify all clan RPCs work end-to-end with real Supabase |
| **Deploy war matchmaking** | Set up `create-weekly-wars` as weekly cron job |
| **Deploy war finalization** | Set up `finalize-wars` as weekly cron job |
| **Fix create-weekly-wars auth** | Add cron secret verification so only cron jobs can invoke |
| **War progress polish** | Countdown timer to war end, live contribution updates |

**Exit criteria:** Create clan → get matched → log workouts during war → see live contributions → war ends → winner determined → trophies awarded.

---

### Phase 3B — Clan Wars: Idea Features (3 sessions)

New clan war features from the original idea that don't exist yet.

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **War type variants** | Add `war_type` enum: `strength_only`, `cardio_only`, `mixed`. Affects which workouts count and diversity scoring. | "Cardio clan war, weightlifting clan war, or both types" |
| **Directed war challenges** | Clan leaders can challenge a specific clan. Challenged clan accepts/declines. Falls back to random matchmaking if declined/expired. | "Clans may request to go to war with specific clans" |
| **War detail screen** | Tap completed war → see full breakdown (per-member contributions, score components, result) | Missing screen |
| **Clan leaderboard** | Rank clans by war record + total member trophies. New screen. | "Local and national leaderboards" (clan portion) |
| **View other profiles** | Tap clan member → see their public profile (rank, arena, stats, 1RM records) | "Individuals may look at others profile to see their stats" |

**Exit criteria:** Leader challenges another clan → war starts → war type affects which workouts count → war ends → leaderboard updates → can view members' profiles.

---

### Phase 4A — Anti-Cheat Hardening (2 sessions)

Strengthen the validation pipeline and admin tooling.

| Task | Detail |
|------|--------|
| **Server-side normalization** | Move normalization from client provisional to server-authoritative (already in edge function, verify correctness) |
| **Enhanced 1RM plausibility** | Cross-reference with biodata-derived estimates for new users |
| **Appeal admin dashboard** | Simple web admin for moderators to review/approve/deny appeals |
| **Report admin queue** | Same dashboard: view reports, investigate, resolve |
| **Audit logging** | Track all admin actions on appeals and score adjustments |
| **Flagged workout notifications** | In-app indicator on home screen for flagged workouts |

**Exit criteria:** Implausible workout flagged → user notified → appeals → admin reviews → outcome applied.

---

### Phase 4B — Leaderboards & Rankings (1 session)

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Personal leaderboards** | Ranked-eligible users appear on leaderboards. Top 100 by trophies. | "Local and national leaderboards" |
| **Rank name refresh** | Rename ranks to be more gym-culture themed (consider: Rookie → Iron → Steel → Titan → Apex → Demon Slayer) | "Names from noob to demon slayer" |
| **Materialized views** | Precompute leaderboard positions, refresh on schedule | Performance |

**Exit criteria:** Ranked-eligible users see their position on leaderboard. Rank names feel "gamey."

---

### Phase 5A — Character & Visual Identity (3+ sessions)

The most visible gap from the original idea. Requires art assets.

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Character art pipeline** | Commission/generate illustrated character sprites at multiple levels (5-10 tiers) | "In-game character" that gains "muscles or items" |
| **Character on home screen** | Replace emoji with illustrated character that evolves with level | Core home experience |
| **Character state** | Show character working out (during active session), resting, sleeping (inactive >6hrs) | "Character model displayed as working out, sleeping, or other" |
| **Gym arena visual** | Background illustrations for each arena tier | "Gym arena environment" |
| **Specialization appearance** | Cardio-focused users' characters look leaner/runner-built. Strength-focused look more muscular. Based on workout type distribution. | "For cardio specializers users character may..." |
| **Character on profile** | Show character + gym arena when viewing any profile | "Character model + gym arena environment" on profiles |

**Exit criteria:** Character visually evolves with level, shows correct state, reflects workout specialization.

---

### Phase 5B — Device Integration & Cardio Depth (3 sessions)

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **HealthKit adapter** | iOS: read heart rate, step count, GPS route from Apple Health | "Connect to apple watch" |
| **Health Connect adapter** | Android: equivalent integration | Other GPS/HR devices |
| **Live GPS tracking** | Real-time route recording during scout workouts | "Cardio will track territory" |
| **Territory heatmap** | Visualize ground covered on a map. Encourage exploring new routes. | "Users are encouraged to cover more ground" |
| **Heart rate zone classification** | Use maxHR from biodata to classify zones (1-5). Different scoring for zone-2 vs HIIT intensity. | HIIT vs zone-2 differentiation |
| **Verified cardio tier** | Device-connected runs get higher confidence bonus (+0.15 instead of +0.10). Show "verified run" badge. | "Cardio devices will be required" for full verification |

**Exit criteria:** Apple Watch connected → live GPS tracking → route shown on map → HR zones displayed → verified runs get higher trust.

---

### Phase 5C — Shop & Monetization (2 sessions)

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Shop screen** | Browse cosmetics: costumes, gym items, themes | "Buy cosmetics like costumes, gym environment items" |
| **Cosmetic inventory UI** | View owned items, equip to character/gym | Inventory management |
| **Crate system** | Purchasable crates with random cosmetic items. Cosmetic-only. | "Crate system to unlock rare items" |
| **GymPass** | Seasonal cosmetic progression track with free/premium tiers | Seasonal monetization |
| **XP boosts (NOT score boosts)** | Purchasable 2x XP boosts that affect rank progression only, NOT trophies, NOT clan war contribution. Clearly labeled. | "Power ups that may grant 2x points" (MODIFIED — XP only, not competitive) |
| **Subscription flow** | RevenueCat integration for premium tier | Premium features |

**XP Boost Design Decision:** The original idea mentions "2x points power-ups." Selling competitive score multipliers would destroy fairness — the #1 reason competitive games lose players. Instead: **2x XP boosts** affect only rank display progression, NOT trophies, NOT clan war scores. This preserves the progression fantasy without breaking competition.

**Exit criteria:** Shop functional → can buy/open crates → equip cosmetics → XP boost works → clearly doesn't affect competitive scoring.

---

### Phase 5D — Social & Chat (2 sessions)

| Task | Detail | Idea Gap Addressed |
|------|--------|--------------------|
| **Cross-clan war chat** | Real-time chat between warring clans during active wars | "Crossclan chat where clans can communicate" |
| **Video evidence upload** | Upload workout verification videos (strength). View others' videos. | "Upload videos of their workouts to verify each set" |
| **Clan war role specialization** | Members declare cardio/strength/flex role. Affects war objectives and scoring bonuses. | "Select a specific role such as cardio specializer" |
| **Chat moderation** | Report messages, auto-filter, rate limiting | Safety for chat |

**Exit criteria:** Chat works during wars → video uploads work → roles affect scoring → moderation prevents abuse.

---

### Phase 6 — Launch Prep

| Task | Detail |
|------|--------|
| Push notifications | War results, daily goals, streak reminders, appeal outcomes |
| Onboarding polish | Animated transitions, tutorial hints |
| Performance optimization | Query optimization, image caching, bundle size |
| App Store / Play Store prep | Screenshots, metadata, review compliance |
| E2E test suite | Critical user flows automated |

---

## What's Deferred Indefinitely

| Feature | Reason |
|---------|--------|
| 3D world / Unity-style gameplay | Scope creep, not needed for core fantasy |
| Real-time multiplayer | Async wars serve the competitive need |
| Nutrition tracking | Separate product domain |
| Clan gifting economy | Marketplace complexity |
| Friends/followers social graph | Clans cover social need |
| Community jury / peer review | Admin review is sufficient for scale |

---

## Design Conflict Resolution

### 2x Points Power-Ups

**Original idea:** "Power ups that may grant 2x points"
**Product principle:** "No purchases that affect competitive outcomes"

**Resolution:** 2x **XP** boosts (cosmetic rank progression only). Never 2x trophies. Never 2x clan war contribution. Clearly communicated to users. This preserves the monetization opportunity without destroying fairness.

### Device Requirement for Cardio Verification

**Original idea:** "Cardio devices will be required" for clan war verification
**Product principle:** "Must motivate average users, not only elites"

**Resolution:** Device connection gives **higher confidence score** (better trust bonus), not a hard gate. Manual cardio entries still contribute to wars at lower confidence. This avoids excluding users who can't afford wearables while rewarding verified data.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Day-1 retention | >40% | Users who log a workout on first day |
| Day-7 retention | >25% | Users active 7 days after sign-up |
| Avg workouts/week (active users) | >3 | Server workout count per user |
| Clan participation rate | >60% | Members contributing during active war |
| Appeal rate | <2% | Flagged workouts / total workouts |
| False positive rate | <0.5% | Approved appeals / total flagged |
| Guest → Registered conversion | >30% | Guest users who sign up within 7 days |
| Biodata completion rate | >50% | Registered users who complete biodata |
