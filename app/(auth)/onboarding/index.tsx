import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { updateProfile } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'name' | 'focus' | 'ready';

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('name');
  const [displayName, setDisplayName] = useState('');
  const [focus, setFocus] = useState<'strength' | 'scout' | 'both' | null>(null);
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
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-8 justify-center">
        {/* Step 1: Name */}
        {step === 'name' && (
          <View>
            <Text className="text-4xl mb-2">⚔️</Text>
            <Text className="text-white text-3xl font-bold mb-2">
              Choose your name
            </Text>
            <Text className="text-text-secondary mb-8">
              This is how other warriors will see you.
            </Text>

            <TextInput
              className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-lg mb-6"
              placeholder="Your warrior name"
              placeholderTextColor="#6A6A8A"
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              maxLength={20}
            />

            <Pressable
              className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
              onPress={() => {
                if (!displayName.trim()) {
                  Alert.alert('Error', 'Enter a name to continue');
                  return;
                }
                setStep('focus');
              }}
            >
              <Text className="text-white text-lg font-bold">Continue</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Training Focus */}
        {step === 'focus' && (
          <View>
            <Text className="text-white text-3xl font-bold mb-2">
              What's your focus?
            </Text>
            <Text className="text-text-secondary mb-8">
              This helps us personalize your dashboard. You can always do both.
            </Text>

            <View className="gap-3 mb-8">
              {[
                { value: 'strength' as const, icon: 'heartbeat' as const, label: 'Lifting', desc: 'Squat, bench, deadlift — build strength' },
                { value: 'scout' as const, icon: 'road' as const, label: 'Running', desc: 'Runs, jogs, sprints — cover ground' },
                { value: 'both' as const, icon: 'bolt' as const, label: 'Both', desc: 'Train everything — earn in every way' },
              ].map((opt) => (
                <Pressable
                  key={opt.value}
                  className={`border rounded-xl p-4 flex-row items-center gap-4 ${
                    focus === opt.value
                      ? 'border-brand bg-brand/10'
                      : 'border-surface-border bg-surface-raised'
                  }`}
                  onPress={() => setFocus(opt.value)}
                >
                  <FontAwesome
                    name={opt.icon}
                    size={24}
                    color={focus === opt.value ? Colors.brand.DEFAULT : Colors.text.muted}
                  />
                  <View className="flex-1">
                    <Text className={focus === opt.value ? 'text-brand font-bold text-lg' : 'text-white font-bold text-lg'}>
                      {opt.label}
                    </Text>
                    <Text className="text-text-muted text-sm">{opt.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
              onPress={() => setStep('ready')}
            >
              <Text className="text-white text-lg font-bold">Continue</Text>
            </Pressable>
          </View>
        )}

        {/* Step 3: Ready */}
        {step === 'ready' && (
          <View className="items-center">
            <Text className="text-6xl mb-4">🏆</Text>
            <Text className="text-white text-3xl font-bold mb-2 text-center">
              You're ready, {displayName}
            </Text>
            <Text className="text-text-secondary text-center mb-2">
              Train in real life. Level up in game. Help your clan win.
            </Text>

            <View className="bg-surface-raised border border-surface-border rounded-xl p-4 w-full mt-6 mb-8">
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary">Rank</Text>
                <Text className="text-rank-bronze font-bold">Bronze</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary">Level</Text>
                <Text className="text-white font-bold">1</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary">First mission</Text>
                <Text className="text-brand font-bold">Log your first workout</Text>
              </View>
            </View>

            <Pressable
              className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark w-full"
              onPress={handleFinish}
              disabled={saving}
            >
              <Text className="text-white text-lg font-bold">
                {saving ? 'Setting up...' : 'Enter the Arena'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Step indicator */}
      <View className="flex-row justify-center gap-2 pb-8">
        {(['name', 'focus', 'ready'] as Step[]).map((s) => (
          <View
            key={s}
            className={`w-2 h-2 rounded-full ${
              s === step ? 'bg-brand' : 'bg-surface-border'
            }`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
