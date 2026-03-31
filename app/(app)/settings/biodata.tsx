import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useProfile, useUpdateBiodata } from '@/hooks/use-profile';

export default function BiodataScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const updateBiodata = useUpdateBiodata();

  const [bodyWeight, setBodyWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');

  useEffect(() => {
    if (profile) {
      setBodyWeight(profile.body_weight_kg?.toString() ?? '');
      setHeight(profile.height_cm?.toString() ?? '');
      setBirthDate(profile.birth_date ?? '');
      setSex((profile.biological_sex as 'male' | 'female') ?? '');
    }
  }, [profile]);

  function handleSave() {
    const bw = bodyWeight ? parseFloat(bodyWeight) : null;
    const ht = height ? parseFloat(height) : null;

    if (bw !== null && (bw < 20 || bw > 300)) {
      Alert.alert('Error', 'Body weight must be between 20 and 300 kg');
      return;
    }
    if (ht !== null && (ht < 100 || ht > 250)) {
      Alert.alert('Error', 'Height must be between 100 and 250 cm');
      return;
    }

    updateBiodata.mutate(
      {
        body_weight_kg: bw,
        height_cm: ht,
        birth_date: birthDate || null,
        biological_sex: sex || null,
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
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        <Pressable onPress={() => router.back()} className="py-4">
          <Text className="text-brand text-base">← Back</Text>
        </Pressable>

        <Text className="text-white text-2xl font-bold mb-2">Body Data</Text>
        <Text className="text-text-secondary text-sm mb-6">
          Optional. Used to normalize your strength scores with the Wilks
          coefficient — making scoring fairer across body weights. Your data is
          private and only used server-side for scoring.
        </Text>

        <View className="gap-4 mb-8">
          {/* Body Weight */}
          <View>
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Body Weight (kg)
            </Text>
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 80"
              placeholderTextColor="#6A6A8A"
              value={bodyWeight}
              onChangeText={setBodyWeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Height */}
          <View>
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Height (cm)
            </Text>
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 175"
              placeholderTextColor="#6A6A8A"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Birth Date */}
          <View>
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Birth Date (YYYY-MM-DD)
            </Text>
            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
              placeholder="e.g. 1995-06-15"
              placeholderTextColor="#6A6A8A"
              value={birthDate}
              onChangeText={setBirthDate}
            />
          </View>

          {/* Biological Sex */}
          <View>
            <Text className="text-text-secondary text-xs uppercase mb-1">
              Biological Sex (for Wilks coefficient)
            </Text>
            <View className="flex-row gap-3">
              {(['male', 'female'] as const).map((s) => (
                <Pressable
                  key={s}
                  className={`flex-1 border rounded-xl py-3 items-center ${
                    sex === s
                      ? 'border-brand bg-brand/10'
                      : 'border-surface-border bg-surface-raised'
                  }`}
                  onPress={() => setSex(s)}
                >
                  <Text
                    className={`font-bold capitalize ${
                      sex === s ? 'text-brand' : 'text-white'
                    }`}
                  >
                    {s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
          onPress={handleSave}
          disabled={updateBiodata.isPending}
        >
          <Text className="text-white text-lg font-bold">
            {updateBiodata.isPending ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>

        <Text className="text-text-muted text-xs text-center mt-4 px-4">
          This data is never shown to other users. It is only used server-side
          to calculate body-weight-adjusted strength scores.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
