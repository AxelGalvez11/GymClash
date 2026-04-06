import '../global.css';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import {
  Epilogue_700Bold,
  Epilogue_800ExtraBold,
  Epilogue_900Black,
} from '@expo-google-fonts/epilogue';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Lexend_400Regular,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from '@expo-google-fonts/lexend';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/services/supabase';
import { useNeedsOnboarding } from '@/hooks/use-onboarding';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading, isGuest, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const { data: needsOnboarding } = useNeedsOnboarding();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[1] === 'onboarding';

    // Guest mode: allow through to (app) group
    if (isGuest && inAuthGroup) {
      router.replace('/(app)/home');
      return;
    }

    if (!session && !isGuest && !inAuthGroup) {
      router.replace('/(auth)/landing');
    } else if (session && needsOnboarding && !inOnboarding) {
      router.replace('/(auth)/onboarding');
    } else if (session && !needsOnboarding && inAuthGroup && !inOnboarding) {
      router.replace('/(app)/home');
    }
  }, [session, isLoading, isGuest, needsOnboarding, segments, router]);

  if (isLoading) {
    return <View className="flex-1 bg-surface" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Alias Google Font variables to the names components use
    'Epilogue-Bold': Epilogue_700Bold,
    'Epilogue-ExtraBold': Epilogue_800ExtraBold,
    'Epilogue-Black': Epilogue_900Black,
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold': BeVietnamPro_700Bold,
    'Lexend-Regular': Lexend_400Regular,
    'Lexend-SemiBold': Lexend_600SemiBold,
    'Lexend-Bold': Lexend_700Bold,
    // Monospace font used in GlowingTabBar labels, VictoryScreen, CelebrationModal
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Slot />
        </AuthGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
