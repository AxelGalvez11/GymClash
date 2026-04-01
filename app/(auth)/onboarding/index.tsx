import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { updateProfile } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'name' | 'ready';

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('name');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Enter a display name');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['needs-onboarding'] });
      router.replace('/(app)/home');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <View className="flex-1 px-8 justify-center">
        {/* Step 1: Name */}
        {step === 'name' && (
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
              value={displayName}
              onChangeText={setDisplayName}
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
              onPress={() => {
                if (!displayName.trim()) {
                  Alert.alert('Error', 'Enter a name to continue');
                  return;
                }
                setStep('ready');
              }}
            >
              <Text
                style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
              >
                CONTINUE
              </Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Ready */}
        {step === 'ready' && (
          <View className="items-center">
            <Text className="text-6xl mb-4" style={{ color: '#ffd709' }}>{'<>'}</Text>
            <Text
              className="text-3xl mb-2 text-center"
              style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
            >
              You're ready, {displayName}
            </Text>
            <Text
              className="text-center mb-2"
              style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}
            >
              Train in real life. Level up in game. Help your clan win.
            </Text>

            <View className="bg-[#1d1d37] rounded-xl p-4 w-full mt-6 mb-8">
              <View className="flex-row justify-between mb-2">
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Rank</Text>
                <Text className="text-rank-bronze" style={{ fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>Rookie</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Level</Text>
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>1</Text>
              </View>
              <View className="flex-row justify-between">
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>First mission</Text>
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>Log your first workout</Text>
              </View>
            </View>

            <Pressable
              className="py-3.5 items-center w-full rounded-[2rem] active:scale-[0.98]"
              style={{
                backgroundColor: '#a434ff',
                shadowColor: '#a434ff',
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              }}
              onPress={handleFinish}
              disabled={saving}
            >
              <Text
                style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
              >
                {saving ? 'SETTING UP...' : 'ENTER THE ARENA'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Step indicator */}
      <View className="flex-row justify-center gap-2 pb-8">
        {(['name', 'ready'] as Step[]).map((s) => (
          <View
            key={s}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: s === step ? '#ce96ff' : 'rgba(206,150,255,0.2)',
            }}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
