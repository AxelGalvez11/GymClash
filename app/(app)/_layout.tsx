import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useAccent } from '@/stores/accent-store';

function useGuestGate() {
  const { isGuest } = useAuthStore();
  const router = useRouter();

  return {
    isGuest,
    guard: () => {
      if (isGuest) {
        Alert.alert(
          'Sign Up to Unlock',
          'Create an account to access clans, profile, and competitive features.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Sign Up', onPress: () => router.push('/(auth)/login?mode=signup') },
          ]
        );
        return true;
      }
      return false;
    },
  };
}

export default function AppLayout() {
  const { isGuest, guard } = useGuestGate();
  const accent = useAccent();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent.DEFAULT,
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: Colors.surface.border,
          borderTopWidth: 0.5,
          height: 80,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'SpaceMono',
          fontSize: 9,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      {/* ─── Visible tabs: Shop → Profile → Home → Clan ─── */}
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="shopping-bag" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <FontAwesome
              name="user"
              size={20}
              color={isGuest ? Colors.text.muted : color}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (guard()) e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clan"
        options={{
          title: 'Clan',
          tabBarIcon: ({ color }) => (
            <FontAwesome
              name="shield"
              size={20}
              color={isGuest ? Colors.text.muted : color}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (guard()) e.preventDefault();
          },
        }}
      />

      {/* ─── Hidden routes — every file must be listed explicitly ─── */}
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="history/index" options={{ href: null }} />
      <Tabs.Screen name="workout/strength" options={{ href: null }} />
      <Tabs.Screen name="workout/scout" options={{ href: null }} />
      <Tabs.Screen name="workout/treadmill" options={{ href: null }} />
      <Tabs.Screen name="workout/recovery" options={{ href: null }} />
      <Tabs.Screen name="workout/[workoutId]" options={{ href: null }} />
      <Tabs.Screen name="review/[workoutId]" options={{ href: null }} />
      <Tabs.Screen name="report/[userId]" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="settings/biodata" options={{ href: null }} />
      <Tabs.Screen name="player/[userId]" options={{ href: null }} />
      <Tabs.Screen name="war-chat/[warId]" options={{ href: null }} />
    </Tabs>
  );
}
