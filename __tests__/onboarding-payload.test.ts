import { buildOnboardingBiodataPayload, hasOnboardingBiodataPayload } from '@/lib/onboarding';
import { INITIAL_FORM_STATE, type OnboardingFormState } from '@/components/onboarding/types';

function buildForm(overrides: Partial<OnboardingFormState>): OnboardingFormState {
  return {
    ...INITIAL_FORM_STATE,
    ...overrides,
  };
}

describe('buildOnboardingBiodataPayload', () => {
  it('persists experience and resting heart rate even when body fields are skipped', () => {
    const payload = buildOnboardingBiodataPayload(
      buildForm({
        liftingExperience: 'beginner',
        runningExperience: 'intermediate',
        restingHR: '58',
      }),
    );

    expect(hasOnboardingBiodataPayload(payload)).toBe(true);
    expect(payload.lifting_experience).toBe('beginner');
    expect(payload.running_experience).toBe('intermediate');
    expect(payload.resting_hr).toBe(58);
  });

  it('converts imperial body data before saving', () => {
    const payload = buildOnboardingBiodataPayload(
      buildForm({
        unitSystem: 'imperial',
        bodyWeight: '176',
        height: '69',
      }),
    );

    expect(payload.body_weight_kg).toBeCloseTo(79.832192);
    expect(payload.height_cm).toBeCloseTo(175.26);
  });

  it('stores cardio-derived metrics from max heart rate override and resting heart rate', () => {
    const payload = buildOnboardingBiodataPayload(
      buildForm({
        maxHROverride: '190',
        restingHR: '50',
      }),
    );

    expect(payload.max_heart_rate).toBe(190);
    expect(payload.estimated_vo2max).toBe(58.1);
  });
});
