import type { OnboardingFormState } from '@/components/onboarding/types';

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

export interface OnboardingBiodataPayload {
  body_weight_kg?: number | null;
  height_cm?: number | null;
  birth_date?: string | null;
  biological_sex?: string | null;
  lifting_experience?: string | null;
  running_experience?: string | null;
  resting_hr?: number | null;
  estimated_vo2max?: number | null;
  max_heart_rate?: number | null;
}

/** Convert MM-DD-YYYY display format to YYYY-MM-DD for storage. */
function displayDateToIso(display: string): string {
  const match = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return display; // already ISO or invalid — pass through
  return `${match[3]}-${match[1]}-${match[2]}`;
}

function computeAgeFromIsoDate(isoDate: string): number | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const birthDate = new Date(year, month - 1, day);
  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function parsePositiveNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function buildOnboardingBiodataPayload(form: OnboardingFormState): OnboardingBiodataPayload {
  const payload: OnboardingBiodataPayload = {};
  const isImperial = form.unitSystem === 'imperial';

  const bodyWeight = parsePositiveNumber(form.bodyWeight);
  if (bodyWeight !== null) {
    payload.body_weight_kg = isImperial ? bodyWeight * LB_TO_KG : bodyWeight;
  }

  // Height: for imperial, prefer ft/in fields if available
  if (isImperial && form.heightFt) {
    const ft = Number.parseInt(form.heightFt, 10);
    const inches = Number.parseInt(form.heightIn || '0', 10);
    if (Number.isFinite(ft)) {
      payload.height_cm = (ft * 12 + (Number.isFinite(inches) ? inches : 0)) * IN_TO_CM;
    }
  } else {
    const height = parsePositiveNumber(form.height);
    if (height !== null) {
      payload.height_cm = isImperial ? height * IN_TO_CM : height;
    }
  }

  const rawBirthDate = form.birthDate.trim();
  const birthDate = rawBirthDate.length > 0 ? displayDateToIso(rawBirthDate) : '';
  if (birthDate.length > 0) {
    payload.birth_date = birthDate;
  }

  if (form.sex) {
    payload.biological_sex = form.sex;
  }

  if (form.liftingExperience) {
    payload.lifting_experience = form.liftingExperience;
  }

  if (form.runningExperience) {
    payload.running_experience = form.runningExperience;
  }

  const restingHeartRate = parsePositiveInteger(form.restingHR);
  if (restingHeartRate !== null) {
    payload.resting_hr = restingHeartRate;
  }

  const maxHeartRateOverride = parsePositiveInteger(form.maxHROverride);
  const derivedAge = birthDate.length > 0 ? computeAgeFromIsoDate(birthDate) : null;
  const derivedMaxHeartRate =
    maxHeartRateOverride ??
    (derivedAge !== null ? 220 - derivedAge : null);

  if (derivedMaxHeartRate !== null) {
    payload.max_heart_rate = derivedMaxHeartRate;
  }

  if (derivedMaxHeartRate !== null && restingHeartRate !== null) {
    payload.estimated_vo2max = roundOneDecimal(15.3 * (derivedMaxHeartRate / restingHeartRate));
  }

  return payload;
}

export function hasOnboardingBiodataPayload(payload: OnboardingBiodataPayload) {
  return Object.keys(payload).length > 0;
}
