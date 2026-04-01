# GymClash — Architecture

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React Native (Expo SDK 54) | Cross-platform mobile |
| Routing | Expo Router v6 | File-based navigation |
| Language | TypeScript (strict) | Type safety |
| Styling | NativeWind v4 (Tailwind CSS) | Utility-first styling |
| Backend | Supabase | Auth, PostgreSQL, Edge Functions, Storage |
| Server State | TanStack Query v5 | Caching, sync, retry |
| Local State | Zustand v5 | Session state, offline drafts |
| Testing | Jest + jest-expo | Unit and integration tests |

---

## Client / Server Authority Split

This is a competitive app. **The client is never the final authority** for ranking, scoring, clan contribution, or anti-cheat outcomes.

### Client Responsibilities

| Domain | What the Client Does |
|--------|---------------------|
| **Data collection** | Captures workout input (sets, reps, weight, GPS data, duration) |
| **Provisional feedback** | Shows instant score estimates using `lib/scoring/` — these are **never trusted** by the server |
| **Session management** | Manages active workout state (Zustand), generates idempotency keys |
| **Evidence submission** | Packages workout data + evidence → sends to server |
| **Display** | Renders server-authoritative data (scores, ranks, validation results, appeal states) |
| **Navigation** | Manages UI flow, local preferences, onboarding state |
| **Offline UX** | Shows stale data rather than loading spinners; retries mutations automatically |

### Server Responsibilities

| Domain | What the Server Does |
|--------|---------------------|
| **Score calculation** | Authoritative raw score → modifiers → normalization → final score |
| **Anti-cheat validation** | All checks run server-side in Edge Functions |
| **Workout acceptance** | Sets validation_status: accepted / held / rejected |
| **Confidence scoring** | Aggregates evidence trust levels into confidence_score |
| **Clan war scoring** | Aggregates contributions with caps, computes 4-component war score |
| **Rank and XP** | Updates XP, recalculates rank and level |
| **Streak tracking** | Computes streak with grace period |
| **Trophy awards** | Awards/deducts trophies, sets arena tier |
| **Report handling** | Manages report queue, tracks reporter reputation |
| **Appeal resolution** | State transitions, score recalculation on approval |
| **Idempotency** | Prevents duplicate workout submissions |
| **Rate limiting** | Max 20 workouts/day, max 5 reports/day |

### Implementation

Server-authoritative logic runs as:
- **Supabase Edge Functions** (Deno): validation pipeline, scoring, war management
- **PostgreSQL functions / RPCs** (SECURITY DEFINER): atomic score updates, clan operations, streak calculation
- **Database triggers**: profile creation, member count maintenance, rate limiting, updated_at
- **Row Level Security (RLS)**: data access control — clients can never write server-derived fields
- **Cron jobs (pg_cron)**: war matchmaking (weekly), war finalization, season transitions, streak decay

---

## Folder Structure

```
GymClash/
├── app/                         # Expo Router screens
│   ├── (auth)/                  # Unauthenticated flow
│   │   ├── _layout.tsx          # Auth stack layout
│   │   ├── landing.tsx          # Landing page with Get Started / Sign In
│   │   ├── login.tsx            # Login/signup with mode param + forgot password
│   │   └── onboarding/
│   │       └── index.tsx        # 2-step onboarding (name → ready)
│   ├── (app)/                   # Authenticated flow (tab navigator)
│   │   ├── _layout.tsx          # Tab bar (Home, Clan, Profile)
│   │   ├── home.tsx             # Arena dashboard, stats, quick actions, recent workouts
│   │   ├── clan.tsx             # Clan tab (join/create/manage, war status)
│   │   ├── profile.tsx          # Profile tab (stats, history link, settings)
│   │   ├── history/
│   │   │   └── index.tsx        # Full workout history with filters
│   │   ├── workout/
│   │   │   ├── strength.tsx     # Strength logging flow
│   │   │   ├── scout.tsx        # Run logging flow
│   │   │   ├── recovery.tsx     # Active recovery timer
│   │   │   └── [workoutId].tsx  # Workout detail (scores, breakdown, validation)
│   │   ├── review/
│   │   │   └── [workoutId].tsx  # Flagged workout review + appeal
│   │   ├── report/
│   │   │   └── [userId].tsx     # Report user form
│   │   └── settings/
│   │       └── biodata.tsx      # Biodata entry (height, weight, experience, etc.)
│   ├── _layout.tsx              # Root layout (auth gate, providers, splash)
│   └── index.tsx                # Redirect to appropriate screen
├── components/                  # Reusable UI components
│   └── ui/                      # Base primitives (SetRow, NumberInput, etc.)
├── lib/                         # Pure TypeScript logic (no React dependencies)
│   ├── scoring/                 # Score calculation, normalization, clan contribution
│   │   ├── raw-score.ts         # Strength + scout raw score with diminishing returns
│   │   ├── modifiers.ts         # Participation bonus, streak bonus, confidence multiplier
│   │   ├── normalization.ts     # Baseline normalization against 30-day rolling avg
│   │   └── clan-contribution.ts # Per-user daily/weekly caps with diminishing returns
│   ├── validation/              # Anti-cheat checks, confidence scoring
│   │   ├── index.ts             # Reason code labels, severity map, exports
│   │   ├── strength-checks.ts   # Tonnage, density, rest, spike, 1RM checks
│   │   ├── scout-checks.ts      # Speed, pace, route sanity checks
│   │   └── confidence.ts        # Confidence calculation from check results
│   └── health/                  # Health/sensor adapter interfaces
│       ├── types.ts             # HealthAdapter interface definition
│       └── mock-adapter.ts      # Mock implementation (returns empty evidence)
├── stores/                      # Zustand stores
│   ├── auth-store.ts            # Auth session state (from Supabase listener)
│   └── workout-store.ts         # Active workout session, timer, draft state
├── services/                    # External service clients
│   ├── supabase.ts              # Supabase client (anon key only)
│   ├── api.ts                   # All RPC calls + TanStack mutation wrappers
│   └── query-client.ts          # TanStack Query client config
├── hooks/                       # Custom React hooks
│   ├── use-profile.ts           # Profile data + needs-onboarding check
│   ├── use-workouts.ts          # Workout list + workout detail
│   ├── use-clan.ts              # Clan data, war status, roster, search
│   ├── use-daily-goal.ts        # Daily goal state
│   ├── use-1rm.ts               # Personal best tracking
│   └── use-onboarding.ts        # Onboarding completion check
├── types/                       # Shared TypeScript types
│   └── index.ts                 # All domain types (Workout, Profile, Clan, etc.)
├── constants/                   # Theme tokens, game config
│   └── theme.ts                 # Colors, Rank tiers, Arena tiers, GameConfig, TrophyRewards
├── __tests__/                   # Test files (mirrors lib/ structure)
├── docs/                        # Product and architecture documentation
└── supabase/                    # Supabase project (migrations, edge functions)
    ├── migrations/              # SQL migration files (001–004+)
    └── functions/               # Edge functions (validate-workout, etc.)
```

