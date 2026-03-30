# GymClash — MVP Scope

## In Scope for MVP

- Lifting (strength) workout logging
- Running (scout) workout logging
- Personal profile with rank, level, XP, streaks
- Daily and weekly score generation
- Clans (create, join, leave)
- Weekly clan battles (async)
- Automated anti-cheat checks (server-side)
- Lightweight review and appeal flow
- Subscription + cosmetics structure (stubbed, not full economy)
- Dark mode UI with competitive RPG aesthetic

## Out of Scope for MVP

- Nutrition tracking as a full subsystem
- Human jury / community review system
- Complex item shop or marketplace
- Clan gifting economy
- Advanced social graph (friends, followers, messaging)
- Advanced wearable integrations beyond typed adapter interfaces
- PvP battle animation systems
- 3D world or Unity-style gameplay
- Real-time multiplayer features
- Platform-specific native modules (HealthKit, Health Connect) — interfaces only

## Phase Breakdown

### Phase 1 — Foundation ✅ (Current)
- Product and architecture documentation
- Data model proposal
- Expo app scaffold with routing, theme, NativeWind
- Shell screens (landing, login, dashboard, clan, profile, review/appeal)
- Pure TypeScript logic modules (scoring, validation, anti-cheat)
- Unit tests with >80% coverage

### Phase 2 — Core Workout Flow
- Full workout logging UI (strength sets, run tracking)
- Supabase backend setup (tables, RLS, edge functions)
- Real authentication flow (email/password, magic link)
- Workout submission pipeline (client → server validation)
- Server-authoritative score calculation
- Profile data hydration from server
- Offline workout draft persistence and sync

### Phase 3 — Clan System
- Clan CRUD (create, join, leave, manage)
- Clan roster and member management
- Weekly clan war matchmaking
- War score aggregation (server-side)
- War progress dashboard
- Clan leaderboards
- Contribution tracking per member

### Phase 4 — Anti-Cheat Pipeline
- Server-side validation edge functions
- Confidence scoring pipeline
- Flagged workout notification system
- Appeal submission and admin review queue
- Reporting system with reputation tracking
- Rate limiting on submissions

### Phase 5 — Polish & Monetization
- Cosmetic inventory and display
- Season system with rewards
- Subscription gate (RevenueCat or similar)
- Push notifications
- Onboarding flow refinement
- Performance optimization
- App Store / Play Store preparation
