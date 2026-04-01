# GymClash — Product Specification

## Vision

**Train in real life. Level up your character. Upgrade your gym. Help your clan win.**

GymClash is a native mobile fitness app that converts real-world workouts into RPG progression and clan competition. Users log weightlifting and running sessions, earn validated scores, evolve a visible character and gym identity, and contribute to weekly asynchronous clan wars.

The emotional promise: a fusion of fitness tracking, competitive clan progression, collectible identity, ranked trophies, and live-service game energy.

The app must feel like a competitive game — not a generic fitness tracker.

---

## Target User

People motivated by:
- **Structure** — defined goals, clear progression paths
- **Progression** — leveling, XP, rank advancement, character evolution
- **Streaks** — daily consistency tracking with visible rewards
- **Ranks** — competitive standing among peers
- **Competition** — weekly wars, leaderboards, win/loss records
- **Team identity** — belonging to a clan, contributing to collective goals
- **Visual identity** — character appearance, gym environment, cosmetic status

**Critical constraint**: The app must work for beginners, casual athletes, and inconsistent users. A beginner who shows up 5 days a week must feel more rewarded than an elite who shows up once. Scoring must motivate average users, not only peak performers.

---

## Core Loop

1. User completes a real workout (strength or running)
2. Workout is submitted with evidence (sensor data, GPS, manual entry)
3. Server validates the workout and assigns a confidence score
4. User earns personal score, XP, trophies, and progression
5. Character appearance and gym environment evolve with level
6. Validated score contributes to user's clan in the active weekly war
7. Weekly war progress updates — user sees their impact
8. User returns to maintain streak, improve rank, help clan win, and unlock cosmetics

---

## Product Principles

1. **Fairness is more important than complexity.** Simple, transparent rules beat clever systems that feel arbitrary.
2. **Consistency matters more than raw genetic advantage.** Showing up 5 days beats one monster session.
3. **Personal improvement is the primary scoring axis.** Baseline progression rewards effort, not genetics.
4. **Competition must motivate beginners, not only elites.** Normalized scoring ensures everyone can contribute.
5. **Anti-cheat is core infrastructure, not a side feature.** Leaderboard trust is the foundation.
6. **The first-time experience must be understood in under 2 minutes.** No tutorial walls.
7. **Do not make the app feel adversarial or punitive.** Flagged workouts get clear explanations and fair appeals.
8. **Monetization must not feel pay-to-win.** No purchases that affect competitive outcomes.
9. **The fantasy should feel game-like, but the UX must remain clean and usable.** Bold dark-mode aesthetic, clear information hierarchy.

---

## Account Model

### Tiers

| Tier | Requirements | Capabilities |
|------|-------------|-------------|
| **Guest** | None — launches app | Explore UI, log up to 5 workouts locally, see demo data. No server sync, no profile, no clan. |
| **Registered** | Email/password sign-up | Save progress, create profile, log unlimited workouts, join clans, earn XP and trophies. |
| **Verified** | Registered + biodata complete (birth date, gender, height, weight, experience levels) | Scores use personal baseline normalization. Eligible for leaderboard display. Profile shows verified badge. |
| **Ranked-eligible** | Verified + 10 validated workouts + 14 days of history | Full clan war contribution. Appears on national/local leaderboards. Eligible for seasonal rewards. |

### Rules
- Guest users can explore and log limited workouts locally. On sign-up, local workouts are offered for server submission.
- Verified status unlocks once biodata is submitted. Biodata can be completed at any time (prompted after first workout, available in settings).
- Ranked-eligible status is computed server-side from workout history. No manual action required.
- Demographic data is **not** the primary scoring engine. It's used for safety ranges, baseline initialization context, and profile display. **Personal baseline progression** is the main fairness system.

---

## Onboarding

### Flow (2 steps)

**Step 1: Name**
- Collect display name (required, max 20 chars)

**Step 2: Ready**
- Show starting stats (Bronze rank, Level 1)
- CTA: "Enter the Arena"

### Biodata Collection (deferred, prompted)

After the user's first workout, prompt to complete biodata for score personalization. Also accessible in Settings > Biodata at any time.

**Collected fields:**
| Field | Type | Used For |
|-------|------|----------|
| Birth date | Date | Safety ranges, age-group context |
| Biological sex | Enum (male/female/prefer not to say) | Baseline initialization only |
| Height (cm) | Number | BMI context for safety ranges |
| Weight (kg) | Number | Bodyweight-relative scoring context |
| Lifting experience | Enum (beginner/intermediate/advanced) | Initial baseline calibration |
| Running experience | Enum (beginner/intermediate/advanced) | Initial baseline calibration |

