import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { GlowingTabBar } from '@/components/navigation/GlowingTabBar';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlowingTabBar {...props} />}
    >
      {/* ─── Visible tabs ─── */}
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
          title: 'Stats',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="bar-chart" size={18} color={color} />
          ),
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
            <FontAwesome name="shield" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="bolt" size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{ href: null }}
      />

      {/* ─── Hidden routes ─── */}
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="history/index" options={{ href: null }} />
      <Tabs.Screen name="workout/strength" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="workout/scout" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="workout/treadmill" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="workout/recovery" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="workout/[workoutId]" options={{ href: null }} />
      <Tabs.Screen name="review/[workoutId]" options={{ href: null }} />
      <Tabs.Screen name="report/[userId]" options={{ href: null }} />
      <Tabs.Screen name="settings/index" options={{ href: null }} />
      <Tabs.Screen name="settings/biodata" options={{ href: null }} />
      <Tabs.Screen name="player/[userId]" options={{ href: null }} />
      <Tabs.Screen name="war-chat/[warId]" options={{ href: null }} />
      <Tabs.Screen name="clan-chat/[clanId]" options={{ href: null }} />
      <Tabs.Screen name="clan-view/[clanId]" options={{ href: null }} />
      <Tabs.Screen name="arena" options={{ href: null }} />
      <Tabs.Screen name="war-details/[warId]" options={{ href: null }} />
      <Tabs.Screen name="shop/transactions" options={{ href: null }} />
    </Tabs>
  );
}
