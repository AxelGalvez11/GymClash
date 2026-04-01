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
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-8 justify-center">
        {/* Step 1: Name */}
        {step === 'name' && (
          <View>
            <Text className="text-4xl mb-2">⚔️</Text>
            <Text className="text-white text-3xl font-bold mb-2" style={{ fontFamily: 'SpaceMono' }}>
              Choose your name
            </Text>
            <Text className="text-white/50 mb-8" style={{ fontFamily: 'SpaceMono', fontSize: 13 }}>
              This is how other warriors will see you.
            </Text>

            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-lg mb-6"
              placeholder="Your warrior name"
              placeholderTextColor={Colors.text.muted}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              maxLength={20}
            />

            <Pressable
              className="py-3.5 items-center active:bg-white"
              style={{ borderWidth: 1, borderColor: '#ffffff' }}
              onPress={() => {
                if (!displayName.trim()) {
                  Alert.alert('Error', 'Enter a name to continue');
                  return;
                }
                setStep('ready');
              }}
            >
              {({ pressed }) => (
                <Text
                  className={`font-bold text-sm ${pressed ? 'text-black' : 'text-white'}`}
                  style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
                >
                  CONTINUE
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Step 2: Ready */}
        {step === 'ready' && (
          <View className="items-center">
            <Text className="text-6xl mb-4">🏆</Text>
            <Text className="text-white text-3xl font-bold mb-2 text-center" style={{ fontFamily: 'SpaceMono' }}>
              You're ready, {displayName}
            </Text>
            <Text className="text-white/50 text-center mb-2" style={{ fontFamily: 'SpaceMono', fontSize: 13 }}>
              Train in real life. Level up in game. Help your clan win.
            </Text>

            <View className="bg-surface-raised border border-surface-border rounded-xl p-4 w-full mt-6 mb-8">
              <View className="flex-row justify-between mb-2">
                <Text className="text-white/50">Rank</Text>
                <Text className="text-rank-bronze font-bold">Rookie</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-white/50">Level</Text>
                <Text className="text-white font-bold">1</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-white/50">First mission</Text>
                <Text className="text-white font-bold">Log your first workout</Text>
              </View>
            </View>

            <Pressable
              className="py-3.5 items-center active:bg-white w-full"
              style={{ borderWidth: 1, borderColor: '#ffffff' }}
              onPress={handleFinish}
              disabled={saving}
            >
              {({ pressed }) => (
                <Text
                  className={`font-bold text-sm ${pressed ? 'text-black' : 'text-white'}`}
                  style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
                >
                  {saving ? 'SETTING UP...' : 'ENTER THE ARENA'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Step indicator */}
      <View className="flex-row justify-center gap-2 pb-8">
        {(['name', 'ready'] as Step[]).map((s) => (
          <View
            key={s}
            className={`w-2 h-2 rounded-full ${
              s === step ? 'bg-white' : 'bg-white/20'
            }`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
