# GymClash High-Fidelity UI Overhaul - Claude Execution Prompt

You are tasked with executing a massive UI overhaul for the GymClash React Native (Expo) app based on high-fidelity reference screens. 

**Core Mission:** Recreate the reference screenshots/HTML in `UI_guidance/` with maximum visual fidelity. Do not "clean up", "modernize", or flatten the UI. Maintain the "premium neon game HUD" feel.

## Source of Truth
1. The HTML and image files in `UI_guidance/` (e.g., `UI_guidance/the_gym_arena_hub/code.html`).
2. `DESIGN.md` / `GYM_CLASH_PRD.md` / `CLAUDE.md`.

## Task Checklist to Execute:

### Phase 1 & 2: Design Tokens
- [ ] Audit and match `tailwind.config.js` to the theme settings found in the `<script id="tailwind-config">` blocks of the `UI_guidance` HTML files. 
- [ ] Ensure `constants/theme.ts` reflects the exact hex codes (e.g., `#ce96ff` primary, `#ffd709` secondary, `#0c0c1f` surface base).

### Phase 3: Shared UI Primitives
Overwrite or create these components in `components/ui/` to match the glassy/glowing game aesthetic:
- [ ] `ScreenBackground.tsx` (Deep void, radial mesh blooms)
- [ ] `Card.tsx` (Update to GlassCard style: layered inner shadows, border glows)
- [ ] `Button.tsx` (Update to GlowButton: oversized, luminous, tactile press)
- [ ] `ResourcePill.tsx` (Jewel-like stat pills for Trophies, Energy, etc.)
- [ ] `ProgressBar.tsx` (Bright fills, glows)
- [ ] `SectionCard.tsx` (List modules)
- [ ] `ScoreRing.tsx` (Circular progress rings)
- [ ] `HUDInput.tsx` (Recessed inputs) & `SelectField.tsx`
- [ ] `MetricCard.tsx`
- [ ] `ClanMemberRow.tsx`
- [ ] `QuestNode.tsx` & `QuestPath.tsx`

### Phase 4: Screen Compositions
Use the newly created primitives to rebuild these screens routing exactly as they appear in the HTML mockups:
- [ ] Home Screen: `app/(tabs)/index.tsx` (Reference: `the_gym_arena_hub/code.html`)
- [ ] Clan Screen: `app/(tabs)/clan/index.tsx` (Reference: `clan_war_hub/code.html`)
- [ ] Cardio Workout: `app/(tabs)/workout/cardio.tsx` (Reference: `battle_training_tracker/code.html`)
- [ ] Quest Progression: `app/(tabs)/quests.tsx` (Reference: `victory_peak/code.html` or similar)
- [ ] Strength Workout: `app/(tabs)/workout/strength.tsx`
- [ ] Custom Glowing Tab Bar: `components/navigation/BottomTabBar.tsx`

## Engineering Rules:
- Ensure strict Expo SDK 54 / Expo Router compatibility.
- Use NativeWind styling combined with inline styles for dynamic `box-shadow` or `text-shadow` glows if NativeWind classes fail on native platforms.
- Keep components presentation-focused; maintain existing Zustand/TanStack logic layers.
- Do a visual polish pass once functionality is mapped!
