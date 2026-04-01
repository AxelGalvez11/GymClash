# GymClash — Alignment Report: Original Idea vs Current Build

## How to Read This

- **ALIGNED** — the idea is implemented or spec'd correctly
- **PARTIALLY ALIGNED** — the concept exists but is incomplete or simplified
- **GAP** — the idea describes something not yet in the spec or code
- **DESIGN CONFLICT** — the idea contradicts a product principle we've set

---

## 1. Account & Onboarding

| Idea | Current State | Verdict |
|------|--------------|---------|
| Users can skip account creation | Auth is required. Guest mode deferred to Phase 5. | **GAP** — needs to move earlier |
| Onboarding collects age, weight, height, gender, experience | Onboarding collects only display name. Biodata is prompted after first workout. | **PARTIALLY ALIGNED** — the data is collected, but later than the idea describes |
| Lifting onboarding asks for 1RM | 1RM is tracked after workouts via Brzycki estimation. No upfront 1RM input. | **GAP** — spec should add optional 1RM input during biodata |
| Cardio onboarding calculates VO2max / max heart rate from age | Not implemented or spec'd anywhere. | **GAP** — new feature needed |
| App creates a profile and calculates workout trajectory | Normalization uses 30-day rolling average. No explicit trajectory prediction. | **PARTIALLY ALIGNED** — rolling average serves similar purpose but isn't a forward-looking trajectory |
| Unverified = missing biodata. Verified = biodata + connected device (cardio) or realistic data (lifting) | Spec has 4 tiers (Guest/Registered/Verified/Ranked-eligible). Verified = biodata complete. No device requirement for verified status. | **PARTIALLY ALIGNED** — spec is simpler, idea wants device connection for cardio verification |

