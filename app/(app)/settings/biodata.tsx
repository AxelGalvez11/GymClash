import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { useProfile, useUpdateBiodata } from '@/hooks/use-profile';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type SexOption = 'male' | 'female' | 'prefer_not_to_say';

function SectionLabel({ text }: { readonly text: string }) {
  return (
    <Text className="text-text-secondary text-xs uppercase mb-1">{text}</Text>
  );
}

function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  readonly options: readonly T[];
  readonly value: T | '';
  readonly onChange: (v: T) => void;
  readonly labels?: Record<T, string>;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => (
        <Pressable
          key={opt}
          className={`flex-1 border rounded-xl py-3 items-center ${
            value === opt
              ? 'border-white bg-white/10'
              : 'border-surface-border bg-surface-raised'
          }`}
          onPress={() => onChange(opt)}
        >
          <Text
            className={`font-bold text-sm ${
              value === opt ? 'text-white' : 'text-white/50'
            }`}
          >
            {labels?.[opt] ?? opt}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function BiodataScreen() {
  const router = useRouter();
  const accent = useAccent();
  const { data: profile } = useProfile();
  const updateBiodata = useUpdateBiodata();

  const [bodyWeight, setBodyWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<SexOption | ''>('');
  const [liftingExp, setLiftingExp] = useState<ExperienceLevel | ''>('');
  const [runningExp, setRunningExp] = useState<ExperienceLevel | ''>('');
  const [restingHR, setRestingHR] = useState('');

  useEffect(() => {
    if (profile) {
      setBodyWeight(profile.body_weight_kg?.toString() ?? '');
      setHeight(profile.height_cm?.toString() ?? '');
      setBirthDate(profile.birth_date ?? '');
      setSex((profile.biological_sex as SexOption) ?? '');
      setLiftingExp((profile.lifting_experience as ExperienceLevel) ?? '');
      setRunningExp((profile.running_experience as ExperienceLevel) ?? '');
      setRestingHR(profile.resting_hr?.toString() ?? '');
    }
  }, [profile]);

  // Derived calculations
  const age = useMemo(() => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    return years > 0 && years < 120 ? years : null;
  }, [birthDate]);

  const maxHR = age !== null ? 220 - age : null;
  const rhr = restingHR ? parseInt(restingHR, 10) : null;
  const vo2max =
    maxHR !== null && rhr !== null && rhr >= 30 && rhr <= 120
      ? Math.round(15.3 * (maxHR / rhr) * 10) / 10
      : null;

  function handleSave() {
    const bw = bodyWeight ? parseFloat(bodyWeight) : null;
    const ht = height ? parseFloat(height) : null;
    const hr = restingHR ? parseInt(restingHR, 10) : null;

    if (bw !== null && (bw < 20 || bw > 300)) {
      Alert.alert('Error', 'Body weight must be between 20 and 300 kg');
      return;
    }
    if (ht !== null && (ht < 100 || ht > 250)) {
      Alert.alert('Error', 'Height must be between 100 and 250 cm');
      return;
    }
    if (hr !== null && (hr < 30 || hr > 120)) {
      Alert.alert('Error', 'Resting heart rate must be between 30 and 120 bpm');
      return;
    }

    updateBiodata.mutate(
      {
        body_weight_kg: bw,
        height_cm: ht,
        birth_date: birthDate || null,
        biological_sex: sex || null,
        lifting_experience: liftingExp || null,
        running_experience: runningExp || null,
        resting_hr: hr,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Your biodata has been updated.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: (err: any) => Alert.alert('Error', err.message ?? 'Failed to save'),
      }
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-8">
        <View className="flex-row items-center pt-3 pb-5">
          <Pressable onPress={() => router.back()} className="mr-4 active:opacity-60">
            <FontAwesome name="arrow-left" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Text className="text-white text-lg font-bold" style={{ fontFamily: 'SpaceMono', letterSpacing: 1 }}>
            Body Data
          </Text>
        </View>

        <Text className="text-text-secondary text-sm mb-6">
          Used to personalize your scoring, predict your trajectory, and make
          competition fairer. Your data is private and only used server-side.
        </Text>

        <View className="gap-5 mb-8">
          {/* Body Weight */}
          <View>
            <SectionLabel text="Body Weight (kg)" />
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 80"
              placeholderTextColor={Colors.text.muted}
              value={bodyWeight}
              onChangeText={setBodyWeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Height */}
          <View>
            <SectionLabel text="Height (cm)" />
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 175"
              placeholderTextColor={Colors.text.muted}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Birth Date */}
          <View>
            <SectionLabel text="Birth Date (YYYY-MM-DD)" />
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 1995-06-15"
              placeholderTextColor={Colors.text.muted}
              value={birthDate}
              onChangeText={setBirthDate}
            />
            {age !== null && (
              <Text className="text-text-muted text-xs mt-1">Age: {age} years</Text>
            )}
          </View>

          {/* Biological Sex */}
          <View>
            <SectionLabel text="Biological Sex (for Wilks coefficient)" />
            <OptionPicker
              options={['male', 'female', 'prefer_not_to_say'] as const}
              value={sex}
              onChange={setSex}
              labels={{ male: 'Male', female: 'Female', prefer_not_to_say: 'Prefer not to say' }}
            />
          </View>

          {/* Lifting Experience */}
          <View>
            <SectionLabel text="Lifting Experience" />
            <OptionPicker
              options={['beginner', 'intermediate', 'advanced'] as const}
              value={liftingExp}
              onChange={setLiftingExp}
              labels={{ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }}
            />
            <Text className="text-text-muted text-xs mt-1">
              {liftingExp === 'beginner' ? 'Less than 6 months of consistent training'
                : liftingExp === 'intermediate' ? '6 months to 2 years of consistent training'
                : liftingExp === 'advanced' ? '2+ years of consistent training'
                : 'Used to calibrate your starting baseline'}
            </Text>
          </View>

          {/* Running Experience */}
          <View>
            <SectionLabel text="Running / Cardio Experience" />
            <OptionPicker
              options={['beginner', 'intermediate', 'advanced'] as const}
              value={runningExp}
              onChange={setRunningExp}
              labels={{ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }}
            />
            <Text className="text-text-muted text-xs mt-1">
              {runningExp === 'beginner' ? 'New to regular cardio'
                : runningExp === 'intermediate' ? 'Run or do cardio a few times a week'
                : runningExp === 'advanced' ? 'Experienced runner or endurance athlete'
                : 'Used to calibrate your starting baseline'}
            </Text>
          </View>

          {/* Resting Heart Rate */}
          <View>
            <SectionLabel text="Resting Heart Rate (bpm) — optional" />
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 65"
              placeholderTextColor={Colors.text.muted}
              value={restingHR}
              onChangeText={setRestingHR}
              keyboardType="number-pad"
            />
            <Text className="text-text-muted text-xs mt-1">
              Measured at rest, sitting calmly. Used to estimate VO2max.
            </Text>
          </View>

          {/* Derived Stats */}
          {(maxHR !== null || vo2max !== null) && (
            <View className="bg-surface-raised border border-surface-border rounded-xl p-4">
              <Text className="text-white font-bold mb-2">Estimated Stats</Text>
              {maxHR !== null && (
                <View className="flex-row justify-between py-1">
                  <Text className="text-text-secondary">Max Heart Rate</Text>
                  <Text className="text-white font-bold">{maxHR} bpm</Text>
                </View>
              )}
              {vo2max !== null && (
                <View className="flex-row justify-between py-1">
                  <Text className="text-text-secondary">Est. VO2max</Text>
                  <Text className="text-white font-bold">{vo2max} ml/kg/min</Text>
                </View>
              )}
              {vo2max !== null && (
                <Text className="text-text-muted text-xs mt-2">
                  {vo2max >= 50 ? 'Excellent' : vo2max >= 40 ? 'Good' : vo2max >= 30 ? 'Average' : 'Below average'} cardiovascular fitness (Nes formula)
                </Text>
              )}
            </View>
          )}
        </View>

        <Pressable
          className="rounded-xl py-4 items-center active:opacity-70"
          style={{ backgroundColor: accent.DEFAULT }}
          onPress={handleSave}
          disabled={updateBiodata.isPending}
        >
          <Text className="text-white text-lg font-bold" style={{ fontFamily: 'SpaceMono', letterSpacing: 1 }}>
            {updateBiodata.isPending ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>

        <Text className="text-text-muted text-xs text-center mt-4 px-4">
          This data is never shown to other users. It is only used server-side
          for scoring and trajectory prediction.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
