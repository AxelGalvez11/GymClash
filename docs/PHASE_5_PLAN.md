# Phase 5 — Detailed Implementation Plan

## Overview

Phase 5 is where GymClash goes from "functional competitive app" to "polished game-like experience." The two lowest-scoring areas — **Character/Visual (20%)** and **Shop/Monetization (10%)** — get the most attention. Device integration, social features, and local leaderboards round out the remaining gaps.

**Total effort:** ~10 sessions (can be parallelized across 2 developers)
**Prerequisite:** Phases 2A–4 deployed and smoke-tested on real Supabase instance

---

## Current Alignment Scores → Phase 5 Targets

| Area | Current | Target | Delta |
|------|---------|--------|-------|
| Workout logging | 95% | 100% | +5% (GPS tracking, territory, video) |
| Scoring engine | 98% | 100% | +2% (HR zones, HIIT detection) |
| Anti-cheat | 98% | 100% | +2% (HealthKit, Health Connect) |
| Clan system | 95% | 100% | +5% (role specialization) |
| Account model | 90% | 100% | +10% (device-verified tier) |
| Character/visual | 20% | 85% | +65% (art, states, specialization) |
| Shop/monetization | 10% | 90% | +80% (shop, crates, subscription) |
| Social | 55% | 85% | +30% (chat, video, profiles) |
| Leaderboards | 80% | 100% | +20% (local/national) |

---

## 5A: Character & Visual Identity (3 sessions)

### Session 5A.1: Character Asset Pipeline + Home Integration

**Goal:** Replace emoji placeholders with real character art on the home screen.

#### Art Assets Needed

The character system needs **sprite sets** — not 3D models. These can be generated with AI art tools (Midjourney, DALL-E, Flux) and cleaned up in Figma.

| Asset | Spec | Count |
|-------|------|-------|
| Character base | Full-body figure, transparent PNG, 512×512px | 1 per build type × 6 level tiers = 18 |
| Build types | Balanced, Strength-focused (muscular), Cardio-focused (lean) | 3 |
| Level tiers | Lv 1-5 (basic), 6-15 (equipped), 16-30 (geared), 31-50 (elite), 51-75 (legendary), 76+ (mythic) | 6 |
| Character states | Working out (animated), Resting (idle), Sleeping (night) | 3 poses per base |
| Gym arena BGs | Rustyard, Iron Forge, Titan Vault, Apex Colosseum | 4 backgrounds, 1080×720px |

**Task breakdown:**

1. **Generate character sprites** — Use AI art tool with consistent style prompt. Create 3 build types × 6 level tiers = 18 base sprites. Store as `assets/characters/{build}_{tier}.png`.

2. **Create `CharacterDisplay` component**
   ```
   components/ui/CharacterDisplay.tsx
   Props: level, workoutDistribution (strength% vs cardio%), state ('active'|'resting'|'sleeping')
   Logic:
   - tier = level-to-tier mapping
   - buildType = strength% > 60% → 'strength' : cardio% > 60% → 'cardio' : 'balanced'
   - Select sprite: characters/{buildType}_{tier}.png
   - state affects pose overlay (future: animated)
   ```

3. **Create `ArenaBackground` component**
   ```
   components/ui/ArenaBackground.tsx
   Props: tier (ArenaTier)
   Renders: full-width background image for the arena tier
   ```

4. **Integrate into home screen** — Replace the arena header's emoji with `CharacterDisplay` + `ArenaBackground` behind the stats.

5. **Add workout distribution to profile** — Server-side: add `strength_workout_count` and `scout_workout_count` to profile (or compute from workouts). Client: pass ratio to `CharacterDisplay`.

