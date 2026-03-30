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

## Client / Server Authority Split

This is a competitive app. **The client is never the final authority** for ranking, clan contribution, or anti-cheat outcomes.

### Client Responsibilities
- Collect workout input (sets, reps, weight, GPS data)
- Display provisional local score estimates for instant UX feedback
- Cache active workout session state (Zustand)
- Submit workout evidence to server
- Render validation results and appeal states
- Manage UI navigation and local preferences

### Server Responsibilities
- **Authoritative** score calculation (raw + modifiers + normalization)
- Anti-cheat validation (all checks run server-side)
- Workout acceptance / hold / rejection decisions
- Clan war score aggregation
- Rank and XP updates
- Report handling and appeal state transitions
- Idempotency enforcement (prevent duplicate submissions)

### Implementation
Server-authoritative logic will run as:
- **Supabase Edge Functions** (Deno) for complex validation pipelines
- **PostgreSQL functions / RPCs** for atomic score updates and aggregations
- **Row Level Security (RLS)** for data access control

## Folder Structure

```
GymClash/
├── app/                    # Expo Router screens
│   ├── (auth)/             # Unauthenticated screens
│   │   ├── landing.tsx     # Onboarding / CTA
│   │   └── login.tsx       # Login / signup
│   ├── (app)/              # Authenticated screens (tabs)
│   │   ├── home.tsx        # Dashboard
│   │   ├── clan.tsx        # Clan tab
│   │   ├── profile.tsx     # Profile tab
│   │   └── review/         # Workout review / appeal
│   └── _layout.tsx         # Root layout (auth gate, providers)
├── components/             # Reusable UI components
│   └── ui/                 # Base primitives
├── lib/                    # Pure TypeScript logic (no React)
│   ├── scoring/            # Score calculation, normalization
│   ├── validation/         # Anti-cheat checks, confidence
│   └── health/             # Health adapter interfaces
├── stores/                 # Zustand stores
│   ├── auth-store.ts       # Auth session state
│   └── workout-store.ts    # Active workout session
├── services/               # External service clients
│   ├── supabase.ts         # Supabase client
│   └── query-client.ts     # TanStack Query client
├── types/                  # Shared TypeScript types
├── constants/              # Theme tokens, game config
├── hooks/                  # Custom React hooks
├── __tests__/              # Test files (mirrors lib/ structure)
└── docs/                   # Documentation
```

## State Management Strategy

### TanStack Query — Server State
All data that originates from the server:
- User profile (rank, XP, streaks)
- Workout history
- Clan data and war status
- Validation results
- Appeal status

**Patterns:**
- `staleTime: 60s` for most queries
- Optimistic updates for workout submission
- Automatic retry (2 attempts)
- Cache invalidation on mutation success

### Zustand — Local State
Transient state that doesn't need server persistence:
- Active workout session (sets being logged, timer, distance)
- Auth session (from Supabase listener)
- UI preferences

**Patterns:**
- No persistence middleware for MVP (future: AsyncStorage persistence for offline drafts)
- Idempotency key generated at workout start
- Store resets on workout completion or discard

## Offline Strategy

Mobile fitness apps must handle poor connectivity gracefully.

### Design
1. **Active workout**: Zustand holds the full session in memory. If the app closes mid-workout, the session is lost (MVP simplification). Phase 2 adds AsyncStorage persistence.
2. **Workout submission**: TanStack Query mutations handle retry automatically. Idempotency keys prevent duplicate submissions even if the user taps "submit" multiple times or the network drops.
3. **Data freshness**: Queries use `staleTime: 60s` and refetch on app foreground. Users see slightly stale data rather than loading spinners.
4. **No offline-first for competitive data**: Scores, ranks, and clan contributions are never computed offline and presented as final. Only provisional estimates are shown.

## Health / Sensor Integration

### Approach
Native health integrations (HealthKit, Health Connect) require Expo development builds and native entitlements. For MVP, we define typed interfaces and use mock implementations.

### Interfaces
```typescript
interface HealthAdapter {
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  collectEvidence(start: string, end: string): Promise<WorkoutEvidenceData>;
}
```

### Implementation Plan
1. **MVP**: `mockHealthAdapter` — returns empty evidence, workouts rely on manual input
2. **Phase 2**: iOS HealthKit adapter using `expo-health` or `react-native-health`
3. **Phase 3**: Android Health Connect adapter
4. **Future**: Apple Watch companion, wearable direct sync

### Trust Model
The anti-cheat confidence model is designed to work at every integration level:
- Manual entry gets lowest baseline confidence (0.9)
- Sensor data gets moderate boost (+0.05)
- Wearable verified data gets highest boost (+0.10)

This means the app is functional from day 1 with manual entry, and progressively more trustworthy as integrations are added.

## Security Boundaries

- No secrets in client bundle — only `EXPO_PUBLIC_` prefixed env vars
- Supabase anon key is safe for client (RLS enforces access)
- Server validates all competitive data — client submissions are evidence, not verdicts
- Rate limiting on workout submissions (server-side)
- Idempotency keys prevent replay attacks
- Auth tokens managed by Supabase SDK (auto-refresh, secure storage)
