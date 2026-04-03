# Phase 1: Onboarding Pipeline & SSO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2-step onboarding (name + ready) with the PRD's 7-step flow (name, biodata, experience, 1RM, cardio baseline, device placeholder, animated summary) and add Apple/Google SSO to the login screen.

**Architecture:** The onboarding screen at `app/(auth)/onboarding/index.tsx` is rewritten as a multi-step wizard using a `step` state index (0-6). Each step is its own component in `components/onboarding/`. Biodata is saved via the existing `updateBiodata` RPC on the summary step before navigating to home. SSO uses Supabase's built-in OAuth with `expo-auth-session` and `expo-web-browser`.

**Tech Stack:** React Native, Expo SDK 54, Expo Router, NativeWind v4, Supabase Auth, TanStack Query, Zustand

---

## File Structure

### New Files
- `components/onboarding/StepIndicator.tsx` — Progress bar + step dots for 7 steps
- `components/onboarding/StepName.tsx` — Step 0: Display name input (extracted from current onboarding)
- `components/onboarding/StepBiodata.tsx` — Step 1: Age, sex, weight, height, unit toggle
- `components/onboarding/StepExperience.tsx` — Step 2: Experience level card selector
- `components/onboarding/StepOneRepMax.tsx` — Step 3: Optional 1RM inputs (squat, bench, deadlift, OHP)
- `components/onboarding/StepCardioBaseline.tsx` — Step 4: Max HR calc, VO2 max display
- `components/onboarding/StepDeviceConnect.tsx` — Step 5: Device connection placeholders
- `components/onboarding/StepSummary.tsx` — Step 6: Animated summary card + "Enter the Arena"
- `components/onboarding/types.ts` — Shared onboarding form state type

### Modified Files
- `app/(auth)/onboarding/index.tsx` — Rewrite as multi-step wizard coordinator
- `app/(auth)/login.tsx` — Add Apple/Google SSO buttons
- `package.json` — Add `expo-auth-session`, `expo-web-browser`, `expo-apple-authentication`

---

## Task 1: Onboarding Types & Step Indicator

**Files:**
- Create: `components/onboarding/types.ts`
- Create: `components/onboarding/StepIndicator.tsx`

- [ ] **Step 1: Create shared onboarding form state type**

```typescript
// components/onboarding/types.ts
export type ExperienceLevel = 'never_trained' | 'beginner' | 'intermediate' | 'advanced';
export type SexOption = 'male' | 'female' | 'prefer_not_to_say';
export type UnitSystem = 'metric' | 'imperial';

export interface OnboardingFormState {
  readonly displayName: string;
  readonly bodyWeight: string;
  readonly height: string;
  readonly birthDate: string;
  readonly sex: SexOption | '';
  readonly unitSystem: UnitSystem;
  readonly liftingExperience: ExperienceLevel | '';
  readonly runningExperience: ExperienceLevel | '';
  readonly squat1RM: string;
  readonly bench1RM: string;
  readonly deadlift1RM: string;
  readonly ohp1RM: string;
  readonly restingHR: string;
  readonly maxHROverride: string;
}

export const INITIAL_FORM_STATE: OnboardingFormState = {
  displayName: '',
  bodyWeight: '',
  height: '',
  birthDate: '',
  sex: '',
  unitSystem: 'metric',
  liftingExperience: '',
  runningExperience: '',
  squat1RM: '',
  bench1RM: '',
  deadlift1RM: '',
  ohp1RM: '',
  restingHR: '',
  maxHROverride: '',
};

export const STEP_LABELS = [
  'Name',
  'Body Data',
  'Experience',
  'Strength',
  'Cardio',
  'Devices',
  'Summary',
] as const;

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const TOTAL_STEPS = 7;
```

- [ ] **Step 2: Create StepIndicator component using existing ProgressBar**

```typescript
// components/onboarding/StepIndicator.tsx
import { View, Text } from 'react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { STEP_LABELS, type OnboardingStep, TOTAL_STEPS } from './types';

interface StepIndicatorProps {
  readonly currentStep: OnboardingStep;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <View className="px-8 pt-4 pb-2">
      <ProgressBar
        current={currentStep + 1}
        max={TOTAL_STEPS}
        color="#a434ff"
        height="sm"
      />
      <View className="flex-row justify-between mt-2">
        <Text
          style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}
        >
          STEP {currentStep + 1} OF {TOTAL_STEPS}
        </Text>
        <Text
          style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}
        >
          {STEP_LABELS[currentStep]}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**
```
git add components/onboarding/types.ts components/onboarding/StepIndicator.tsx
git commit -m "feat(onboarding): add shared types and step indicator component"
```

---

## Task 2: Step 0 — Display Name

**Files:**
- Create: `components/onboarding/StepName.tsx`

- [ ] **Step 1: Extract name step into standalone component**

```typescript
// components/onboarding/StepName.tsx
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import type { OnboardingFormState } from './types';