#### Migration 012: Character Support
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS strength_workout_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scout_workout_count integer NOT NULL DEFAULT 0;
```
Update `validate-workout` to increment the appropriate counter on accepted workouts.

**Exit criteria:** Home screen shows illustrated character on arena background, character build type reflects workout distribution.

---

### Session 5A.2: Character State + Profile Integration

**Goal:** Character shows correct state (active/resting/sleeping) and appears on other profiles.

1. **Character state logic**
   - `active`: user has an in-progress workout (check `useWorkoutStore.isActive`)
   - `sleeping`: last workout > 12 hours ago AND current time is 10pm–6am local
   - `resting`: all other states

2. **Integrate into profile screen** — Replace the user icon circle with `CharacterDisplay`

3. **Integrate into public profile** — `player/[userId].tsx` shows character with their build type and level

4. **Integrate into clan roster** — Small character thumbnail next to each member name

**Exit criteria:** Character state is visually correct, characters show on all profile views.

---

### Session 5A.3: Cosmetic Overlay System

**Goal:** Equippable cosmetics change character appearance.

1. **Cosmetic overlay system** — Equipped cosmetics render as layers on top of the base character sprite. Each cosmetic is a transparent PNG overlay at the same 512×512 resolution.

2. **Equipped cosmetics on profile** — Read from `cosmetic_inventory` where `equipped = true` (add column), render as overlays.

3. **Migration 013: Equipped cosmetics**
   ```sql
   ALTER TABLE cosmetic_inventory ADD COLUMN IF NOT EXISTS equipped boolean DEFAULT false;
   ```

4. **Equip/unequip RPC** — Toggle `equipped` for a cosmetic. Max 1 per slot (title, badge, character skin).

**Exit criteria:** Equipped cosmetics visually change character appearance.

---

## 5B: Device Integration & Cardio Depth (3 sessions)

### Session 5B.1: HealthKit (iOS) + Health Connect (Android)

**Goal:** Real health data feeds into the anti-cheat confidence model.

**Dependencies:** Requires Expo development build (not Expo Go). Need to configure:
- iOS: `expo-health` or `react-native-health` + HealthKit entitlement
- Android: `react-native-health-connect` + permissions

1. **Install packages**
   ```bash
   npx expo install expo-health  # or react-native-health
   ```

2. **Implement `iosHealthAdapter`** in `lib/health/ios-adapter.ts`
   ```typescript
   // Implements HealthAdapter interface
   // collectEvidence() reads:
   //   - Heart rate samples during workout window
   //   - Step count during workout window
   //   - Active energy burned
   //   - Workout sessions (Apple's native workout object)
   ```

3. **Implement `androidHealthAdapter`** in `lib/health/android-adapter.ts`
   ```typescript
   // Same interface, reads from Health Connect:
   //   - Heart rate records
   //   - Steps records
   //   - Exercise sessions
   ```

4. **Platform detection** — In `lib/health/index.ts`:
   ```typescript
   import { Platform } from 'react-native';
   export const healthAdapter = Platform.OS === 'ios'
     ? iosHealthAdapter
     : Platform.OS === 'android'
     ? androidHealthAdapter
     : mockHealthAdapter;
   ```

5. **Integrate into workout submission** — After workout, call `healthAdapter.collectEvidence()`, attach results as `workout_evidence` with `evidence_type: 'wearable_sync'`, `trust_level` set by server.

6. **Update edge function** — Parse evidence data, award source bonus (+0.10 for wearable, +0.05 for sensor).

**Exit criteria:** Apple Watch HR data flows into confidence scoring. Android Health Connect works equivalently.

---

### Session 5B.2: Live GPS Tracking + Territory

**Goal:** Real-time GPS tracking during scout workouts with territory visualization.

1. **Install expo-location**
   ```bash
   npx expo install expo-location
   ```

2. **GPS tracking service** — `lib/health/gps-tracker.ts`
   ```typescript
   // startTracking(): begin background location updates (1 point per 5 seconds)
   // stopTracking(): return collected route points
   // Returns: LocationSample[] = { lat, lng, timestamp, speed, altitude }
   ```

3. **Update scout workout screen** — When GPS available:
   - Show live map (react-native-maps) with route being drawn
   - Auto-fill distance from GPS track
   - Auto-calculate pace from GPS speed
   - Show "GPS Active" indicator

4. **Territory heatmap** — New `app/(app)/territory.tsx` screen:
   - Aggregate all scout workout `route_points` from `workout.route_data`
   - Render heatmap overlay on map showing ground covered
   - "X km² explored" stat

5. **Verified cardio badge** — Device-connected runs get `source: 'sensor'` or `source: 'wearable'`, which the edge function already rewards with higher confidence (+0.05 / +0.10).

**Exit criteria:** Scout workout shows live route on map → distance auto-calculated → territory heatmap shows all covered ground.

---

### Session 5B.3: HR Zones + HIIT Detection

**Goal:** Heart rate zone classification and HIIT-specific scoring.

1. **HR zone calculation** — From biodata `max_heart_rate`:
   | Zone | % of Max HR | Label |
   |------|-------------|-------|
   | 1 | 50-60% | Recovery |
   | 2 | 60-70% | Fat burn |
   | 3 | 70-80% | Aerobic |
   | 4 | 80-90% | Threshold |
   | 5 | 90-100% | Max effort |

2. **Zone display during workout** — If HR data available, show current zone with color-coded indicator.

3. **HIIT workout type** — Add `'hiit'` to `WorkoutType` enum. HIIT scoring:
   - Based on time in Zone 4-5 (high intensity intervals)
   - `hiit_score = time_in_zone_4_5_minutes × intensity_multiplier × 50`
   - Where `intensity_multiplier = avg_zone_4_5_hr / max_hr` (effort relative to capacity)
   - HIIT scores in comparable range to zone-2 runs of similar effort

4. **Migration 014: HIIT support**
   ```sql
   ALTER TYPE workout_type ADD VALUE IF NOT EXISTS 'hiit';
   ```

5. **Update edge function** — Add HIIT validation and scoring path.

**Exit criteria:** HR zones display during workout → HIIT workout type scores comparably to zone-2 runs → zone data stored as evidence.

---

## 5C: Shop & Monetization (2 sessions)

### Session 5C.1: Shop Screen + Inventory + Crates

**Goal:** Users can browse, buy, and equip cosmetics.

1. **Cosmetic catalog table** — Migration 015:
   ```sql
   CREATE TABLE cosmetic_catalog (
     id text PRIMARY KEY,               -- e.g., 'skin_warrior_flame'
     name text NOT NULL,
     description text,
     cosmetic_type cosmetic_type NOT NULL,
     rarity text CHECK (rarity IN ('common','rare','epic','legendary')),
     price_coins integer,                -- NULL = not directly purchasable
     preview_url text,
     released_at timestamptz DEFAULT now()
   );
   ```

2. **In-app currency** — "Gym Coins" earned from:
   - Accepted workouts (+5 coins)
   - Clan war wins (+20 coins)
   - Daily goals (+3 coins)
   - Purchasable via IAP

3. **Shop screen** — `app/(app)/shop.tsx`:
   - Browse catalog by type (skins, badges, titles, gym items)
   - Rarity indicator (color-coded border)
   - Price display with "Buy" button
   - Preview image

4. **Inventory screen** — `app/(app)/inventory.tsx`:
   - View owned cosmetics
   - Equip/unequip buttons
   - Equipped items shown with checkmark

5. **Crate system** — `cosmetic_crates` table:
   - Crate types (Common, Rare, Epic) with different loot tables
   - Each crate defines weighted probability per item
   - Open crate → random cosmetic granted → animation
   - **Cosmetic-only** — no competitive items

6. **Tab bar update** — Add Shop tab (or accessible from profile)

**Exit criteria:** Browse shop → buy item → appears in inventory → equip → visible on character.

---

### Session 5C.2: GymPass + Subscription + XP Boosts

**Goal:** Seasonal progression track and premium features.

1. **GymPass** — Seasonal cosmetic progression track:
   - Free tier: 10 rewards (basic cosmetics)
   - Premium tier ($4.99): 30 rewards (exclusive cosmetics, coins, crate keys)
   - Progress via "GymPass XP" (earned from workouts, challenges, daily goals)
   - `gym_pass_progress` table tracking user's level in current season's pass

2. **RevenueCat integration**
   ```bash
   npx expo install react-native-purchases
   ```
   - Monthly subscription: "GymClash Premium" ($3.99/mo)
   - Premium features: detailed analytics, extra cosmetic slots, GymPass premium track
   - One-time purchases: crate packs, coin packs
   - GymPass premium unlock ($4.99 per season)

3. **XP boosts** — Purchasable items:
   - "2x XP Boost" (24 hours) — doubles XP gain only (NOT trophies, NOT clan contribution)
   - Earned from crates or purchased with coins
   - Clear labeling: "Affects rank progression only. Does not affect competitive scoring."
   - `active_boosts` table: user_id, boost_type, expires_at

4. **Update edge function** — Check for active XP boost, double the XP awarded by `increment_user_xp` if active. Never touch `final_score` or `contribution_points`.

**Exit criteria:** Subscribe → unlock premium → GymPass tracks progress → XP boost works and is clearly non-competitive.

---

## 5D: Social & Chat (2 sessions)

### Session 5D.1: Cross-Clan War Chat + Video Evidence

**Goal:** Clans can trash-talk during wars and users can verify lifts with video.

1. **War chat** — Real-time messaging during active wars:
   - `war_chat_messages` table: war_id, user_id, clan_id, content, created_at
   - RLS: only members of participating clans can read/write
   - Rate limit: 30 messages per hour per user
   - Supabase Realtime subscription for live updates

2. **Chat UI** — New `app/(app)/war-chat/[warId].tsx`:
   - Message list with clan-colored bubbles
   - Your clan = right-aligned, opponent = left-aligned
   - Auto-scroll to bottom
   - Report message button

3. **Chat moderation** — Basic:
   - Profanity filter (word list)
   - Rate limiting (30/hr)
   - Report message → admin queue
   - Text-only for MVP (no images/links to reduce abuse surface)

4. **Video evidence upload** — For strength workouts:
   - After workout, option to "Add Video Proof"
   - Record or pick from library (max 60 seconds, compressed)
   - Upload to Supabase Storage
   - Attach URL to `workout_evidence` with `evidence_type: 'photo'` (reuse existing type, or add `'video'`)
   - Viewable on workout detail screen by clan members

5. **Migration 016: Chat + video**
   ```sql
   CREATE TABLE war_chat_messages (...);
   ALTER TYPE evidence_type ADD VALUE IF NOT EXISTS 'video';
   ```

**Exit criteria:** Clans chat during active war → messages appear in real-time → video uploads work → videos viewable on workout detail.

---

### Session 5D.2: Role Specialization + Local/National Leaderboards

**Goal:** War role specialization and location-based leaderboards.

1. **War role specialization** — Members declare a role for clan wars:
   - `strength_specialist`: +20% contribution from strength workouts
   - `cardio_specialist`: +20% contribution from scout workouts
   - `flex`: no bonus, but contributes to diversity score
   - One role per war (set at war start, locked after first contribution)
   - Migration 017: `clan_war_member_roles` table

2. **Role UI** — In clan screen during active war:
   - "Choose Your Role" prompt on first workout of war week
   - Role badge next to member name in roster

3. **Local/national leaderboards** — Location-based ranking:
   - Add `country_code` and `region_code` to profiles (from device locale or manual selection)
   - Leaderboard filters: Global, National, Regional
   - New leaderboard views filtered by location
   - Migration 018: location columns + filtered views

4. **Settings for location** — In settings screen: country picker, region picker

**Exit criteria:** Set war role → role affects contribution bonus → leaderboards filter by location.

---

## Phase 6 — Launch Prep (2 sessions)

| Task | Detail | Session |
|------|--------|---------|
| **Push notifications** | `expo-notifications` — war start/end, daily goal reminder, streak at risk, appeal outcome, flagged workout | 6.1 |
| **Onboarding polish** | Animated character intro, smoother transitions, app tour overlay for first-time home screen | 6.1 |
| **Performance optimization** | FlatList optimization, image caching with expo-image, query deduplication, bundle size audit | 6.2 |
| **E2E test suite** | Playwright or Detox — critical flows: sign up, log workout, join clan, war cycle | 6.2 |
| **App Store / Play Store** | Screenshots, metadata, privacy policy, review compliance, Expo EAS Build setup | 6.2 |

---

## Dependency Graph

```
5A.1 (Character Art) ─────────────────────┐
5A.2 (Character State)  ← depends on 5A.1 │
5A.3 (Cosmetic Overlays) ← depends on 5A.1│
                                           │
