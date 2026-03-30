# GymClash

Competitive fitness RPG mobile app. Real workouts → game progression → clan competition.

## Tech Stack
- React Native with Expo SDK 54
- Expo Router (file-based routing)
- TypeScript (strict mode)
- NativeWind v4 (Tailwind CSS for React Native)
- Supabase (auth, PostgreSQL, edge functions, storage)
- TanStack Query (server state)
- Zustand (local/session state)
- Jest (testing)

## Project Structure
```
app/              Expo Router screens and layouts
  (auth)/         Auth screens (landing, login)
  (app)/          Main app screens (home, clan, profile)
    review/       Workout review/appeal screens
components/       Reusable UI components
  ui/             Base UI primitives (themed)
lib/              Core logic modules (pure TypeScript, no React)
  scoring/        Score calculation, normalization, clan contribution
  validation/     Anti-cheat checks, confidence scoring
  health/         Health/sensor adapter interfaces
stores/           Zustand stores (auth, workout session)
hooks/            Custom React hooks
services/         Supabase client, query client
types/            Shared TypeScript types
constants/        Theme tokens, game config, enums
docs/             Product specs, architecture docs
__tests__/        Unit and integration tests
```

## Key Architecture Decisions

### Server Authority
The server is authoritative for all competitive data: scores, ranks, clan contributions, anti-cheat outcomes. The client shows provisional estimates for UX but never determines final competitive state.

### Scoring
- Strength: sets × reps × weight, then normalized
- Scout: distance × pace_multiplier, then normalized
- Modifiers: streak bonus, participation bonus, confidence multiplier
- Per-user daily contribution caps prevent single-user clan carry

### State Management
- TanStack Query: all server-synced data (profile, workouts, clan, wars)
- Zustand: active workout session, local UI state, offline drafts

### Anti-Cheat
Every workout gets a confidence_score (0.0–1.0) and validation_status. Anti-cheat is server-side. Client submits evidence; server validates.

## Commands
```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm test           # Run Jest tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run with coverage report
npx expo install   # Install Expo-compatible package versions
```

## Conventions
- Dark mode first, light mode secondary
- All competitive logic in lib/ (pure TS, no React deps)
- UI components use NativeWind className prop
- Server-derived fields never written by client
- Idempotency keys on all workout submissions
- Typed adapter interfaces for native integrations not yet built
- Immutable data patterns — create new objects, don't mutate

## Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=        # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon key (safe for client)
```

## Docs
See /docs/ for product spec, game systems, anti-cheat design, data model, and architecture.