### What Needs Work
- Move guest mode to Phase 2B instead of Phase 5
- Add optional 1RM input fields to biodata screen (bench, squat, deadlift)
- Add VO2max estimation from age + resting HR to biodata
- Add `lifting_experience` and `running_experience` fields to biodata (spec says this, code doesn't have it)
- Consider requiring device connection for "verified cardio" status

---

## 2. Home Screen & Character

| Idea | Current State | Verdict |
|------|--------------|---------|
| Home shows character, gym arena, trophies, option to initiate workout | Home shows arena header with trophies, stat cards, and workout CTAs. No visible character model. | **PARTIALLY ALIGNED** — arena/trophies are there, character is emoji-only |
| Character gains muscles / items as user levels up | Not implemented. Only emoji placeholders. | **GAP** — Phase 5 feature, needs art pipeline |
| Cardio specializers' characters may look different | Not in spec at all. | **GAP** — interesting concept, needs design |
| Character displayed as "working out, sleeping, or other" | Not in spec. | **GAP** — character state system |

### What Needs Work
- Character visual system remains Phase 5 (needs art assets)
- Add character state concept to spec (working out during active session, resting otherwise)
- Add specialization visual differentiation to character design spec

---

## 3. Strength Workout Loop

| Idea | Current State | Verdict |
|------|--------------|---------|
| Search for exercise types | Exercise picker with 10 common + custom search. Implemented. | **ALIGNED** |
| Input reps and weight per set | Set-by-set input with NumberInput. Implemented. | **ALIGNED** |
| Bodyweight exercises use user's own bodyweight | Not implemented. All exercises require weight input. | **GAP** — needs bodyweight exercise detection |
| "Add set 2" button with diminishing returns beyond sets 1-3 | Diminishing returns exist (sets 1-5 full, 6-10 half, 11+ minimal). Idea says 1-3. | **PARTIALLY ALIGNED** — current thresholds are more generous, which is better for real training |
| Score based on matching/exceeding predicted volume | Scoring compares against 30-day rolling average (normalization). | **PARTIALLY ALIGNED** — rolling average serves this purpose |
| Character levels up after EACH exercise | Level-up shown only after workout completion. | **GAP** — per-exercise feedback missing |
| Diminishing returns for exercises beyond human volume limits | Tonnage plausibility check (50,000 kg cap), density check (40 sets/hr). | **ALIGNED** |
| Users can upload videos to verify each set | Not implemented. Appeals are text-only. | **GAP** — video evidence is Phase 5+ |

### What Needs Work
- Add bodyweight exercise detection (pushups, pullups, dips → auto-fill with user's body_weight_kg)
- Add per-exercise score feedback during active workout (show points earned after each exercise, not just at end)
- Video upload for workout verification → Phase 5

---

## 4. Cardio Workout Loop

| Idea | Current State | Verdict |
|------|--------------|---------|
| Connect to Apple Watch / GPS / HR devices | Mock health adapter only. HealthKit/Health Connect not integrated. | **GAP** — Phase 5 |
| Track "territory" — encouraged to cover more ground | Not implemented or spec'd beyond distance tracking. | **GAP** — territory mapping system |
| Treadmill users asked for HR device, can skip but get fewer points | Low-confidence scoring for manual entry handles this. Treadmill isn't explicitly differentiated. | **PARTIALLY ALIGNED** — the confidence system serves this purpose |
| HIIT receives similar points to longer zone-2 | HIIT earns via pace multiplier, zone-2 via distance. Both score well. | **ALIGNED** conceptually, no explicit HIIT detection |
| Cardio devices required for clan war verification | Spec allows manual entry for clan wars (with lower confidence). Idea is stricter. | **DESIGN CONFLICT** — making devices mandatory for wars would exclude many users |

### What Needs Work
- Territory tracking system (heatmap of covered ground) → Phase 5+
- Explicit HIIT workout type with interval-based scoring → Phase 5
- Consider "verified cardio" tier for device-connected runs with higher war contribution

---

## 5. Clan System

| Idea | Current State | Verdict |
|------|--------------|---------|
| Join clans, compete for trophies/rewards | Full clan lifecycle: create/join/leave, weekly wars, trophies. | **ALIGNED** |
| Clan wars with collective lifting + cardio goals | War score uses 4-component formula (output, participation, consistency, diversity). | **ALIGNED** |
| Individual contributions level self + clan war | Workouts earn personal XP + clan contribution. Implemented. | **ALIGNED** |
| View others' profiles, character model, gym arena | Profile viewing exists. No character model or gym arena on profiles. | **PARTIALLY ALIGNED** |
| Cross-clan chat during wars | Not implemented. Deferred to post-MVP. | **GAP** — significant social feature |
| Users can see each other's lifting videos | Not implemented. | **GAP** — needs video infrastructure |
| Leader, co-leader, members | Leader, officer, member. Aligned (co-leader = officer). | **ALIGNED** |
| Clans may request war with specific clans | Only random matchmaking exists. | **GAP** — directed war challenges |
| Clan war type selection (cardio-only, lifting-only, or both) | Only mixed wars exist. | **GAP** — war type variants |
| Clan war role specialization (cardio specializer, lifting specializer) | Not in spec. | **GAP** — interesting concept |
| Report cheating by viewing others' stats/videos | Report system exists. No video viewing. | **PARTIALLY ALIGNED** |

### What Needs Work
- Directed war challenges (clan A challenges clan B) → Phase 3B
- War type variants (strength-only, cardio-only, mixed) → Phase 3B
- Cross-clan chat → Phase 5 (moderation infrastructure needed)
- War role specialization → Phase 5 (needs design — how does it affect scoring?)

---

## 6. Item Shop & Monetization

| Idea | Current State | Verdict |
|------|--------------|---------|
| Buy cosmetics (costumes, gym items) | Schema exists. No shop UI. | **PARTIALLY ALIGNED** — stubbed |
| **2x points power-ups** | **EXPLICITLY FORBIDDEN** by product principles. | **DESIGN CONFLICT** |
| Crate system for rare items | Spec allows cosmetic-only crates. | **ALIGNED** with guardrail |

### Design Conflict: 2x Points Power-Ups

The original idea includes "power ups that may grant 2x points." The product spec explicitly forbids this:

> "Not Allowed in Ranked Competition: Items that multiply trophies or competitive score. Direct 2x point power-ups for ranked outcomes."

**Resolution options:**
1. **Keep the ban** (recommended) — 2x points power-ups destroy competitive integrity and make the game feel pay-to-win. This is the #1 reason competitive games lose players.
2. **Cosmetic-only boosts** — "2x XP for appearance/cosmetic progression" that doesn't affect trophies or clan wars. XP only affects rank display, not competitive scoring.
3. **Earned boosts only** — 2x points as a streak reward or achievement unlock, never purchasable.

**Recommendation:** Option 2 or 3. Never sell competitive score multipliers.

---

## 7. Ranking System

| Idea | Current State | Verdict |
|------|--------------|---------|
| Trophy-based ranking | Trophy system with arena tiers. Implemented. | **ALIGNED** |
| Local and national leaderboards | Not implemented. Deferred to Phase 5. | **GAP** |
| Rank names "from noob to demon slayer" | Current ranks: Bronze/Silver/Gold/Platinum/Diamond/Champion. | **PARTIALLY ALIGNED** — names are gym-adjacent but not as flavorful as the idea |
| Rank-based clan war matchmaking | Matchmaking uses member count + recent performance. | **ALIGNED** |

### What Needs Work
- Consider renaming ranks to be more "gym culture" themed:
  - Current: Bronze → Silver → Gold → Platinum → Diamond → Champion
  - Idea vibe: Rookie → Iron → Steel → Titan → Apex → Demon Slayer
- Leaderboards → Phase 4B

---

## 8. Anti-Cheat

| Idea | Current State | Verdict |
|------|--------------|---------|
| Math formulas for verification | Full confidence model with tonnage/density/speed/pace checks. | **ALIGNED** |
| Verification system | 5-tier validation status, server-authoritative. | **ALIGNED** |
| Device-based verification for cardio | Trust hierarchy with source bonuses. Mock adapter only for now. | **PARTIALLY ALIGNED** |

### What Needs Work
- Anti-cheat is the strongest part of the implementation. Main gap is actual device integration (Phase 5).

---

## 9. UI / Art Direction

| Idea | Current State | Verdict |
|------|--------------|---------|
| "Gamey" — Clash Royale / Fortnite energy | Dark mode, bold accents, arena theming, rank badges. | **PARTIALLY ALIGNED** — aesthetic is right but UI is functional, not yet "gamey" |
| Character model on home screen | Emoji placeholders only. | **GAP** |
| Gym arena environment | Arena tier names and accent colors. No visual environment. | **GAP** |

### What Needs Work
- Character art pipeline (illustrated assets) → Phase 5
- Consider more animated transitions, particle effects for level-ups → Phase 5
- Sound effects for score events → Phase 5

---

## Critical Bugs Found in Audit

These must be fixed before any deployment:

| # | Bug | Impact |
|---|-----|--------|
| B1 | Active recovery workouts fail DB CHECK constraint (`workout_data_check` doesn't include `active_recovery` type) | Active recovery submissions crash |
| B2 | `finalize-wars` never awards clan war trophies to members (+30 win, -15 loss constants exist but are unused) | Wars complete but trophies never change |
| B3 | Home screen shows wrong war score when user's clan is clan_b (fallback chaining bug) | Confusing war display |