interface StepNameProps {
  readonly form: OnboardingFormState;
  readonly onUpdate: (updates: Partial<OnboardingFormState>) => void;
  readonly onNext: () => void;
}

export function StepName({ form, onUpdate, onNext }: StepNameProps) {
  function handleContinue() {
    if (!form.displayName.trim()) {
      Alert.alert('Error', 'Enter a name to continue');
      return;
    }
    onNext();
  }

  return (
    <View>
      <Text className="text-4xl mb-2">///</Text>
      <Text
        className="text-3xl mb-2"
        style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
      >
        Choose your name
      </Text>
      <Text
        className="mb-8"
        style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}
      >
        This is how other warriors will see you.
      </Text>

      <TextInput
        className="bg-[#000000] rounded-xl px-4 py-4 text-lg mb-6"
        style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
        placeholder="Your warrior name"
        placeholderTextColor="#74738b"
        value={form.displayName}
        onChangeText={(text) => onUpdate({ displayName: text })}
        autoFocus
        maxLength={20}
      />

      <Pressable
        className="py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
        style={{
          backgroundColor: '#a434ff',
          shadowColor: '#a434ff',
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 10,
        }}
        onPress={handleContinue}
      >
        <Text
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
        >
          CONTINUE
        </Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

---

## Task 3: Step 1 — Physical Biodata

**Files:**
- Create: `components/onboarding/StepBiodata.tsx`

Reuses patterns from existing `settings/biodata.tsx`. Includes metric/imperial toggle, age/sex/weight/height fields. All required to proceed.

---

## Task 4: Step 2 — Experience Level

**Files:**
- Create: `components/onboarding/StepExperience.tsx`

Four single-select cards: Never Trained, Beginner, Intermediate, Advanced with one-line descriptions. Separate selectors for lifting and running experience.

---

## Task 5: Step 3 — Lifting 1RM (Optional)

**Files:**
- Create: `components/onboarding/StepOneRepMax.tsx`

Optional fields for squat, bench, deadlift, OHP estimated 1RM. "Skip this for now" link at bottom. Skipping is valid — no validation on empty fields.

---

## Task 6: Step 4 — Cardio Baseline

**Files:**
- Create: `components/onboarding/StepCardioBaseline.tsx`

Calculates max HR (220 - age) from biodata entered in Step 1. User can override. Shows estimated VO2 max read-only if resting HR was provided. Resting HR input included here.

---

## Task 7: Step 5 — Device Connection (Placeholder)

**Files:**
- Create: `components/onboarding/StepDeviceConnect.tsx`

Lists Apple Watch, Garmin, other HR/GPS trackers. Each has a "Connect" button that shows a "Coming Soon" alert. "Skip for now" link at bottom.

---

## Task 8: Step 6 — Animated Summary

**Files:**
- Create: `components/onboarding/StepSummary.tsx`

Animated summary card showing: calculated baseline stats (weight, height, experience, max HR, estimated rank). Character emoji display. Large "ENTER THE ARENA" button that saves all data and navigates to home.

---

## Task 9: Rewrite Onboarding Coordinator

**Files:**
- Modify: `app/(auth)/onboarding/index.tsx`

Replace entire file. Manages `OnboardingFormState` via `useState`. Renders `StepIndicator` + current step component. Back button on steps 1-5 (not on step 0 or 6). Calls `updateProfile` + `updateBiodata` on finish.

---

## Task 10: Add SSO to Login Screen

**Files:**
- Modify: `app/(auth)/login.tsx`
- Modify: `package.json` (add deps)

Add Apple Sign In and Google Sign In buttons below the email/password form. Uses `supabase.auth.signInWithOAuth({ provider: 'apple' | 'google' })` with `expo-auth-session` redirect handling. Visual divider "OR" between email form and SSO buttons.

---

## Execution Order

Tasks 1-8 are independent step components — can be built in parallel.
Task 9 depends on all step components (1-8).
Task 10 (SSO) is fully independent of onboarding tasks.

**Parallel dispatch plan:**
- Batch 1: Tasks 1, 2, 3, 4, 5, 6, 7, 8, 10 (all in parallel)
- Batch 2: Task 9 (coordinator, after batch 1 completes)