**Optional (prompted later):**
- Estimated 1RM for major lifts (bench, squat, deadlift)
- Resting heart rate
- Connected wearable data

### Rule
Biodata is used to initialize baselines for new users who have no workout history. After 5+ workouts, the user's own history replaces demographic-derived baselines entirely.

---

## Scoring Philosophy

The app does **not** reward only raw output. Scoring combines:
- **Workout effort** — volume, distance, intensity
- **Consistency** — streak bonus rewards daily commitment
- **Personal baseline progression** — relative improvement matters
- **Validation confidence** — low-evidence workouts contribute less
- **Diminishing returns** — unrealistic volume spam is penalized

### Strength Scoring

Users log: exercise type, sets, reps, weight (kg), bodyweight movements when relevant.

**Raw score:**
```
raw_score = Σ (sets × reps × weight_kg) per exercise
```
With diminishing volume per exercise:
- Sets 1–5: 1.0x (full credit)
- Sets 6–10: 0.5x (half credit)
- Sets 11+: 0.1x (minimal credit — discourages junk volume)

The system:
- Scores meaningful effort proportional to total tonnage
- Compares performance against the user's 30-day rolling baseline
- Reduces rewards for implausible volume spam
- Reduces rewards past a per-exercise fatigue threshold

### Cardio (Scout) Scoring

Users log: run type, distance, time, pace. GPS and heart rate when available.

**Raw score:**
```
raw_score = distance_km × pace_multiplier × 100
```

**Pace multiplier:**
- Base: 6:00/km → 1.0x
- Faster → higher (capped at 1.5x for ~3:30/km elite pace)
- Slower → lower (floor 0.5x for 12:00+/km walk pace)
- Formula: `min(1.5, max(0.5, 6.0 / max(pace, 3.0)))`

The system:
- Rewards verified movement — distance is the primary driver
- Gives pace a moderate bonus/penalty (a slow 10km still scores well)
- Supports outdoor and treadmill flows
- Lower trust/score for low-evidence cardio (manual treadmill entry)
- HIIT and zone-2 both earn meaningful credit through different mechanisms (HIIT via pace multiplier, zone-2 via distance accumulation)

### Score Modifiers

Applied after raw score:

| Modifier | Type | Range | Purpose |
|----------|------|-------|---------|
| Participation bonus | Additive | +50 pts | Floor contribution for any completed workout |
| Streak bonus | Multiplicative | 0–15% | Rewards daily consistency (linear ramp over 30 days) |
| Confidence multiplier | Multiplicative | 0.0–1.0 | Anti-cheat gate |

**Final score:**
```
final = (raw + participation_bonus) × (1 + streak_bonus) × confidence_multiplier
```

### Baseline Normalization

Raw scores are normalized against the user's rolling 30-day average:
```
relative_component = clamp(raw / baseline, 0.5, 2.0)
normalized = raw × 0.6 + relative_component × population_median × 0.4
```

- 60% from actual output (rewards strong performers)
- 40% from relative effort (rewards personal improvement)
- New users use population median until they have 5+ workouts

**Design intent**: A beginner who works hard relative to their ability contributes meaningfully. An advanced user still benefits from absolute output. Neither can exploit trivially.

### Active Recovery

Users can log recovery sessions (stretching, yoga, mobility):
- Minimum duration: 10 minutes
- Earns reduced score (participation bonus only)
- Maintains streak
- Does not contribute to clan war competitive scoring

---

## Character and Gym Progression

### Home Experience

The home screen shows:
- Player character (emoji-based for MVP, illustrated in later phases)
- Gym arena / environment (themed by arena tier)
- Trophy count with progress bar to next arena
- Rank badge
- Level and XP progress
- CTA to start a workout

### Arena System

Trophy-based progression through themed environments:

| Arena | Min Trophies | Visual Theme |
|-------|-------------|-------------|
| Rustyard | 0 | Grimy garage gym |
| Iron Forge | 300 | Industrial warehouse |
| Titan Vault | 700 | Grand marble arena |
| Apex Colosseum | 1,200 | Legendary tournament hall |

### Trophy Rewards

