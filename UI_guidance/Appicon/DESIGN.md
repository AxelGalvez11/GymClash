# Design System Document: The Kinetic Arena

## 1. Overview & Creative North Star
**Creative North Star: "The Hero’s HUD"**

This design system rejects the sterile, flat aesthetic of modern SaaS in favor of a high-octane, "maximalist-polished" experience. Inspired by the tactical density of *Clash Royale* and the vibrant energy of *Fortnite*, we are building more than a fitness tracker—we are building a battle interface for personal growth.

To move beyond a "template" look, this system utilizes **Hyper-Tactile Depth**. We break the rigid grid through intentional asymmetry, such as overlapping progress widgets and "heroic" typographic scales that burst out of their containers. Every screen should feel like a pre-match lobby: expectant, high-stakes, and rewarding. We achieve professional polish through "glow-stacking" and precision-rounded geometry, ensuring the interface feels like premium hardware rather than a simple mobile app.

---

### 2. Colors & The Neon-Glow Protocol
Our palette is high-contrast, designed to pop against a deep, "Midnight Void" background.

*   **Primary (Elixir Purple):** `primary` (#ce96ff) & `primary_dim` (#a434ff). Used for "Level Up" moments and core progression.
*   **Secondary (Victory Gold):** `secondary` (#ffd709). Reserved for rewards, streaks, and premium call-outs.
*   **Tertiary (Battle Blue):** `tertiary` (#81ecff). Used for tactical data and informative stats.
*   **Neutral/Background:** `surface` (#0c0c1f).

**The "No-Line" Rule**
Standard 1px borders are strictly prohibited for sectioning. We define boundaries through **Background Volume**. Use `surface_container_low` for secondary sections and `surface_container_high` for interactive cards. If a separator is needed, use a `3.5` (0.875rem) vertical gap from the Spacing Scale.

**Surface Hierarchy & Nesting**
Treat the UI as a physical stack of glowing glass panels:
1.  **Base Layer:** `surface` (#0c0c1f) - The dark void.
2.  **Section Layer:** `surface_container` (#17172f) - Subtle grouping.
3.  **Active Component:** `surface_container_highest` (#23233f) - The "Heroic" interactive card.

**The "Glass & Gradient" Rule**
Floating elements (Modals/Pop-ups) must use `surface_bright` at 80% opacity with a `24px` backdrop-blur. Apply a subtle linear gradient from `primary` to `primary_dim` on all primary CTAs to simulate 3D "lighting" from above.

---

### 3. Typography: Heroic Scale
We use a tri-font system to balance "gamey" punch with professional legibility.

*   **Display & Headlines (Epilogue):** Our "Heroic" voice. Use `display-lg` (3.5rem) for workout summaries and `headline-lg` (2rem) for section titles. These should be set with tight tracking (-2%) to feel dense and powerful.
*   **Titles & Body (Be Vietnam Pro):** The "Operator" voice. `title-lg` is for card headers; `body-md` handles the heavy lifting of instructional text.
*   **Labels (Lexend):** The "Data" voice. Used for technical stats (BPM, Reps, KG). Lexend’s geometric clarity ensures numbers are readable during high-intensity movement.

---

### 4. Elevation & Depth: Tonal Layering
We do not use standard gray drop shadows. We use **Ambient Chromatic Glows**.

*   **The Layering Principle:** Instead of a shadow, place a `surface_container_lowest` (#000000) card inside a `surface_container_high` container to create a "recessed" look for data entry.
*   **Chromatic Shadows:** Floating action buttons (FABs) or "Victory" cards must use a shadow tinted with the `surface_tint` (#ce96ff) at 10% opacity, with a `32px` blur. This creates a "neon underglow" effect.
*   **The "Ghost Border" Fallback:** For accessibility in forms, use `outline_variant` (#46465c) at **20% opacity**. This provides a faint guide without breaking the immersive dark mode.
*   **3D Tactility:** Buttons use a `2px` bottom-inset shadow (inner shadow) to simulate a physical "pressable" plastic key.

---

### 5. Components

#### **Buttons: The Action Triggers**
*   **Primary (The "Victory" Button):** Background: `primary_fixed`; Roundedness: `lg` (2rem). Must have a subtle top-to-bottom gradient. On hover/active, increase `surface_tint` glow.
*   **Secondary:** Background: `surface_container_highest`; Border: `Ghost Border` (20% `outline`).

#### **Cards: The Content Vaults**
*   **Rules:** No dividers. Use `surface_container_high` backgrounds.
*   **Interaction:** On-tap, cards should scale down to 98% to provide tactile "game-feel" feedback.
*   **Header Overlap:** Headlines should occasionally "break" the top padding of the card by `2` (0.5rem) to create a layered, custom editorial look.

#### **Stats & Progress Bars**
*   **The Level-Up Bar:** Use a `tertiary` (Battle Blue) track with a `primary` (Elixir Purple) fill. The fill should have a "shimmer" animation—a moving gradient highlight that suggests energy.
*   **Chunky Icons:** Icons are never thin-stroke. Use 24pt filled styles with `secondary_fixed` (Victory Gold) for achievements.

#### **Inputs & Forms**
*   **The HUD Input:** Use `surface_container_lowest` as the field background. When focused, the border transitions to a 2px `primary_dim` glow.

---

### 6. Do’s and Don’ts

**Do:**
*   **Do** use asymmetrical layouts (e.g., a large stat card on the left, two small ones stacked on the right).
*   **Do** use the `xl` (3rem) roundedness for large containers to emphasize the "friendly but chunky" game aesthetic.
*   **Do** use vibrant color shifts for success states (e.g., text changing from `on_surface` to `secondary` when a goal is hit).

**Don’t:**
*   **Don’t** use pure white (#FFFFFF). Use `on_background` (#e5e3ff) for text to maintain the neon-atmospheric vibe.
*   **Don’t** use 1px solid dividers. They feel "cheap" and "web-like." Use space or tonal shifts.
*   **Don’t** use "flat" buttons. Every primary action must feel like it has physical weight and volume.
*   **Don’t** use standard easing. Use "Back-Out" or "Elastic" transitions for UI elements to mimic game-engine animations.