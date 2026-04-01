# GymClash — Screen Map

## Navigation Structure

```
Root Layout (_layout.tsx)
├── Auth Gate (redirects based on session + onboarding state)
│
├── (auth)/ — Unauthenticated Stack
│   ├── landing.tsx          # Landing page
│   ├── login.tsx            # Login / Sign-up (mode param)
│   └── onboarding/
│       └── index.tsx        # 2-step onboarding
│
└── (app)/ — Authenticated Tab Navigator
    ├── home.tsx             # Tab 1: Home / Dashboard
    ├── clan.tsx             # Tab 2: Clan
    ├── profile.tsx          # Tab 3: Profile
    │
    ├── workout/
    │   ├── strength.tsx     # Strength logging
    │   ├── scout.tsx        # Run logging
    │   ├── recovery.tsx     # Active recovery
    │   └── [workoutId].tsx  # Workout detail
    │
    ├── history/
    │   └── index.tsx        # Full workout history
    │
    ├── review/
    │   └── [workoutId].tsx  # Flagged workout review + appeal
    │
    ├── report/
    │   └── [userId].tsx     # Report user form
    │
    └── settings/
        └── biodata.tsx      # Biodata entry
```

---

## Screen Inventory

### 1. Landing (`landing.tsx`)

**Purpose:** First impression. Differentiate new vs returning users.

**Content:**
- GymClash logo and tagline: "Train in real life. Level up in game. Help your clan win."
- **"Get Started"** button → `login?mode=signup` (filled brand button)
- **"I have an account"** button → `login?mode=signin` (outlined button)
- Terms of service footer

**Empty state:** N/A (always shows content)

---

### 2. Login / Sign-Up (`login.tsx`)

**Purpose:** Authentication gate. Single screen handles both modes.

**Content:**
- Header: "Create Account" (signup) / "Welcome Back" (signin)
- Email + password fields
- Submit button: "Sign Up" / "Log In"
- **Forgot password** link (sign-in mode only) — sends reset email via Supabase
- Toggle: "Already have an account? Log In" / "Don't have an account? Sign Up"

**Behavior:**
- Reads `mode` param from landing page to set initial state
- `supabase.auth.signUp` or `signInWithPassword`
- Auth state listener in root layout handles navigation on success

---

### 3. Onboarding (`onboarding/index.tsx`)

**Purpose:** Minimal setup to start playing. 2 steps only.

**Step 1 — Name:**
- "Choose your name" — warrior name input (max 20 chars)
- Continue button

**Step 2 — Ready:**
- "You're ready, {name}" with trophy emoji
- Starting stats card: Bronze rank, Level 1, first mission "Log your first workout"
- "Enter the Arena" button → home

**Step indicator:** 2 dots at bottom

---

### 4. Home Dashboard (`home.tsx`)

**Purpose:** The command center. Shows identity, progression, and workout CTAs.

**Sections (top to bottom):**

1. **Arena Header**
   - Arena badge and name (e.g., "🔩 Rustyard")
   - Trophy count with progress bar to next arena
   - Themed accent color by arena tier

2. **Stats Row**
   - Rank (with rank color), Level, Streak (fire icon)

3. **Daily Goal Card**
   - Goal description + completion status
   - Trophy reward badge when complete

4. **Quick Actions ("Train")**
   - Strength → workout/strength
   - Run → workout/scout
   - Active Recovery → workout/recovery
   - Each with icon, label, subtitle, accent color

5. **No Clan Prompt** (if user has no clan)
   - "No clan yet — Find a Clan" → clan tab

6. **Clan War** (if active war exists)
   - Week number, your clan score vs opponent score

7. **No Workouts Prompt** (if no workout history)
   - "No workouts yet — Log your first workout above"

8. **Recent Workouts** (if history exists)
   - Last 3 workouts with type icon, date, score
   - "See all" link → history

---

### 5. Clan Tab (`clan.tsx`)

**Purpose:** Clan management and war status.

**States:**

**No clan:**
- Search clans (query input)
- Browse results with member count
- "Create Clan" option (name, tag, description)

**In clan:**
- Clan name, tag, description
- Member roster with roles and contributions
- Active war status and scores
- War history
- Leave clan button (with confirmation)

**Clan creation form:**
- Name, tag (3-6 chars), description
- Creates clan and sets user as leader

---

### 6. Profile Tab (`profile.tsx`)

**Purpose:** Player identity and stats summary.

**Content:**
- Display name + avatar
- Rank badge + XP progress bar
- Arena tier + trophy count
- Stats: total workouts, current streak, longest streak
- 1RM personal bests (if tracked)
- Buttons: History, Settings/Biodata, Report (on other profiles)

