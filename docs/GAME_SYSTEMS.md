# GymClash — Game Systems Design

## Scoring Model

### Design Goals
- Beginners can progress without elite numbers
- Advanced users still feel rewarded
- Personal improvement matters more than raw output
- Fake or low-confidence entries contribute less or not at all in ranked systems
- Consistency beats one-time peak performance
- Diminishing returns prevent volume spam

### Raw Score Calculation

**Strength (lifting)**
```
raw_score = Σ (sets × reps × weight_kg) per exercise
```
Total volume (tonnage) — the standard training metric. Applied with diminishing returns per exercise:
- Sets 1–5: 1.0x (full credit)
- Sets 6–10: 0.5x (half credit)
- Sets 11+: 0.1x (minimal credit — discourages junk volume)

Fatigue threshold: after a believable volume threshold per session, additional work earns progressively less. This prevents unrealistic marathon sessions from dominating scores.

**Scout (running)**
```
raw_score = distance_km × pace_multiplier × 100
```
The ×100 factor brings scout scores into a comparable range with strength scores.

### Pace Multiplier (Scout)
- Base pace: 6:00/km → multiplier 1.0
- Faster → higher multiplier (capped at 1.5 for ~3:30/km elite pace)
- Slower → lower multiplier (floor at 0.5 for 12:00+/km walk pace)
- Formula: `min(1.5, max(0.5, 6.0 / max(pace, 3.0)))`

**Design intent**: Distance is the primary driver. Pace provides a moderate bonus/penalty. A slow 10km still scores well — we reward showing up and covering ground.

**HIIT vs zone-2**: Both earn meaningful credit through different mechanisms. HIIT earns through pace multiplier (faster pace = higher multiplier per km). Zone-2 earns through distance accumulation (more time = more km covered). Neither dominates.

**Active Recovery**
- Fixed score: participation bonus only (50 points)
- No raw score calculation
- Streak maintenance only
- Does not contribute to clan war competitive scoring

### Score Modifiers

Applied after raw score calculation:

| Modifier | Type | Range | Purpose |
|----------|------|-------|---------|
| Participation bonus | Additive | +50 pts | Floor contribution for any completed workout |
| Streak bonus | Multiplicative | 0–15% | Rewards daily consistency |
| Confidence multiplier | Multiplicative | 0.0–1.0 | Anti-cheat gate |

**Final score formula:**
```
final = (raw + participation_bonus) × (1 + streak_bonus) × confidence_multiplier
```

- Participation bonus ensures beginners get meaningful scores even with light workouts
- Streak bonus amplifies stronger workouts more (multiplicative on larger base)
- Confidence multiplier gates everything through anti-cheat (0 = fully rejected)

### Baseline Normalization

The primary fairness mechanism. Raw scores are normalized against the user's personal rolling 30-day average:

```
relative_component = clamp(raw / baseline, 0.5, 2.0)
normalized = raw × 0.6 + relative_component × population_median × 0.4
```

- **60%** of score comes from actual output (rewards strong performers)
- **40%** comes from relative effort against personal baseline (rewards improvement)
- New users use population median as their baseline until they have 5+ workouts

**Baseline initialization with biodata**: When a verified user has completed biodata but has < 5 workouts, the initial baseline is informed by experience level (beginner/intermediate/advanced). This provides a fairer starting point than raw population median. After 5+ workouts, the user's own history replaces this entirely.

**Design intent**: A beginner who works hard relative to their ability contributes meaningfully. An advanced user still benefits from absolute output. Neither can exploit the system trivially. Personal improvement always matters.

### Biodata Rules

Demographic data (age, sex, height, weight, experience) is **not** the primary scoring engine.

**Used for:**
- Safety ranges (flag impossible lifts for body type)
- Initial baseline calibration for new verified users
- Profile display
- 1RM plausibility context

**Not used for:**
- Direct score multipliers based on demographics
- Score penalties based on body type
- Competitive advantage from demographic characteristics

### Score Contribution to XP

XP earned from validated workouts at approximately 1:1 ratio with final_score. XP determines rank (see Rank System below).

---

## Rank System

| Rank | Min XP | Color |
|------|--------|-------|
| Bronze | 0 | #CD7F32 |
| Silver | 1,000 | #C0C0C0 |
| Gold | 3,000 | #FFD700 |
| Platinum | 7,000 | #E5E4E2 |
| Diamond | 15,000 | #B9F2FF |
| Champion | 30,000 | #FF6B6B |

- XP earned from validated workouts (final_score → XP at ~1:1)
- Rank calculated server-side: `floor(xp thresholds)`
- Level: `floor(xp / 1000) + 1`
- Rank is visible everywhere — profile, clan roster, leaderboards, home dashboard
- Season end: soft-reset (drop 1 tier)