5B.1 (HealthKit/HC) ──────────────────────┤ All 5A-5D are
5B.2 (GPS + Territory) ← can parallel 5B.1│ independent of
5B.3 (HR Zones + HIIT) ← depends on 5B.1 │ each other
                                           │
5C.1 (Shop + Crates) ────────────────────┤
5C.2 (GymPass + Sub) ← depends on 5C.1   │
                                           │
5D.1 (Chat + Video) ─────────────────────┤
5D.2 (Roles + Local LB) ← parallel 5D.1  │
                                           │
Phase 6 (Launch Prep) ← depends on all 5x ┘
```

**Parallelizable:** 5A, 5B, 5C, 5D can all run in parallel with different developers.
**Sequential within sub-phase:** 5A.2 needs 5A.1's art. 5C.2 needs 5C.1's shop. 5B.3 needs 5B.1's health data.

---

## Required External Dependencies

| Dependency | Purpose | Install |
|-----------|---------|---------|
| `expo-health` or `react-native-health` | HealthKit (iOS) | `npx expo install` |
| `react-native-health-connect` | Health Connect (Android) | npm |
| `expo-location` | GPS tracking | `npx expo install` |
| `react-native-maps` | Map display + territory heatmap | npm |
| `react-native-purchases` (RevenueCat) | IAP + subscriptions | npm |
| `expo-notifications` | Push notifications | `npx expo install` |
| `expo-image-picker` | Video selection for evidence | `npx expo install` |
| `expo-av` | Video playback for evidence viewing | `npx expo install` |
| `expo-image` | Optimized image loading for characters/shop | `npx expo install` |

**Note:** HealthKit/Health Connect require Expo development builds (not Expo Go). Set up EAS Build before starting 5B.

---

## Art Asset Sourcing Strategy

Options (pick one):
1. **AI-generated + hand-cleaned** — Generate with Midjourney/Flux using consistent style prompt, clean in Figma. Fastest, ~$50 total.
2. **Commission artist** — Fiverr/ArtStation for consistent sprite set. Higher quality, ~$500-1500, 1-2 week lead time.
3. **Asset pack** — Itch.io game asset packs adapted to GymClash style. Cheapest, least unique.

**Recommended:** Option 1 for MVP launch, upgrade to Option 2 for v1.1 polish pass.

---

## Migrations Summary (Phase 5)

| # | Name | Tables/Columns |
|---|------|---------------|
| 012 | Character support | `profiles.strength_workout_count`, `scout_workout_count` |
| 013 | Equipped cosmetics | `cosmetic_inventory.equipped` |
| 014 | HIIT support | `workout_type` + `'hiit'` |
| 015 | Cosmetic catalog | `cosmetic_catalog`, `cosmetic_crates`, `crate_loot_tables` |
| 016 | Chat + video | `war_chat_messages`, `evidence_type` + `'video'` |
| 017 | War roles | `clan_war_member_roles` |
| 018 | Location leaderboards | `profiles.country_code`, `profiles.region_code`, filtered views |

---

## Budget Estimate

| Item | Cost | Notes |
|------|------|-------|
| AI-generated art assets | $50–100 | Midjourney/Flux credits |
| RevenueCat | Free (< $2.5k MRR) | Scales with revenue |
| Supabase Pro | $25/mo | Already needed for edge functions |
| EAS Build | Free (30 builds/mo) | Expo plan |
| Apple Developer | $99/yr | Required for App Store |
| Google Play Developer | $25 one-time | Required for Play Store |
| **Total launch cost** | **~$200-300** | Excludes commissioned art |
