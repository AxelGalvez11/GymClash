# Gym Clash — Product Requirements Document

**Version:** 1.1  
**Status:** Draft  
**Platforms:** iOS & Android  
**Last Updated:** April 2026

---

## Table of Contents

1. [App Description & Purpose](#1-app-description--purpose)
2. [Core Game Mechanics](#2-core-game-mechanics)
3. [Onboarding & Account Setup](#3-onboarding--account-setup)
4. [UI Flow](#4-ui-flow)
5. [Clan System](#5-clan-system)
6. [Anti-Cheat System](#6-anti-cheat-system)
7. [Item Shop & Economy](#7-item-shop--economy)
8. [Scoring Formulas](#8-scoring-formulas)
9. [Data Privacy & Compliance](#9-data-privacy--compliance)
10. [Offline Behavior](#10-offline-behavior)
11. [Content Moderation](#11-content-moderation)
12. [AI Form Analyzer](#12-ai-form-analyzer)

---

## 1. App Description & Purpose

### 1.1 Overview

Gym Clash is a gamified fitness tracking app for iOS and Android that transforms real-world weightlifting and cardio sessions into competitive gameplay. Users earn in-game currency, level up a personal character, and compete in clan wars — all driven by verified, real-world workout data.

### 1.2 Core Purpose

- Incentivize consistent workout behavior through game mechanics (XP, levels, trophies, clans).
- Collect verifiable fitness data to fairly rank and reward users across global and local leaderboards.
- Foster community competition via clan systems and clan wars without requiring a gym partner.
- Provide a platform for cosmetic self-expression through an in-game shop while remaining free-to-play at its core.

### 1.3 Target Audience

- Fitness-motivated individuals aged 16–35 who also engage with mobile gaming.
- Weightlifters and runners looking for motivation through competition and progression.
- Casual gamers who want a fitness hook to build workout habits.

### 1.4 User Tiers

| Tier | Requirements | Restrictions |
|---|---|---|
| **Guest** | No account created | No progress saved; no clans; no leaderboards |
| **Unverified** | Account created; partial or no biodata completed | Reduced point multipliers; cannot join clan wars |
| **Verified** | All biodata entered; connected GPS/HR device (cardio) OR 1+ week of realistic training logs with a minimum of 3 sessions (lifting) | Full access; eligible for all clan war types; full point multipliers |

#### Verified Lifting Threshold — Algorithm

A user achieves Verified Lifting status when all four of the following conditions are true:

1. At least 7 calendar days have passed since the first session was logged.
2. A minimum of 3 distinct lifting sessions have been completed.
3. No session in the verification window triggered a hard anti-cheat flag.
4. At least one compound lift (squat, bench press, deadlift, or overhead press) has been logged at a weight within population-normal ranges for the user's bodyweight and experience level. Users logging above intermediate standards in their first session are flagged for manual review.

**Population-normal strength benchmarks (intermediate male, bodyweight multipliers):**

| Lift | Beginner | Intermediate |
|---|---|---|
| Squat | 0.75–1.0× BW | 1.5× BW |
| Bench Press | 0.6–0.8× BW | 1.2× BW |
| Deadlift | 1.0–1.25× BW | 2.0× BW |
| Overhead Press | 0.4–0.5× BW | 0.8× BW |

Female standards are approximately 60–65% of the male multipliers at equivalent experience levels. Beginners are held to 50–70% of intermediate standards. Any user's first-session log exceeding intermediate standards triggers a review flag.

### 1.5 Monetization Model

Gym Clash operates on a free-to-play model with cosmetic and convenience monetization. No gameplay-critical content is locked behind real-money purchases.

- **Lifting Currency** — earned through weightlifting sessions; used to purchase lifting-themed cosmetics and items.
- **Running Currency** — earned through cardio sessions; used to purchase cardio-themed cosmetics and items.
- **Diamonds** — premium currency purchasable with real money (USD). Required for rare crates, exclusive cosmetics, and power-ups.
- Cosmetic purchases are permanent and do not grant competitive advantages in leaderboards or clan wars.

#### Diamond Pricing Tiers

| Bundle | Price (USD) | Diamonds | Value/$ |
|---|---|---|---|
| Starter | $0.99 | 80 | 80.8 |
| Small | $4.99 | 500 | 100.2 |
| Medium | $9.99 | 1,100 | 110.1 |
| Large | $19.99 | 2,400 | 120.1 |
| XL | $49.99 | 6,500 | 130.0 |
| Mega | $99.99 | 14,000 | 140.0 |

Pricing anchor items: Common crate = 80 diamonds, Rare = 200, Epic = 500, Legendary = 1,500. Power-ups = 100–150 diamonds. The $0.99 Starter pack intentionally yields exactly one Common crate to minimize purchase friction.

---

## 2. Core Game Mechanics

### 2.1 Character & Progression

Each user has a 3D character model displayed on the home screen in a gym arena environment. The character begins as a neutral figure and evolves visually as the user progresses.

- Completing lifting exercises grants XP toward a lifting level. The character gains more defined musculature and lifting-related visual upgrades at milestone levels.
- Completing cardio sessions grants XP toward a cardio level. The character gains runner-themed visual upgrades at milestone levels.
- Users have a combined overall level that determines trophy multipliers and unlocks.
- Character cosmetics (skins, equipment, gym arena items) can be equipped from the Profile or Shop screen.

### 2.2 Trophy & Ranking System

Trophies are the primary competitive currency and are used for matchmaking and leaderboard placement.

- Trophies are earned after each session based on performance relative to predicted workout volume.
- Trophy counts determine a user's rank tier.
- Local (city/region) and national leaderboards are visible from the trophy count button on the Home Screen.
- Clan total trophies are the aggregate of all member trophies and are used for clan war matchmaking.

#### Rank Tier Names

| Tier | Name | Notes |
|---|---|---|
| 1 | Rookie | Universal entry point |
| 2 | Iron | Foundational gym material, culturally resonant |
| 3 | Bronze Plate | References actual weight plate colors |
| 4 | Silver Plate | Continues plate metaphor |
| 5 | Gold Plate | Peak recreational lifter aspiration |
| 6 | Elite | Understood performance benchmark |
| 7 | Champion | Pre-Olympian competitive tier |
| 8 | Olympian | Reserved for the top percentile |

The plate-progression metaphor (Iron → Bronze Plate → Silver Plate → Gold Plate) is unique to weightlifting culture and will resonate with the target audience distinctly from generic metal-tier systems.

### 2.3 Scoring Overview

Points are calculated per session and differ between lifting and cardio. Full formulas are defined in [Section 8](#8-scoring-formulas).

**Lifting:**
- Base score is derived from normalized session volume compared to the user's predicted output.
- Heart rate monitor connection grants a verified bonus multiplier (configurable, recommended 1.25×).
- Clan war sets verified by AI form analyzer grant an additional verified-rep bonus.

**Cardio:**
- Territory Mode: score based on total distance, average pace, and average heart rate zone sustained.
- Treadmill Mode: score based on session duration, heart rate data, and photo-verified start time.
- HIIT sessions score equivalently to Zone 2 sessions of matching total cardiovascular load (calculated via the time-in-zone weighted scoring formula in Section 8).
- GPS and HR device connection grants the full cardio point multiplier. Unverified sessions receive a significantly reduced multiplier.

---

## 3. Onboarding & Account Setup

### 3.1 App Launch

On first launch, users see a full-screen splash with the Gym Clash logo and animated intro lasting approximately 1.5 seconds. The app transitions automatically to the Account Screen.

### 3.2 Account Screen

- **Primary button:** Create Account (email/password or Apple/Google SSO).
- **Secondary button:** Log In (for returning users).
- **Text link:** "Skip for now" — routes to Home Screen as a guest with a persistent save-reminder banner.
- No back button — this is the app entry point.

### 3.3 Onboarding Flow (New Accounts)

A progress bar at the top tracks step completion. All screens include a Back button (top left) except the final confirmation screen.

#### Step 1 — Physical Biodata
- Fields: age, biological sex (inclusive options provided), current weight, height.
- Metric/imperial toggle in the top right corner.
- All fields required. Next button disabled until all fields are filled.

#### Step 2 — Experience Level
- Single-select card options: Never Trained, Beginner, Intermediate, Advanced.
- Brief one-sentence description under each card.

#### Step 3 — Lifting 1RM (Optional)
- Optional input fields for squat, bench press, deadlift, and overhead press estimated 1 rep max.
- "Skip this for now" link below the fields; skipping flags the user as Unverified for lifting.

#### Step 4 — Cardio Baseline
- System displays calculated estimated max heart rate using the formula: `220 − age`. Formula is shown to the user.
- User may adjust the displayed value if they have a clinically known max HR.
- Estimated VO2 max is shown as a read-only informational field based on age and sex norms.

#### Step 5 — Device Connection
- List of supported devices: Apple Watch, Garmin, and other compatible HR/GPS trackers.
- Connect button next to each. "Skip for now" link at bottom; skipping flags the user as Unverified for cardio.

#### Final Onboarding Screen
- Animated summary card displays the user's calculated baseline stats and starting character model.
- Large "Enter the Arena" button transitions to the Home Screen. No back button on this screen.

---

## 4. UI Flow

### 4.1 Home Screen

#### Layout
- **Top bar (left):** Clan name and trophy count with trophy icon.
- **Top bar (right):** Notification bell. Tapping opens a slide-down notification panel.
- **Center:** 3D character model on a gym arena background with idle animation.
- **Below character:** Horizontal XP bar with current level number to the left.
- **Bottom navigation bar (persistent, 5 tabs):** Home, Battle, Clan, Shop, Profile.
- **Above bottom nav:** Large, centered "Initiate Workout" button.

#### Interactions
- Tapping the character model zooms in, shows equipped cosmetics, and displays a "Customize" button.
- Tapping the trophy count opens the Leaderboard screen (local and national tabs).

---

### 4.2 Workout Type Selection

- Tapping "Initiate Workout" opens a full-screen modal that slides up from the bottom.
- Two large cards: **Lifting** and **Cardio**, each with an icon and one-line description.
- X button (top right) dismisses the modal and returns to the Home Screen.

---

### 4.3 Lifting Flow

#### Screen 1 — Device Prompt
- Informs the user that connecting a heart rate monitor earns a bonus point multiplier.
- Shows connected devices. "Connect Device" button and "Continue Without Device" button below it.
- Back button (top left) returns to workout type selection.

#### Screen 2 — Active Workout Screen
- **Top bar:** Session timer counting up (left). "Conclude Workout" button, outlined style to prevent accidental taps (right).
- **Character window:** Small 3D character model below the top bar, animating to match the current selected exercise.
- **Exercise tabs:** Vertically scrollable list.
  - Each tab header shows the exercise name. Tapping the name opens a dropdown search to change the exercise.
  - Chevron on the right side of each tab header collapses or expands the tab.
  - **Inside each tab:** Set rows. Each row has a rep scroll wheel (alarm-clock style) and a weight scroll wheel (with BW option for bodyweight exercises).
  - A checkmark button on each set row confirms completion. Confirmed sets animate with a brief green flash and the character performs a quick lift animation.
  - "Add Set" button at the bottom of each tab adds a new set row.
- **Plus (+) button** below all tabs adds a new exercise tab.
- No hardware back during an active session. Pressing back shows a dialog: *"End workout without saving?"* with Cancel and End Session options.

#### Screen 3 — Conclude Workout Confirmation
- Tapping "Conclude Workout" shows a dialog: *"Are you sure you want to finish?"* with "Keep Going" and "Finish" options.
- Tapping "Finish" triggers a loading screen (2–3 seconds) for score calculation.
- If device is **offline** at this point: client-side estimated score is displayed with a "Score pending sync" banner. Full score and leaderboard/war contribution are applied once connectivity returns. See [Section 10](#10-offline-behavior).

#### Screen 4 — Post-Workout Score Screen
- Each exercise is shown as a card with a point total and a color-coded rating:
  - 🟢 Green — exceeded predicted target
  - 🟡 Yellow — met predicted target
  - 🔴 Red — below predicted target
- Total session score displayed with an animated counting-up number.
- Character model animates a level-up sequence if XP threshold is crossed. XP bar fills and overflows. Level number increments.
- Lifting currency earned (icon + amount) displayed prominently.
- "Finish" button at the bottom returns to the Home Screen. No back button on this screen.

---

### 4.4 Cardio Flow

#### Screen 1 — Device Connection
- Shows connected GPS and HR devices. "Connect" buttons for unconnected devices.
- Points multiplier preview shown: *"Connected devices earn the full cardio point multiplier."*
- "Continue" button at bottom. Back button (top left) returns to workout type selection.

#### Screen 2 — Mode Selection
- Two large cards: **Territory** and **Treadmill**.
- Info icon on each card expands a tooltip explaining how points are calculated for that mode.
- Back button top left.

#### Territory Mode — Active Session
- **Top bar:** Session timer (left). "End Run" button requiring a confirmation tap (right).
- **Map:** Fills the majority of the screen, displaying the user's real-time GPS trail in a bright accent color.
- **Bottom HUD strip:** Current pace, current HR (if device connected), total distance covered.
- **GPS drop behavior:** Full-screen overlay displays *"GPS signal lost — session paused"* with a pulsing icon. Two buttons: "Wait for Signal" and "End Session Here." No other interaction available until resolved.
- Ending the session: confirmation dialog before session is closed.

#### Treadmill Mode — Active Session
- First prompt: *"Take a photo of your treadmill to begin."* In-app camera opens. Gallery uploads are blocked.
- Loading indicator while photo is validated server-side. If validation fails: error message with option to retake photo.
- Once validated: session timer starts. Screen shows HR readout (if connected), elapsed time, and estimated calorie counter.
- "End Session" button top right. Requires confirmation tap.

#### Post-Cardio Score Screen
- Stat cards displayed: distance, average HR, pace, session time.
- Total session score shown with animated counting-up number.
- Character model plays a running celebration animation. Cosmetic unlocks (if threshold crossed) shown before the level-up animation.
- Running currency earned (icon + amount) displayed.
- "Finish" button returns to Home Screen.

---

### 4.5 Clan Screen

#### No Clan State
- Prompt to "Create Clan" or "Find a Clan."
- Search bar to look up clans by name.
- Clan cards display: name, member count, trophy range, and open/invite-only status.

#### In-Clan State
- **Top section:** Clan name, total trophies, member list.
- Each member entry shows: rank badge, trophy count, and an activity status dot (active today / inactive).
- **Clan chat:** Bottom sheet that slides up. Text input field with an emote picker button. Text messages and purchased text emotes only — no images, media, or video.
- **Clan War button:** Visible to clan leader only. See [Section 5](#5-clan-system).

#### Active Clan War Screen
- Accessible from the Clan tab during an ongoing war.
- Top: war countdown timer and current win/loss status.
- **Lifting section** (if applicable): Each member's contribution shown as a points bar.
- **Cardio section** (if applicable): Horizontal distance bars per member, extending in real time as sessions are completed.
- **Cross-clan chat tab:** Text messages and text emotes only.
- **Report button** (flag icon) on each opposing member entry. Tapping opens a report form with reason categories: Harassment / Suspected Cheating / Other.

#### Post-Clan War Screen
- Summary displayed automatically when war timer ends.
- Shows winning clan with trophy gain/loss.
- Key player contributions highlighted (top point earner per category).
- "Return to Clan" button.

---

### 4.6 Shop Screen

- **Top:** Lifting currency balance and running currency balance side by side. Diamond balance displayed separately in top right with a "+" button to purchase more.
- **Tab row:** Cosmetics, Emotes, Power-Ups, Crates.
- Item cards in a grid layout: item name, preview thumbnail, cost with currency icon.
- Tapping a card opens a detail modal: larger preview, description, Buy button, currency indicator. Cancel button dismisses.
- **Crate tab:** Available crate types with rarity tiers. Opening requires diamond purchase confirmation. Reveal animation plays before displaying the unlocked item. Duplicate items convert automatically to Iron Chips (crafting currency). Bad-luck protection guarantees a Legendary drop within a configured crate-open threshold (target: 50–80 opens; exact value TBD, must be disclosed in-app per applicable loot box transparency laws).

---

### 4.7 Notifications

Push notifications sent on iOS and Android for:

| Event | Trigger |
|---|---|
| Daily workout reminder | Configurable time preference in Profile settings |
| Clan war started | Immediately on war confirmation |
| Clan war ending soon | 12 hours before war expiry |
| Clan war ended | Immediately on war expiry, includes result summary |
| New items in Shop | On shop rotation update |
| Level-up milestone reached | On XP threshold crossed |
| Clan invitation received | Immediately on invite |
| Cheating report resolved | Outcome notification to reporter and reported user |

---

## 5. Clan System

### 5.1 Clan Structure

| Role | Permissions |
|---|---|
| Leader | Initiate clan wars; manage membership; promote/demote roles |
| Co-Leader | Manage membership; cannot initiate wars |
| Member | Participate in all clan activities; no management permissions |

Clans have a configurable open/invite-only join status.

### 5.2 Clan Wars

#### Initiation
- Clan War button is visible only to the Leader on the Clan Screen.
- Leader selects war type (Lifting Only, Cardio Only, or Both) and duration (1, 2, 3, 5, or 7 days).
- System searches for a clan of similar total trophy count. Loading screen displayed during matchmaking.
- Once matched, both clan leaders see opponent clan stats and confirm or cancel before war begins.

#### War Types

| Type | Objective | Verification Required |
|---|---|---|
| Lifting War | Collective normalized lifting volume across all members | AI form analyzer required for war-eligible sets |
| Cardio War | Total distance covered by all members combined | GPS and HR device required to count toward war score |
| Combined War | Both lifting and cardio objectives scored independently | Both verification requirements apply per category |

#### War Map (Cardio Wars)
- Visual war map shows each member's distance covered as a horizontal bar.
- Bars extend in real time as cardio sessions are completed during the war window.
- Bar length is proportional to distance covered. Opponent bars displayed alongside for comparison.

#### Clan War Chat
- Available during active wars. Accessible via a tab on the Active Clan War Screen.
- Text messages and purchased text emotes only. No media, images, or video.
- Report button on each opposing member entry opens a cheating report form.

#### War Resolution
- At war end, a summary screen shows the winner, trophy changes, and key player highlights.
- Trophy adjustments are applied immediately to both clans.
- If a member's contribution is retroactively voided due to confirmed cheating, the clan receives a trophy penalty proportional to that member's war contribution.

---

## 6. Anti-Cheat System

### 6.1 Lifting Anti-Cheat

#### Input Plausibility Checks
- Weight entered per set is cross-referenced against the user's logged 1RM. Any set claiming weight exceeding the 1RM by more than a defined threshold (recommended: 10%) is auto-flagged.
- Rep count per set is validated against the weight-to-1RM percentage. Claiming 30 reps at 90% 1RM is physiologically implausible and is flagged.
- New users without established 1RM data are held to population-based maximums for their bodyweight, age, and experience level (see Section 1.4 benchmarks).
- Session total volume (sets × reps × weight) is compared against the user's rolling 7-day average. Volume spikes beyond a configured multiplier (recommended: 2.5×) trigger a soft flag. Repeated spikes escalate to a hard flag.
- Week-over-week weight increases exceeding approximately 10% on any single lift trigger a warning. Doubling a lift weight in one session triggers an immediate hard flag.

#### Behavioral Signals
- Rest time between sets is passively tracked. Logging 10 sets in under 2 minutes is implausible and flagged.
- Overall session duration is monitored. Logging 20 exercises in 8 minutes triggers a flag.
- Consistent logging patterns from verified users establish a behavioral fingerprint. Sudden deviations in exercise selection, volume, or timing elevate a suspicion score.

#### Heart Rate Validation
- For heavy compound lifts, HR is expected to be elevated. A user claiming a max-effort session with a resting-level HR throughout is flagged.
- HR must exceed a minimum threshold (recommended: >100 BPM) for sets to receive the heart rate verified bonus multiplier.

#### AI Form Analyzer (Clan Wars Only)
- See [Section 12](#12-ai-form-analyzer) for full specification.

---

### 6.2 Cardio Anti-Cheat

#### GPS Validation
- **Speed anomaly detection:** GPS-calculated speed exceeding human running thresholds (>25 km/h sustained for more than 30 seconds) triggers a flag. Short sprint bursts are permitted.
- **Teleportation detection:** GPS coordinates that jump illogical distances between pings are flagged. The route must form a physically continuous path.
- **Stationary spoofing detection:** If GPS reports movement but the accelerometer shows no body movement, the session is flagged. This catches phone-in-vehicle cheating.
- Minimum session distance thresholds must be met for full points to register.

#### Heart Rate Validation
- HR must correlate with claimed effort. A 10K run logged with an average HR of 62 BPM fails the plausibility check.
- HR zones must align with session type. HIIT sessions must show HR spikes above threshold. Zone 2 sessions must sustain HR within the defined aerobic band.
- Flat-line HR during a session (device malfunction or device not worn) pauses point accumulation.

#### Treadmill Mode Verification
- Photos must be taken in-app only. Gallery uploads are blocked.
- EXIF timestamp is validated server-side against session start time.
- GPS confirms the device is stationary (consistent with treadmill use). GPS movement during a treadmill session is flagged.
- HR must be active and elevated throughout. Treadmill sessions without HR data receive significantly reduced points and are ineligible for clan war contribution.
- Session duration is tracked from photo submission to End Session. Claiming a 60-minute run in 12 minutes is flagged.

---

### 6.3 Penalty Tiers

| Flag Level | Trigger | Consequence |
|---|---|---|
| **Soft Flag** | Single-session plausibility failure | Warning issued; session points held or reduced pending review |
| **Hard Flag** | Repeated soft flags or severe single-session anomaly | Session points voided; war contribution removed; clan notified |
| **Confirmed Cheat** | Review confirms fraudulent input or device spoofing | Leaderboard removal; permanent clan war ban; possible full account ban; clan receives trophy penalty proportional to cheating user's war contribution |

---

## 7. Item Shop & Economy

### 7.1 Shop Categories

#### Cosmetics
- Character skins: full-body appearance changes for the user's 3D model.
- Gym arena items: bench, barbells, flooring, and other decorative gym environment objects.
- Lifting accessories: gloves, belts, wristbands visible on the character model.
- Running gear: shoes, jerseys, and cardio accessories visible on the character model.

#### Emotes
- Text emotes displayed in clan chat and cross-clan war chat.
- Emote packs purchased with in-game currency or diamonds depending on rarity.

#### Power-Ups
- **2× Session Points:** Doubles point output for a single session.
- **XP Boost Tokens:** Multiplies XP earned for a defined number of sessions.
- Power-ups purchased with diamonds. Do not affect leaderboard trophy counts directly.

#### Crates
- Tiers: Common, Rare, Epic, Legendary — each with different item pools and drop rate odds.
- All crates purchased with diamonds.
- Opening triggers a reveal animation before displaying the unlocked item.
- **Duplicate handling:** Duplicate items automatically convert to Iron Chips, a crafting currency redeemable in the Forge (a dedicated exchange section of the Shop). Chip conversion rates are tiered by item rarity — duplicating a Legendary earns more chips than duplicating a Common.
- **Bad-luck protection:** If a user opens X crates without receiving a Legendary, the next crate is guaranteed Legendary. Target threshold: 50–80 crates. Exact value to be confirmed and must be disclosed in-app.

### 7.2 Currency Use Matrix

| Item Type | Lifting Currency | Running Currency | Diamonds (USD) |
|---|---|---|---|
| Standard Lifting Cosmetics | ✅ | — | — |
| Standard Cardio Cosmetics | — | ✅ | — |
| Common Emote Packs | ✅ | ✅ | — |
| Premium / Rare Cosmetics | — | — | ✅ |
| Power-Ups | — | — | ✅ |
| Crates (all tiers) | — | — | ✅ |

---

## 8. Scoring Formulas

### 8.1 Lifting Scoring

Scoring is based on normalized session volume compared to the user's predicted output.

#### Step 1 — Raw Volume
```
raw_volume = Σ (sets × reps × weight) across all exercises in session
```

#### Step 2 — Allometric Scaling (Bodyweight Normalization)
Strength does not scale linearly with body mass. The correct normalization uses an allometric exponent of 0.67:
```
normalized_volume = raw_volume / (bodyweight_kg ^ 0.67)
```

#### Step 3 — Gender and Age Coefficient
Apply DOTS-style gender coefficients (open-source, updated 2020 standard). Apply McCulloch age coefficients for users over 40, and Foster age coefficients for users aged 14–23. These are standard adjustments used in competitive powerlifting and are publicly available.

For accessory exercises without an established 1RM, estimate 1RM using:
```
estimated_1RM = weight × (1 + reps / 30)
```
This Epley formula provides a plausible 1RM estimate for exercises where a max has not been established.

#### Step 4 — Score vs. Predicted Baseline

The user's predicted output is their rolling 7-day average normalized volume. Points are awarded on a percentage-above/below-baseline scale:

| Performance vs. Predicted | Points |
|---|---|
| ≥ 110% | Full points + bonus multiplier |
| 90–110% | Full points |
| 70–90% | Reduced points |
| < 70% | Minimal points |

#### Step 5 — Verified Bonuses
- Heart rate monitor connected and HR >100 BPM sustained: apply 1.25× session multiplier.
- Clan war sets verified by AI form analyzer: apply additional per-set verified-rep bonus (value TBD).

---

### 8.2 Cardio Scoring (Time-in-Zone Weighted Formula)

Heart rate zones are defined as a percentage of the user's estimated max HR (`220 − age`). As more HR data accumulates, the system refines zones using the Karvonen Heart Rate Reserve formula for better individual accuracy.

#### Zone Definitions (5-Zone Model)

| Zone | HR % Range | Description |
|---|---|---|
| Zone 1 | 68–73% max HR | Recovery |
| Zone 2 | 73–80% max HR | Aerobic base / fat burning |
| Zone 3 | 80–87% max HR | Tempo |
| Zone 4 | 87–93% max HR | Threshold |
| Zone 5 | 93–100% max HR | Max effort |

#### Zone Point Coefficients

| Zone | Points per Minute | Rationale |
|---|---|---|
| Zone 1 | 0.5 | Recovery activity, minimal cardiovascular load |
| Zone 2 | 1.0 | Base rate; standard Zone 2 session is the benchmark |
| Zone 3 | 1.4 | Moderately higher cardiovascular cost |
| Zone 4 | 1.8 | High lactate cost |
| Zone 5 | 2.0 | Capped — physiologically unsustainable for extended duration |

#### Session Score Formula
```
cardio_score = Σ (minutes_in_zone[n] × zone_coefficient[n])
```

**Example — 45-minute Zone 2 run:**
```
45 min × 1.0 = 45 base points
```

**Example — 20-minute HIIT session (10 min Zone 4, 10 min Zone 5):**
```
(10 × 1.8) + (10 × 2.0) = 38 base points
```

This formula ensures HIIT sessions score equivalently to Zone 2 sessions of matching total cardiovascular load, while preventing short sessions from yielding disproportionate point rewards. It also naturally handles HIIT vs. Zone 2 equivalency without requiring a separate conversion system.

#### Verified Device Bonuses
- GPS and HR device connected: full cardio point multiplier applied.
- No device: significantly reduced multiplier (exact value TBD; recommended 0.4–0.5×).

---

## 9. Data Privacy & Compliance

### 9.1 Regulatory Scope

Gym Clash is not a covered entity under HIPAA (no integration with healthcare providers). Heart rate, GPS, age, weight, and session data collected by Gym Clash for its own app do not constitute Protected Health Information under HIPAA as long as they are not transmitted to or combined with clinical health records.

However, the following regulations apply and must be complied with before launch:

| Regulation | Applies When | Key Requirements |
|---|---|---|
| **GDPR** | Any EU resident uses the app | Explicit opt-in consent; right to deletion; data portability; Data Processing Agreement; GPS and HR data classified as "special category data" requiring heightened protection |
| **CCPA** | Any California resident uses the app | Disclose all data categories collected; provide "Do Not Sell My Data" option in settings; honor opt-out requests |
| **State laws (2024+)** | Users in states including WA, CO, TX (expanding) | Wearable-derived metrics (HR, GPS) classified as sensitive personal information; opt-out rights; Data Protection Impact Assessments may be required |

### 9.2 Technical Requirements

- All health data encrypted at rest (AES-256) and in transit (TLS 1.3).
- GPS and HR data are never sold to third parties.
- A granular consent screen is presented during onboarding with separate toggles for: GPS tracking, HR data storage, and biodata storage.
- A "Delete My Data" option must be accessible from the Profile settings, permanently purging all health-adjacent data upon request.
- A compliant Privacy Policy must be drafted and reviewed by a qualified privacy attorney before app store submission. This is non-negotiable for international release.

### 9.3 Loot Box Disclosure

Bad-luck protection thresholds and crate drop rate odds must be disclosed in-app to comply with loot box transparency requirements in applicable jurisdictions (Belgium, Netherlands, and others may require this; several US states are developing similar requirements). Display a "View Drop Rates" link on the Crates tab of the Shop.

---

## 10. Offline Behavior

### 10.1 Cardio Sessions (GPS Drop)

Already specced in Section 4.4 (Territory Mode). When GPS drops mid-session, the app displays a full-screen pause overlay with "Wait for Signal" and "End Session Here" options. No points are awarded for time elapsed without GPS signal.

### 10.2 Lifting Sessions (Offline-First Architecture)

Lifting sessions do not require continuous connectivity. The app uses an offline-first local queue architecture.

#### During a Session (Offline)
- All set data is written to local device storage in real time as the user logs each set.
- No network connection is required to log, edit, or complete a lifting session.
- The session timer, character animations, and UI function fully offline.

#### On Session Conclude
- **If online:** Score is calculated server-side. Post-workout screen displays normally with final score and currency earned.
- **If offline:** Client-side estimated score is calculated using the same formula logic. User sees the post-workout screen with a "Score pending sync" banner. Full score, leaderboard update, and clan war contribution are applied once connectivity is restored.

#### On Reconnect
- The app uses incremental sync — only the delta (new sets, completed session metadata) is transmitted, not the full session history.
- Anti-cheat validation runs server-side on sync. If the session fails validation after sync, points are reversed and the user is notified via push notification.
- Sessions that remain unsynced for more than 72 hours are flagged for manual review before points are credited.
- Sync occurs automatically in the background when connectivity is detected. No user action required.

#### Conflict Resolution
- In the rare case of a conflict (e.g., same session edited on two devices), the last-write-wins strategy is applied. This is appropriate for workout logging, where simultaneous multi-device session edits are not an expected use case.

---

## 11. Content Moderation

### 11.1 Scope

Clan chat and cross-clan war chat are text-only. No images, video, or media can be shared. Moderation applies to all text messages and emote labels.

### 11.2 Automated Word Filtering

A keyword blocklist is applied in real time before any message is published. The blocklist covers:
- Hate speech and slurs
- Explicit sexual content
- Personal threats
- Severe profanity (at the team's discretion)

Messages containing blocked words are rejected at publish time and not delivered to recipients. The sender receives a brief inline error: *"Message not sent — your message contains restricted content."*

The blocklist is a configurable server-side list. No third-party AI moderation service is used in the initial launch version. This approach is intentionally simple and can be expanded to context-aware NLP moderation in a future release.

### 11.3 User Reporting

- A report button (flag icon) is visible on each message and on each opposing member's entry during clan wars.
- Tapping opens a report form with reason categories: Harassment / Hate speech / Suspected Cheating / Other.
- Reported content and associated account data are queued for human review.
- Both the reporter and the reported user receive a push notification when the report is resolved.

### 11.4 Escalation and Penalties

- First confirmed violation: 24-hour chat suspension.
- Second confirmed violation: 7-day chat suspension.
- Third confirmed violation: permanent chat ban, subject to appeal.
- Extreme content (credible threats, CSAM indicators): immediate account suspension pending review; escalated outside normal moderation queue.

---

## 12. AI Form Analyzer

### 12.1 Purpose

The AI Form Analyzer is used exclusively during clan wars to verify that logged lifting sets represent legitimate, full-range-of-motion repetitions. It is not used for general session logging or coaching feedback.

### 12.2 Recommended Implementation

**Option A — Licensed SDK: QuickPose (recommended for launch)**
- Pre-built iOS and Android SDKs with exercise-specific rep counters and form checks.
- Supports squat, bench press, deadlift, overhead press, and other compound movements out of the box.
- Eliminates months of ML R&D. Faster path to launch.
- Cost: per-call API pricing (evaluate at expected volume before committing).

**Option B — Open-source: Google MediaPipe (recommended for scale)**
- Free, cross-platform (iOS and Android), runs on-device with no cloud dependency.
- Uses pose estimation landmarks to calculate joint angles and count reps.
- Requires internal integration and tuning effort but eliminates per-call cost at scale.
- Preferred long-term option once engineering capacity allows.

### 12.3 Minimum Viable Confidence Checks

For a clan war set to be verified by the AI analyzer, all of the following must pass:

| Check | Pass Condition |
|---|---|
| Body in frame | All required pose landmarks detected throughout the set |
| Exercise recognition | Joint angle pattern is consistent with the claimed exercise type (e.g., knee angle <90° at bottom of squat) |
| Rep count match | Rep count from video is within ±1 of the user-entered rep count |
| Duration plausibility | Video duration is consistent with claimed rest-between-sets time; a 10-rep set cannot be completed in 3 seconds |

### 12.4 Data Handling

- Video is captured in-app only. No gallery uploads permitted.
- Video is processed (either on-device via MediaPipe or via SDK API call) and then **immediately discarded**. No video is stored, transmitted to other users, or retained on servers.
- The analyzer returns a confidence score and a pass/fail verdict. Only the verdict and confidence score are stored, linked to the session ID.
- Low confidence verdict: set does not count toward clan war points. User is notified inline.
- Repeated low confidence scores on a single account elevate that account's anti-cheat suspicion score.

### 12.5 Out of Scope

The AI Form Analyzer does not:
- Provide real-time coaching feedback during general sessions (future feature, not in v1).
- Analyze cardio form.
- Store or display video to any user other than the one who recorded it.
- Run during non-clan-war sessions.

---

*End of Document — Gym Clash PRD v1.1*