---

## Arena System (Trophy-Based)

Trophies are the visible competitive currency. Arena tier is determined by trophy count.

| Arena | Min Trophies | Badge | Accent | Visual Theme |
|-------|-------------|-------|--------|-------------|
| Rustyard | 0 | 🔩 | #8B7355 | Grimy garage gym |
| Iron Forge | 300 | ⚒️ | #C0C0C0 | Industrial warehouse |
| Titan Vault | 700 | 🏛️ | #FFD700 | Grand marble arena |
| Apex Colosseum | 1,200 | 🏆 | #FF6B6B | Legendary tournament hall |

### Trophy Rewards

| Action | Trophies |
|--------|----------|
| Accepted workout | +12 |
| Low-confidence accepted workout | +8 |
| Daily goal complete | +6 |
| Active recovery | +4 |
| Clan war win | +30 |
| Clan war loss | -15 |
| Missed day decay (>1 day inactive) | -5 |

---

## Streak System

- Counter increments for each day with at least one validated workout
- **Grace period**: 1 missed day does not reset the streak (but earns no streak credit)
- Bonus ramp: 0% at day 0 → 15% at day 30 (linear)
- Streak is displayed prominently on home dashboard

| Streak Days | Bonus |
|-------------|-------|
| 0 | 0% |
| 7 | 3.5% |
| 14 | 7% |
| 30+ | 15% (max) |

---

## Daily Goals

Each day, users receive a goal:

| Goal Type | Description | Trophy Reward |
|-----------|-----------|---------------|
| `complete_any_workout` | Log any validated workout | +6 trophies |
| `strength_intensity` | Hit X% of a specific lift's 1RM | +6 trophies |

Daily goals reset at midnight UTC. Trophy reward is one-time per day.

---

## Clan Wars

### Structure
- Weekly asynchronous battles (Monday 00:00 UTC → Sunday 23:59 UTC)
- Each clan is matched against one opponent per week
- Matchmaking: similar member count + recent performance + arena distribution
- Minimum 3 members to participate in wars

### War Score Formula

```
war_score = total_output × 0.30
          + participation_rate × 0.30
          + consistency_score × 0.20
          + diversity_score × 0.20
```

| Component | Definition | Range |
|-----------|-----------|-------|
| total_output | Normalized sum of all members' capped contributions / max across active wars | 0–1 |
| participation_rate | Active members / total members | 0–1 |
| consistency_score | Avg days active per member / 7 | 0–1 |
| diversity_score | 0.5 per workout type represented (strength + scout) | 0–1 |

### Per-User Contribution Cap

- **Daily cap**: 500 points (full credit before cap)
- **Above daily cap**: 25% of overflow counts (diminishing returns)
- **Weekly hard cap**: 20,000 points (no credit beyond)

**Design intent**: 10 casuals > 1 whale. Prevents single-user carry.

### War Result

- Winner: clan with higher total war_score
- Tie: both clans get reduced trophy reward
- Win: +30 trophies per member
- Loss: -15 trophies per member

### Design Intent

- Both lifters and runners matter equally (diversity score)
- Casual members contribute meaningfully (participation weight)
- Showing up daily beats one massive session (consistency weight)
- Raw output still matters but can't dominate (30% weight, with cap)
- Every member can make a meaningful contribution

---

## Seasons

- Duration: ~10 weeks per season
- Season end:
  - Ranks soft-reset (drop 1 tier)
  - Cosmetic rewards distributed based on final rank/arena
  - Season stats archived
- Each season can have:
  - Unique scoring multipliers (e.g., 1.2x scout scoring)
  - Themed objectives
  - Special double-XP events
- Season config stored in DB — tunable without code changes

---

## Character & Identity Progression (Phase 5)

### Current (MVP)
- Emoji-based character representation
- Arena tier determines environment theme
- Rank badge is the primary visual identity marker

### Planned
- Illustrated character that evolves with level
- Gym environment customization (equipment, lighting, banners)
- Equipped cosmetics visible to other players
- Character appearance unlocks at level milestones
- Gym items earned through seasons, achievements, and shop

### Cosmetic Categories
| Type | Examples |
|------|---------|
| Badge | Season completion, achievement unlocks |
| Theme | Profile color scheme, dashboard accent |
| Title | "Iron Will", "Marathon Master", "War Chief" |
| Clan Banner | Custom clan visual identity |
| Character Skin | Outfit, gear, effects (Phase 5) |
| Gym Item | Equipment, decorations, lighting (Phase 5) |

All cosmetics are status/visual only. No competitive advantage from any cosmetic.
