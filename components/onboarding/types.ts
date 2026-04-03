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
  readonly consentGps: boolean;
  readonly consentHr: boolean;
  readonly consentBiodata: boolean;
}

export const INITIAL_FORM_STATE: OnboardingFormState = {
  displayName: '',
  bodyWeight: '',
  height: '',
  birthDate: '',
  sex: '',
  unitSystem: 'imperial',
  liftingExperience: '',
  runningExperience: '',
  squat1RM: '',
  bench1RM: '',
  deadlift1RM: '',
  ohp1RM: '',
  restingHR: '',
  maxHROverride: '',
  consentGps: false,
  consentHr: false,
  consentBiodata: false,
};

export const STEP_LABELS = [
  'Name',
  'Body Data',
  'Experience',
  'Strength',
  'Cardio',
  'Devices',
  'Privacy',
  'Summary',
] as const;

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const TOTAL_STEPS = 8;