| Action | Trophies |
|--------|----------|
| Accepted workout | +12 |
| Low-confidence workout | +8 |
| Daily goal complete | +6 |
| Active recovery | +4 |
| Clan war win | +30 |
| Clan war loss | -15 |
| Missed day (no activity decay) | -5 |

### Character Evolution (Phase 5+)

As users level up:
- Character appearance improves (gear, outfit, effects)
- Gym environment evolves (equipment, lighting, banners)
- Cosmetics unlock through seasons, achievements, and shop

This is cosmetic/status-forward, never pay-to-win.

---

## Workout Loop

### Strength Loop
1. User taps "Strength" on home screen
2. Selects/searches exercise name
3. Enters sets, reps, weight per exercise
4. App shows provisional score estimate (client-side, for UX)
5. User adds more exercises or ends session
6. Session submitted → server validates → authoritative score assigned
7. XP, trophies, and streak updated
8. Clan war contribution calculated if applicable

### Scout (Running) Loop
1. User taps "Run" on home screen
2. App connects to GPS when available
3. User completes run (manual entry or tracked)
4. Enters distance, duration (GPS fills automatically when available)
5. Session submitted → server validates → authoritative score assigned
6. Same progression flow as strength

### Active Recovery Loop
1. User taps "Active Recovery"
2. Timer starts (minimum 10 minutes)
3. Ends session → streak maintained, minimal trophies earned
4. No clan war competitive contribution

---

## Clan System

### Capabilities
- Join a clan (one clan per user, enforced by database constraint)
- Create a clan (name, tag, description)
- View clan profile, roster, and rank
- See member contributions in active war
- Leave clan (cooldown period)

### Roles
| Role | Permissions |
|------|-----------|
| Leader | Full management, transfer leadership, promote/demote, edit clan |
| Officer | Invite members, moderate chat (future) |
| Member | Contribute workouts, view war status |

### Clan Wars

**Structure:**
- Weekly asynchronous battles (Monday 00:00 UTC → Sunday 23:59 UTC)
- Matchmaking based on similar member count and recent performance
- Each clan matched against one opponent per week

**War Score Formula:**
```
war_score = total_output × 0.30
          + participation_rate × 0.30
          + consistency_score × 0.20
          + diversity_score × 0.20
```

| Component | Definition | Range |
|-----------|-----------|-------|
| total_output | Sum of all members' capped contributions, normalized | 0–1 |
| participation_rate | Active members / total members | 0–1 |
| consistency_score | Avg days active per member / 7 | 0–1 |
| diversity_score | 0.5 per workout type represented (strength + scout) | 0–1 |

**Per-User Contribution Cap:**
- Daily cap: 500 points (full credit)
- Above cap: 25% of overflow
- Weekly hard cap: 20,000 points
- Prevents single-user carry — 10 casuals > 1 whale

**Design intent:** Both lifters and runners matter equally. Casual members contribute meaningfully. Showing up daily beats one massive session. Raw output still matters but can't dominate.

### Seasons
- ~10 weeks per season
- Season end: rank soft-reset (drop 1 tier), cosmetic rewards distributed
- Configurable scoring multipliers and special objectives per season

---

## Rankings

### Trophy-Based Progression
- Trophies earned/lost through gameplay (see Trophy Rewards table)
- Arena tier determined by trophy count
- Progress bar shows distance to next arena

### Leaderboards
- **Clan leaderboard** — clans ranked by war record and total trophies
- **Local leaderboard** — top players in geographic region (Phase 5)
- **National leaderboard** — top players nationally (Phase 5)

Only ranked-eligible users (verified + 10 workouts + 14 days) appear on personal leaderboards.

### Rank System (XP-based)
| Rank | Min XP | Color |
|------|--------|-------|
| Bronze | 0 | #CD7F32 |
| Silver | 1,000 | #C0C0C0 |
| Gold | 3,000 | #FFD700 |
| Platinum | 7,000 | #E5E4E2 |
| Diamond | 15,000 | #B9F2FF |
| Champion | 30,000 | #FF6B6B |

---

## Monetization

### Allowed
- Cosmetics: character skins, gym environment items, themes
- Clan customization: banners, badges
- Seasonal pass ("GymPass"): cosmetic progression track
- Subscription tier: deeper analytics, premium cosmetics, quality-of-life features (extra workout history, detailed charts)
- Non-competitive convenience items

