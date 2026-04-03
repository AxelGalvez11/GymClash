import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { useProfile, useUpdateBiodata } from '@/hooks/use-profile';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type SexOption = 'male' | 'female';

function SectionLabel({ text }: { readonly text: string }) {
  return (
    <Text className="text-xs uppercase mb-1" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{text}</Text>
  );
}

function ScrollPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  label,
}: {
  readonly value: number;
  readonly onChange: (v: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly suffix?: string;
  readonly label: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View className="mb-4">
      <Text className="text-xs uppercase mb-2" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{label}</Text>
      <View className="flex-row items-center justify-center gap-4">
        <Pressable
          className="w-10 h-10 rounded-full bg-[#23233f] items-center justify-center active:scale-[0.95]"
          onPress={() => onChange(clamp(value - step))}
        >
          <FontAwesome name="minus" size={14} color="#aaa8c3" />
        </Pressable>
        <View className="bg-[#000000] rounded-xl px-6 py-3 min-w-[120px] items-center">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 24 }}>
            {value}{suffix ? ` ${suffix}` : ''}
          </Text>
        </View>
        <Pressable
          className="w-10 h-10 rounded-full bg-[#23233f] items-center justify-center active:scale-[0.95]"
          onPress={() => onChange(clamp(value + step))}
        >
          <FontAwesome name="plus" size={14} color="#aaa8c3" />
        </Pressable>
      </View>
    </View>
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
  const [bodyWeight, setBodyWeight] = useState(150);
  const [heightCm, setHeightCm] = useState(175);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(8);
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<SexOption | ''>('');
  const [liftingExp, setLiftingExp] = useState<ExperienceLevel | ''>('');
  const [runningExp, setRunningExp] = useState<ExperienceLevel | ''>('');
  const [restingHR, setRestingHR] = useState(65);

  useEffect(() => {
    if (profile) {
      const weightKg = profile.body_weight_kg ?? null;
      const htCm = profile.height_cm ?? null;

      if (unitSystem === 'imperial') {
        setBodyWeight(weightKg ? Math.round(weightKg / 0.453592) : 150);
        if (htCm) {
          const totalIn = Math.round(htCm / 2.54);
          setHeightFt(Math.floor(totalIn / 12));
          setHeightIn(totalIn % 12);
        }
      } else {
        setBodyWeight(weightKg ? Math.round(weightKg) : 70);
        setHeightCm(htCm ? Math.round(htCm) : 175);
      }

      setBirthDate(profile.birth_date ?? '');
      setSex((profile.biological_sex as SexOption) ?? '');
      setLiftingExp((profile.lifting_experience as ExperienceLevel) ?? '');
      setRunningExp((profile.running_experience as ExperienceLevel) ?? '');
      setRestingHR(profile.resting_hr ?? 65);
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
  const vo2max =
    maxHR !== null && restingHR >= 30 && restingHR <= 120
      ? Math.round(15.3 * (maxHR / restingHR) * 10) / 10
      : null;

  function handleSwitchToImperial() {
    if (unitSystem === 'imperial') return;
    Alert.alert('Convert to LBS?', 'Your current values will be converted from KG to LBS.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert', onPress: () => {
          // Convert current kg weight to lbs
          const bwLbs = Math.round(bodyWeight / 0.453592);
          setBodyWeight(bwLbs);
          // Convert current cm height to feet + inches
          const totalIn = Math.round(heightCm / 2.54);
          setHeightFt(Math.floor(totalIn / 12));
          setHeightIn(totalIn % 12);
          setUnitSystem('imperial');
        },
      },
    ]);
  }

  function handleSwitchToMetric() {
    if (unitSystem === 'metric') return;
    Alert.alert('Convert to KG?', 'Your current values will be converted from LBS to KG.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Convert', onPress: () => {
          // Convert current lbs weight to kg
          const bwKg = Math.round(bodyWeight * 0.453592);
          setBodyWeight(bwKg);
          // Convert current feet+inches to cm
          const totalInches = heightFt * 12 + heightIn;
          const cm = Math.round(totalInches * 2.54);
          setHeightCm(cm);
          setUnitSystem('metric');
        },
      },
    ]);
  }

  function handleSave() {
    let bwKg: number | null = bodyWeight;
    let htCm: number | null;

    if (unitSystem === 'imperial') {
      if (bwKg < 44 || bwKg > 660) {
        Alert.alert('Error', 'Body weight must be between 44 and 660 lbs');
        return;
      }
      const totalInches = heightFt * 12 + heightIn;
      if (totalInches < 39 || totalInches > 98) {
        Alert.alert('Error', 'Height must be between 39 and 98 inches');
        return;
      }
      // Convert imperial to metric for storage
      bwKg = bwKg * 0.453592;
      htCm = totalInches * 2.54;
    } else {
      if (bwKg < 20 || bwKg > 300) {
        Alert.alert('Error', 'Body weight must be between 20 and 300 kg');
        return;
      }
      htCm = heightCm;
      if (htCm < 100 || htCm > 250) {
        Alert.alert('Error', 'Height must be between 100 and 250 cm');
        return;
      }
    }

    if (restingHR < 30 || restingHR > 120) {
      Alert.alert('Error', 'Resting heart rate must be between 30 and 120 bpm');
      return;
    }

    updateBiodata.mutate(
      {
        body_weight_kg: bwKg,
        height_cm: htCm,
        birth_date: birthDate || null,
        biological_sex: sex || null,
        lifting_experience: liftingExp || null,
        running_experience: runningExp || null,
        resting_hr: restingHR,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Your biodata has been updated.', [
            { text: 'OK', onPress: () => router.replace('/(app)/home' as any) },
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
          <Pressable onPress={() => router.replace('/(app)/settings' as any)} className="mr-4 active:scale-[0.98]">
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
              onPress={handleSwitchToImperial}
            >
              <Text style={{ color: unitSystem === 'imperial' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>LBS</Text>
            </Pressable>
            <Pressable
              className="rounded-lg px-3 py-1.5 active:scale-[0.98]"
              style={{ backgroundColor: unitSystem === 'metric' ? '#a434ff' : '#23233f' }}
              onPress={handleSwitchToMetric}
            >
              <Text style={{ color: unitSystem === 'metric' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>KG</Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-5 mb-8">
          {/* Body Weight */}
          <ScrollPicker
            label={unitSystem === 'imperial' ? 'BODY WEIGHT (LBS)' : 'BODY WEIGHT (KG)'}
            value={bodyWeight}
            onChange={setBodyWeight}
            min={unitSystem === 'imperial' ? 44 : 20}
            max={unitSystem === 'imperial' ? 660 : 300}
            step={1}
            suffix={unitSystem === 'imperial' ? 'lbs' : 'kg'}
          />

          {/* Height */}
          {unitSystem === 'imperial' ? (
            <View>
              <Text className="text-xs uppercase mb-2" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>HEIGHT</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <ScrollPicker
                    label="FEET"
                    value={heightFt}
                    onChange={setHeightFt}
                    min={3}
                    max={7}
                    step={1}
                    suffix="ft"
                  />
                </View>
                <View className="flex-1">
                  <ScrollPicker
                    label="INCHES"
                    value={heightIn}
                    onChange={setHeightIn}
                    min={0}
                    max={11}
                    step={1}
                    suffix="in"
                  />
                </View>
              </View>
            </View>
          ) : (
            <ScrollPicker
              label="HEIGHT (CM)"
              value={heightCm}
              onChange={setHeightCm}
              min={100}
              max={250}
              step={1}
              suffix="cm"
            />
          )}

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

          {/* Estimated Max Heart Rate (derived from age) */}
          {age !== null && (
            <View className="bg-[#1d1d37] rounded-xl p-3 mb-4">
              <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>ESTIMATED MAX HEART RATE</Text>
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 20 }}>{220 - age} bpm</Text>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>Formula: 220 - age ({age})</Text>
            </View>
          )}

          {/* Biological Sex */}
          <View>
            <SectionLabel text="Biological Sex (for Wilks coefficient)" />
            <OptionPicker
              options={['male', 'female'] as const}
              value={sex}
              onChange={setSex}
              labels={{ male: 'Male', female: 'Female' }}
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
            <ScrollPicker
              label="RESTING HEART RATE (BPM) -- OPTIONAL"
              value={restingHR}
              onChange={setRestingHR}
              min={30}
              max={120}
              step={1}
              suffix="bpm"
            />
            <Text className="text-xs mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
              Measured at rest, sitting calmly. Used to estimate VO2max.
            </Text>
          </View>

          {/* Derived Stats */}
          {vo2max !== null && (
            <View className="bg-[#1d1d37] rounded-xl p-4">
              <Text className="mb-2" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontWeight: '700' }}>Estimated Stats</Text>
              <View className="flex-row justify-between py-1">
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Est. VO2max</Text>
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>{vo2max} ml/kg/min</Text>
              </View>
              <Text className="text-xs mt-2" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
                {vo2max >= 50 ? 'Excellent' : vo2max >= 40 ? 'Good' : vo2max >= 30 ? 'Average' : 'Below average'} cardiovascular fitness (Nes formula)
              </Text>
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