---

## State Management Strategy

### TanStack Query — Server State

All data originating from the server:
- User profile (rank, XP, streaks, trophies, arena tier)
- Workout history and individual workout detail
- Clan data, roster, and war status
- War contributions
- Validation results
- Daily goals
- Appeal/report status

**Patterns:**
- `staleTime: 30s–5min` depending on data volatility
- Optimistic updates for workout submission UX
- Automatic retry (2 attempts)
- Cache invalidation on mutation success
- Refetch on app foreground

### Zustand — Local State

Transient state that doesn't need server persistence:
- Active workout session (exercises being logged, timer, distance tracking)
- Auth session (from Supabase auth state listener)
- UI preferences

**Patterns:**
- Idempotency key generated at workout start
- Store resets on workout completion or discard
- Phase 2: AsyncStorage middleware for crash recovery of in-progress workouts

---

## Offline Strategy

Mobile fitness apps must handle poor connectivity gracefully.

1. **Active workout**: Zustand holds the full session in memory. Phase 2 adds AsyncStorage persistence for crash recovery.
2. **Workout submission**: TanStack Query mutations retry automatically. Idempotency keys prevent duplicates.
3. **Data freshness**: Queries use staleTime and refetch on foreground. Users see slightly stale data rather than loading spinners.
4. **No offline-first for competitive data**: Scores, ranks, and clan contributions are never computed offline and presented as final. Only provisional estimates are shown with clear "pending" indicators.

---

## Health / Sensor Integration

### Approach

Native health integrations (HealthKit, Health Connect) require Expo dev builds + native entitlements. MVP uses typed interfaces with mock implementations.

### Interface
```typescript
interface HealthAdapter {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  collectEvidence(start: string, end: string): Promise<WorkoutEvidenceData>;
}
```

### Rollout
1. **MVP**: `mockHealthAdapter` — workouts rely on manual input
2. **Phase 5**: iOS HealthKit adapter (`expo-health` or `react-native-health`)
3. **Phase 5**: Android Health Connect adapter
4. **Future**: Apple Watch companion, wearable direct sync

### Trust Model Integration

The anti-cheat confidence model works at every level:
- Manual entry: baseline confidence 0.9
- Sensor data: +0.05 bonus
- Wearable verified: +0.10 bonus

App is functional from day 1 with manual entry. Trust improves progressively as integrations are added.

---

## Security Boundaries

- No secrets in client bundle — only `EXPO_PUBLIC_` prefixed env vars
- Supabase anon key is safe for client (RLS enforces access)
- Service role key used only in Edge Functions and cron jobs — never exposed to client
- Server validates all competitive data — client submissions are evidence, not verdicts
- Rate limiting: 20 workouts/day, 5 reports/day (enforced by database triggers + RPCs)
- Idempotency keys prevent replay attacks and duplicate submissions
- Auth tokens managed by Supabase SDK (auto-refresh, secure storage)
- SECURITY DEFINER RPCs restrict mutations to validated server-side operations
- No direct UPDATE policies on server-derived fields (XP, rank, scores, validation status)