### Not Allowed in Ranked Competition
- Items that multiply trophies or competitive score
- Direct 2x point power-ups for ranked outcomes
- Pay-to-win boosts that affect clan wars or ladders
- Paying to skip anti-cheat or appeal queues

### Guardrail
If crate/loot systems are introduced, they must be cosmetic-only. No competitive advantage from any purchase.

---

## Anti-Cheat System

Anti-cheat is core infrastructure. The competitive experience depends on leaderboard trust.

### Trust Hierarchy

| Level | Source | Trust Bonus |
|-------|--------|------------|
| 5 | Device/wearable verified data | +0.10 |
| 4 | Sensor-supported mobile data | +0.05 |
| 3 | Gym machine / photo evidence | +0.00 |
| 2 | Manual entry | +0.00 |
| 1 | Edited or disputed entry | -0.10 |

### Confidence Model

Every workout gets a confidence score (0.0–1.0):
```
base_confidence = 0.9 + source_trust_bonus
final_confidence = clamp(base_confidence + Σ check_impacts, 0, 1)
```

### Validation Status

| Status | Confidence | Meaning |
|--------|-----------|---------|
| `accepted` | ≥ 0.8 | Full credit for personal score and clan |
| `accepted_with_low_confidence` | 0.6–0.8 | Full personal, reduced clan visibility |
| `excluded_from_clan_score` | 0.4–0.6 | Personal XP only |
| `held_for_review` | 0.2–0.4 | No credit until review |
| `rejected` | < 0.2 or critical fail | No credit |

### Strength Checks
| Check | Detects | Threshold | Severity |
|-------|---------|-----------|----------|
| Tonnage plausibility | Impossible volume | >50,000 kg/session | Critical |
| Workout density | Too many sets/hour | >40 sets/hour | Critical |
| Rest intervals | Impossibly short rests | <15s avg between sets | Critical |
| Tonnage spike | Sudden volume increase | >200% of 30-day avg | Warning |
| 1RM plausibility | Unrealistic weight jump | >125% of stored best | Warning |
| Progression jump | Unrealistic progression | Future: tracking | Warning |

### Scout Checks
| Check | Detects | Threshold | Severity |
|-------|---------|-----------|----------|
| Impossible speed | Driving/biking | >25 km/h sustained | Critical |
| Pace sanity | Implausible pace | <2.4 or >20 min/km | Warning |
| Route sanity | Distance/duration mismatch | >1 min/km discrepancy | Warning |
| GPS spoofing | Spoof patterns | Future: location analysis | Critical |
| Pace-cadence mismatch | Fake GPS with no steps | Future: step data | Warning |

### Appeal Flow
1. User notified when workout is flagged
2. Clear display of which checks failed
3. User can submit text appeal describing why flag is incorrect
4. Appeals enter admin review queue
5. Statuses: pending → under_review → approved/denied
6. If approved, workout reinstated with full credit

### Reporting
Users can report suspicious entries from other profiles:
- Categories: impossible_stats, suspected_spoofing, inappropriate_behavior, other
- Reports are signals, not automatic convictions
- Reporter reputation tracked internally
- Rate-limited (5/day)

### Key Rule
Not every workout needs perfect proof. But ranked and clan-critical scoring weights validation confidence. The system works at every integration level — manual entry on day 1, progressively more trustworthy as sensor integrations are added.

---

## Social Systems

### MVP
- Inspect other player profiles (rank, level, arena, clan)
- Report suspicious activity
- Clan roster with contribution visibility

### Deferred
- Cross-clan chat
- Friends/followers
- Direct messaging
- Video evidence in appeals
- Community jury moderation

---

## UX / Art Direction

### Aesthetic
- **Dark mode first** — premium competitive aesthetic
- **Bold and high contrast** — readable in gym lighting
- **Rank-forward dashboard** — rank and trophies always visible
- **Live-service game feel** — not a medical/health app
- **Clean enough for daily use** — obvious CTA hierarchy, polished empty states

### Design Tokens
- Brand purple (#6C5CE7) as accent
- Zinc/neutral surfaces with clear borders
- One accent color per context (danger red for strength, blue for scout, green for recovery)
- Geist-style monospace for stats, sans-serif for UI text

### Layout Principles
- Clear tab structure (Home, Clan, Profile)
- Stat cards with consistent spacing
- Shared component patterns (cards, badges, action rows)
- Empty states with clear CTAs (no blank screens)
- Information hierarchy: what you did → what you earned → what to do next
