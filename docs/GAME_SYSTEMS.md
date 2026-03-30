# GymClash — Game Systems Design

## Scoring Model

### Raw Score Calculation

**Strength (lifting)**
```
raw_score = Σ (sets × reps × weight_kg) per exercise
```
This is total volume (tonnage) — the standard training metric for strength work.

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
- Streak bonus amplifies stronger workouts more (multiplicative)
- Confidence multiplier gates everything through anti-cheat (0 = fully rejected)

### Baseline Normalization

Raw scores are normalized against the user's rolling 30-day average:

```
relative_component = clamp(raw / baseline, 0.5, 2.0)
normalized = raw × 0.6 + relative_component × population_median × 0.4
```

- 60% of score comes from actual output (rewards strong performers)
- 40% comes from relative effort (rewards beginners who push hard)
- New users use population median as their baseline

**Design intent**: A beginner who works hard relative to their ability contributes meaningfully. An advanced user still benefits from absolute output. Neither can exploit the system trivially.

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

- XP earned from validated workouts (final_score → XP at ~1:1 ratio)
- Rank decay: lose XP for extended inactivity (>14 days without a workout)
- Rank is visible everywhere — profile, clan roster, leaderboards

---

## Streak System

- Counter increments for each day with at least one validated workout
- **Grace period**: 1 missed day does not reset the streak
- Bonus ramp: 0% at day 0 → 15% at day 30 (linear)
- Streak is displayed prominently on dashboard

| Streak Days | Bonus |
|-------------|-------|
| 0 | 0% |
| 7 | 3.5% |
| 14 | 7% |
| 30+ | 15% (max) |

---

## Clan Wars

### Structure
- Weekly asynchronous battles (Monday 00:00 UTC → Sunday 23:59 UTC)
- Each clan is matched against one opponent per week
- Matchmaking based on similar member count and recent performance

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

- Daily cap: 500 points (before diminishing returns)
- Above cap: only 25% of overflow counts
- Prevents single-user carry — 10 casuals > 1 whale

### Design Intent

- Both lifters and runners matter equally (diversity score)
- Casual members contribute meaningfully (participation weight)
- Showing up daily beats one massive session (consistency weight)
- Raw output still matters but can't dominate (30% weight, with cap)

---

## Seasons

- Duration: ~10 weeks per season
- Season end: ranks soft-reset (drop 1 tier), cosmetic rewards distributed
- Each season can have unique modifiers or themed objectives
- Season config stored in DB — tunable without code changes
