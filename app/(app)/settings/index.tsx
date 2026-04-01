import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Alert, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useAccent, useAccentStore, ACCENT_OPTIONS, type AccentKey } from '@/stores/accent-store';
import { useAuthStore } from '@/stores/auth-store';

// ─── Animated Settings Row ──────────────────────────────

function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  color,
  delay = 0,
}: {
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly label: string;
  readonly detail?: string;
  readonly onPress: () => void;
  readonly color?: string;
  readonly delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateX, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <Pressable
        className="bg-surface-raised border border-surface-border rounded-xl p-4 flex-row items-center active:opacity-60"
        onPress={onPress}
      >
        <FontAwesome name={icon} size={16} color={color ?? Colors.text.secondary} />
        <Text className="text-white font-bold ml-3 flex-1 text-sm">{label}</Text>
        {detail && (
          <Text className="text-text-muted text-xs mr-2">{detail}</Text>
        )}
        <FontAwesome name="chevron-right" size={12} color={Colors.text.muted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Section Label ──────────────────────────────────────

function SectionLabel({ text }: { readonly text: string }) {
  return (
    <Text
      className="text-text-muted text-xs uppercase mb-2 ml-1"
      style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 2 }}
    >
      {text}
    </Text>
  );
}

// ─── Accent Color Picker ────────────────────────────────

const ACCENT_LABELS: Record<AccentKey, string> = {
  purple: 'Purple',
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  amber: 'Amber',
};

function AccentColorPicker() {
  const accent = useAccent();
  const accentKey = useAccentStore((s) => s.accentKey);
  const setAccent = useAccentStore((s) => s.setAccent);

  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-4">
      <Text className="text-white font-bold text-sm mb-3">Accent Color</Text>
      <Text className="text-text-muted text-xs mb-4">
        Choose your preferred accent color for the app
      </Text>
      <View className="flex-row gap-3 justify-center">
        {(Object.entries(ACCENT_OPTIONS) as [AccentKey, typeof ACCENT_OPTIONS[AccentKey]][]).map(
          ([key, palette]) => {
            const isSelected = key === accentKey;
            return (
              <Pressable
                key={key}
                className="items-center gap-1.5 active:opacity-70"
                onPress={() => setAccent(key)}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: palette.DEFAULT,
                    borderWidth: isSelected ? 2.5 : 0,
                    borderColor: '#ffffff',
                  }}
                >
                  {isSelected && (
                    <FontAwesome name="check" size={14} color="#ffffff" />
                  )}
                </View>
                <Text
                  className="text-xs"
                  style={{
                    color: isSelected ? palette.DEFAULT : Colors.text.muted,
                    fontFamily: 'SpaceMono',
                    fontSize: 8,
                    letterSpacing: 1,
                  }}
                >
                  {ACCENT_LABELS[key].toUpperCase()}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>
    </View>
  );
}

// ─── Main Settings Screen ───────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { session } = useAuthStore();
  const accent = useAccent();

  const biodataStatus = profile?.body_weight_kg ? 'Complete' : 'Incomplete';

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error', error.message);
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center px-5 pt-3 pb-5">
          <Pressable onPress={() => router.back()} className="mr-4 active:opacity-60">
            <FontAwesome name="arrow-left" size={18} color={Colors.text.secondary} />
          </Pressable>
          <Text className="text-white text-lg font-bold" style={{ fontFamily: 'SpaceMono', letterSpacing: 1 }}>
            Settings
          </Text>
        </View>

        <View className="px-5">
          {/* Account Section */}
          <SectionLabel text="Account" />
          <View className="gap-2 mb-6">
            <SettingsRow
              icon="user"
              label={profile?.display_name || 'Warrior'}
              detail={session?.user?.email?.split('@')[0] ?? ''}
              onPress={() => {
                Alert.alert(
                  'Account',
                  [
                    `Name: ${profile?.display_name || 'Not set'}`,
                    `Email: ${session?.user?.email ?? 'Not available'}`,
                    `Level: ${profile?.level ?? 1}`,
                    `Rank: ${(profile?.rank ?? 'rookie').replace(/_/g, ' ')}`,
                  ].join('\n')
                );
              }}
              delay={0}
            />
          </View>

          {/* Appearance Section */}
          <SectionLabel text="Appearance" />
          <View className="gap-2 mb-6">
            <AccentColorPicker />
          </View>

          {/* Body Data Section */}
          <SectionLabel text="Body Data" />
          <View className="gap-2 mb-6">
            <SettingsRow
              icon="sliders"
              label="Body Data"
              detail={biodataStatus}
              onPress={() => router.push('/(app)/settings/biodata')}
              color={biodataStatus === 'Incomplete' ? accent.DEFAULT : Colors.text.secondary}
              delay={100}
            />
          </View>

          {/* About Section */}
          <SectionLabel text="About" />
          <View className="gap-2 mb-8">
            <SettingsRow
              icon="info-circle"
              label="Version"
              detail="1.0.0"
              onPress={() => {}}
              delay={150}
            />
          </View>

          {/* Sign Out */}
          <Pressable
            className="rounded-xl py-3 items-center active:opacity-60"
            style={{ borderWidth: 0.5, borderColor: Colors.danger + '40' }}
            onPress={handleSignOut}
          >
            <Text className="text-danger font-bold text-sm" style={{ fontFamily: 'SpaceMono', letterSpacing: 1 }}>
              SIGN OUT
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