---

### 7. Workout History (`history/index.tsx`)

**Purpose:** Full workout log with filters.

**Content:**
- Filter tabs: All / Strength / Running
- Workout cards: type icon, date, duration, score, validation status dot
- Flagged workouts show warning indicator + "Tap to review or appeal"
- All workouts are tappable:
  - Flagged → review screen
  - Accepted/validated → workout detail screen
- Pull-to-refresh
- Empty state: "No workouts yet — Start training to see your history"

---

### 8. Strength Workout (`workout/strength.tsx`)

**Purpose:** Log a weightlifting session.

**Flow:**
1. Select/search exercise name
2. Enter sets, reps, weight (NumberInput components)
3. Add exercise to session
4. See running set list with tonnage per exercise
5. Remove sets if needed (trash icon)
6. End session → submit
7. See provisional score estimate → server validates

---

### 9. Scout Workout (`workout/scout.tsx`)

**Purpose:** Log a running session.

**Flow:**
1. Enter distance (km) and duration (minutes)
2. Pace auto-calculated from distance/duration
3. Optional: GPS tracking (future)
4. End session → submit
5. See provisional score → server validates

---

### 10. Active Recovery (`workout/recovery.tsx`)

**Purpose:** Log recovery for streak maintenance.

**Flow:**
1. Timer starts on screen enter
2. Minimum 10 minutes required
3. End session → submit
4. Reduced score (participation bonus only)
5. Streak maintained

---

### 11. Workout Detail (`workout/[workoutId].tsx`)

**Purpose:** Full breakdown of a completed workout.

**Content:**
- Header: workout type icon + label, date, duration
- Validation status badge with confidence percentage
- **Scores section:** raw score, final score, confidence %
- **Type-specific breakdown:**
  - Strength: set-by-set table (exercise, sets, reps, weight)
  - Scout: distance, avg pace, elevation gain
  - Recovery: duration
- **Validation checks:** pass/fail list with icons
  - Green check for passed checks
  - Red/yellow X for failed checks with reason code labels
- **Appeal link** (if flagged): "Review & Appeal" → review screen

---

### 12. Workout Review / Appeal (`review/[workoutId].tsx`)

**Purpose:** Explain why a workout was flagged and allow appeal.

**Content:**
- Validation status badge with description
- Confidence percentage
- **Flagged Issues:** list of failed checks with severity indicators
- **Appeal Form** (if appealable):
  - Text area: "Describe why this flag is incorrect..."
  - Submit Appeal button
  - Success alert → navigate back

**Appealable statuses:** held_for_review, excluded_from_clan_score, rejected

---

### 13. Report User (`report/[userId].tsx`)

**Purpose:** Report suspicious activity from another user.

**Content:**
- Category selection (impossible_stats, suspected_spoofing, inappropriate_behavior, other)
- Description text area
- Submit report button
- Rate-limited (5/day)

---

### 14. Biodata Settings (`settings/biodata.tsx`)

**Purpose:** Collect demographic data for baseline initialization and score personalization.

**Fields:**
- Birth date (date picker)
- Biological sex (male/female/prefer not to say)
- Height (cm)
- Weight (kg)
- Lifting experience (beginner/intermediate/advanced)
- Running experience (beginner/intermediate/advanced)

**Behavior:**
- Saves to profile
- Triggers "verified" status server-side
- Accessible from profile settings and prompted after first workout

---

## Screen Flow Diagram

```
Launch
  │
  ├─ No session → Landing
  │                 ├─ Get Started → Login (signup mode)
  │                 └─ I have an account → Login (signin mode)
  │                                          ├─ Success (needs onboarding) → Onboarding
  │                                          └─ Success (onboarded) → Home
  │
  └─ Has session
      ├─ Needs onboarding → Onboarding → Home
      └─ Onboarded → Home
                       │
                       ├─ Tab: Home
                       │    ├─ Strength → workout/strength → submit → home
                       │    ├─ Run → workout/scout → submit → home
                       │    ├─ Recovery → workout/recovery → submit → home
                       │    ├─ See all → history
                       │    │              ├─ Flagged workout → review/[id]
                       │    │              └─ Normal workout → workout/[id]
                       │    └─ No clan CTA → Clan tab
                       │
                       ├─ Tab: Clan
                       │    ├─ No clan → search / create
                       │    └─ In clan → roster, war status, history
                       │
                       └─ Tab: Profile
                            ├─ History → history/
                            ├─ Biodata → settings/biodata
                            └─ Report → report/[userId] (other profiles)
```
