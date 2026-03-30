# GymClash — Product Specification

## Vision

**Train in real life. Level up in game. Help your clan win.**

GymClash is a native mobile fitness app that turns real-world training into RPG progression and clan competition. Users complete real workouts (lifting and running), earn validated scores, level up their profile, and contribute to weekly clan wars.

The app should feel like a competitive live-service game — not a generic fitness tracker.

## Target User

People who are motivated by:
- **Structure** — defined goals, clear progression paths
- **Progression** — leveling, XP, rank advancement
- **Streaks** — daily consistency tracking with visible rewards
- **Ranks** — competitive standing among peers
- **Competition** — weekly wars, leaderboards, win/loss records
- **Team identity** — belonging to a clan, contributing to collective goals

**Critical constraint**: The app must also work for beginners, casual athletes, and inconsistent users. Do not optimize only for top performers. A beginner who shows up 5 days a week should feel more rewarded than an elite who shows up once.

## Core Loop

1. User completes a real workout (strength or running)
2. Workout is submitted with evidence (sensor data, GPS, manual entry)
3. Server validates the workout and assigns a confidence score
4. User earns personal score, XP, and progression
5. Validated score contributes to the user's clan in the active weekly war
6. Weekly clan war progress updates in real-time
7. User sees immediate visual impact of their contribution
8. User returns to maintain streak, improve rank, and help clan win

## Product Principles

1. **Fairness is more important than complexity.** Simple, transparent rules beat clever systems that feel arbitrary.
2. **Consistency should matter more than raw genetic advantage.** Showing up 5 days beats one monster session.
3. **Competition must feel motivating for beginners, not only elites.** Normalized scoring ensures everyone can contribute.
4. **Anti-cheat is core infrastructure, not a side feature.** Leaderboard trust is the foundation of the competitive experience.
5. **The first-time user experience must be easy to understand in under 2 minutes.** No tutorial walls.
6. **Do not make the app feel adversarial or punitive.** Flagged workouts get clear explanations and fair appeals.
7. **Monetization must not feel pay-to-win.** No purchases that affect competitive outcomes.

## Monetization

### Allowed
- Subscription tier for deeper analytics, premium cosmetics, quality-of-life features
- Seasonal cosmetic progression (badges, themes, titles)
- Profile themes, clan banners, custom badges

### Not Allowed
- Direct power boosts that change competitive fairness
- Purchases that inflate war contribution or scores
- Pay-to-win rank manipulation
- Paying to skip anti-cheat or appeal queues

## UX Direction

- **Dark mode first** — premium competitive aesthetic
- **Bold rank-forward UI** — rank and level are always visible
- **High contrast** — readable in gym lighting conditions
- **Stat cards** — clear information hierarchy
- **Live-service game feel** — not a medical/health app aesthetic
- **Sleek, not cluttered** — every screen has a clear purpose

The user should always understand:
- What they did
- What they earned
- How they helped their clan
- What to do next
