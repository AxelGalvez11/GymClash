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
    <Text className="text-xs uppercase mb-1" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{text}</Text>
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
          className="flex-1 rounded-xl py-3 items-center active:scale-[0.98]"
          style={
            value === opt
              ? {
                  backgroundColor: '#23233f',
                  borderWidth: 1.5,
                  borderColor: '#ce96ff',
                  shadowColor: '#ce96ff',
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                }
              : {
                  backgroundColor: '#23233f',
                  borderWidth: 1.5,
                  borderColor: 'transparent',
                }
          }
          onPress={() => onChange(opt)}
        >
          <Text
            className="text-sm"
            style={{
              color: value === opt ? '#e5e3ff' : '#74738b',
              fontFamily: 'Lexend-SemiBold',
              fontWeight: '700',
            }}
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

  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('imperial');
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
    let bw = bodyWeight ? parseFloat(bodyWeight) : null;
    let ht = height ? parseFloat(height) : null;
    const hr = restingHR ? parseInt(restingHR, 10) : null;

    if (unitSystem === 'imperial') {
      if (bw !== null && (bw < 44 || bw > 660)) {
        Alert.alert('Error', 'Body weight must be between 44 and 660 lbs');
        return;
      }
      if (ht !== null && (ht < 39 || ht > 98)) {
        Alert.alert('Error', 'Height must be between 39 and 98 inches');
        return;
      }
      // Convert imperial to metric for storage
      if (bw !== null) bw = bw * 0.453592;
      if (ht !== null) ht = ht * 2.54;
    } else {
      if (bw !== null && (bw < 20 || bw > 300)) {
        Alert.alert('Error', 'Body weight must be between 20 and 300 kg');
        return;
      }
      if (ht !== null && (ht < 100 || ht > 250)) {
        Alert.alert('Error', 'Height must be between 100 and 250 cm');
        return;
      }
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
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-5" contentContainerClassName="pb-8">
        <View className="flex-row items-center pt-3 pb-5">
          <Pressable onPress={() => router.back()} className="mr-4 active:scale-[0.98]">
            <FontAwesome name="arrow-left" size={18} color="#aaa8c3" />
          </Pressable>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, letterSpacing: 1 }}>
            Body Data
          </Text>
        </View>

        <Text className="text-sm mb-6" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          Used to personalize your scoring, predict your trajectory, and make
          competition fairer. Your data is private and only used server-side.
        </Text>

        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>UNIT SYSTEM</Text>
          <View className="flex-row gap-2">
            <Pressable
              className="rounded-lg px-3 py-1.5 active:scale-[0.98]"
              style={{ backgroundColor: unitSystem === 'imperial' ? '#a434ff' : '#23233f' }}
              onPress={() => setUnitSystem('imperial')}
            >
              <Text style={{ color: unitSystem === 'imperial' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>LBS</Text>
            </Pressable>
            <Pressable
              className="rounded-lg px-3 py-1.5 active:scale-[0.98]"
              style={{ backgroundColor: unitSystem === 'metric' ? '#a434ff' : '#23233f' }}
              onPress={() => setUnitSystem('metric')}
            >
              <Text style={{ color: unitSystem === 'metric' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>KG</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-5 mb-8">
          {/* Body Weight */}
          <View>
            <SectionLabel text={unitSystem === 'imperial' ? 'Body Weight (lbs)' : 'Body Weight (kg)'} />
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-3 text-base"
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
              placeholder={unitSystem === 'imperial' ? 'e.g. 175' : 'e.g. 80'}
              placeholderTextColor="#74738b"
              value={bodyWeight}
              onChangeText={setBodyWeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Height */}
          <View>
            <SectionLabel text={unitSystem === 'imperial' ? 'Height (inches)' : 'Height (cm)'} />
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-3 text-base"
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
              placeholder={unitSystem === 'imperial' ? 'e.g. 70' : 'e.g. 175'}
              placeholderTextColor="#74738b"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Birth Date */}
          <View>
            <SectionLabel text="Birth Date (YYYY-MM-DD)" />
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-3 text-base"
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
              placeholder="e.g. 1995-06-15"
              placeholderTextColor="#74738b"
              value={birthDate}
              onChangeText={setBirthDate}
            />
            {age !== null && (
              <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Age: {age} years</Text>
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
            <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
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
            <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
              {runningExp === 'beginner' ? 'New to regular cardio'
                : runningExp === 'intermediate' ? 'Run or do cardio a few times a week'
                : runningExp === 'advanced' ? 'Experienced runner or endurance athlete'
                : 'Used to calibrate your starting baseline'}
            </Text>
          </View>

          {/* Resting Heart Rate */}
          <View>
            <SectionLabel text="Resting Heart Rate (bpm) -- optional" />
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-3 text-base"
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
              placeholder="e.g. 65"
              placeholderTextColor="#74738b"
              value={restingHR}
              onChangeText={setRestingHR}
              keyboardType="number-pad"
            />
            <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
              Measured at rest, sitting calmly. Used to estimate VO2max.
            </Text>
          </View>

          {/* Derived Stats */}
          {(maxHR !== null || vo2max !== null) && (
            <View className="bg-[#1d1d37] rounded-xl p-4">
              <Text className="mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>Estimated Stats</Text>
              {maxHR !== null && (
                <View className="flex-row justify-between py-1">
                  <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Max Heart Rate</Text>
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{maxHR} bpm</Text>
                </View>
              )}
              {vo2max !== null && (
                <View className="flex-row justify-between py-1">
                  <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Est. VO2max</Text>
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{vo2max} ml/kg/min</Text>
                </View>
              )}
              {vo2max !== null && (
                <Text className="text-xs mt-2" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
                  {vo2max >= 50 ? 'Excellent' : vo2max >= 40 ? 'Good' : vo2max >= 30 ? 'Average' : 'Below average'} cardiovascular fitness (Nes formula)
                </Text>
              )}
            </View>
          )}
        </View>

        <Pressable
          className="rounded-[2rem] py-4 items-center active:scale-[0.98]"
          style={{
            backgroundColor: '#a434ff',
            shadowColor: '#a434ff',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          }}
          onPress={handleSave}
          disabled={updateBiodata.isPending}
        >
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, letterSpacing: 1 }}>
            {updateBiodata.isPending ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>

        <Text className="text-xs text-center mt-4 px-4" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
          This data is never shown to other users. It is only used server-side
          for scoring and trajectory prediction.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
