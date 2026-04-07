import { useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { CornerFrames } from '@/components/ui/CornerFrames';

export default function LandingScreen() {
  const router = useRouter();
  const { enterGuestMode } = useAuthStore();

  // Memoize random bar heights so they don't jitter on re-render
  const barHeights = useMemo(() => Array.from({ length: 6 }, () => Math.random() * 8 + 3), []);

  // Fade in animation
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  return (
    <View className="flex-1 bg-[#0c0c1f]">
      {/* Corner frame accents */}
      <CornerFrames />

      {/* Main content */}
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-1 justify-center px-6 pb-20">
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }], alignItems: 'center' }}>
            <View className="items-center mb-8">
              <Text
                style={{
                  color: '#e5e3ff',
                  fontSize: 30,
                  fontFamily: 'Epilogue-Bold',
                  letterSpacing: 6,
                  textAlign: 'center',
                }}
              >
                GYMCLASH
              </Text>
              <Text
                style={{
                  color: '#74738b',
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 9,
                  letterSpacing: 2,
                  marginTop: 6,
                  textAlign: 'center',
                }}
              >
                EST. 2025
              </Text>
            </View>

          {/* Decorative line */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-8 h-px" style={{ backgroundColor: '#ce96ff' }} />
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>///</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(206,150,255,0.3)' }} />
          </View>

          {/* Title */}
          <Text
            className="text-4xl mb-2"
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', letterSpacing: 3, textAlign: 'center' }}
          >
            TRAIN.{'\n'}LEVEL UP.{'\n'}DOMINATE.
          </Text>

          {/* Description */}
          <Text
            className="text-sm mb-8 leading-6"
            style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', textAlign: 'center' }}
          >
            Real workouts. Real competition.{'\n'}
            Your clan needs you in the arena.
          </Text>

          {/* CTA Buttons — Victory Peak style */}
          <View className="gap-3 w-full">
            {/* Primary: Get Started */}
            <Pressable
              className="py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
              style={{
                backgroundColor: '#a434ff',
                shadowColor: '#a434ff',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 4 },
                elevation: 12,
              }}
              onPress={() => router.push('/(auth)/login?mode=signup')}
            >
              <Text
                style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
              >
                BEGIN THE CLIMB
              </Text>
            </Pressable>

            {/* Secondary: Sign In */}
            <Pressable
              className="py-3.5 items-center rounded-[2rem] active:scale-[0.98]"
              style={{
                backgroundColor: '#23233f',
                borderWidth: 0.5,
                borderColor: 'rgba(206,150,255,0.25)',
              }}
              onPress={() => router.push('/(auth)/login?mode=signin')}
            >
              <Text
                style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 14, letterSpacing: 2 }}
              >
                I HAVE AN ACCOUNT
              </Text>
            </Pressable>

            {/* Skip */}
            <Pressable
              hitSlop={12}
              style={{
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
              onPress={() => {
                enterGuestMode();
                router.replace('/(app)/home');
              }}
            >
              <Text
                style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, letterSpacing: 1 }}
              >
                SKIP FOR NOW
              </Text>
            </Pressable>

            {/* Dev: jump to onboarding */}
            <Pressable
              hitSlop={8}
              style={{
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                marginTop: 4,
              }}
              onPress={() => router.push('/(auth)/onboarding')}
            >
              <Text
                style={{ color: 'rgba(206,150,255,0.35)', fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}
              >
                DEV: ONBOARDING
              </Text>
            </Pressable>
          </View>

          {/* Bottom technical notation */}
          <View className="flex-row items-center gap-2 mt-6">
            <Text style={{ color: 'rgba(206,150,255,0.2)', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>///</Text>
            <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(206,150,255,0.1)' }} />
            <Text style={{ color: 'rgba(206,150,255,0.2)', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>
              GYMCLASH.PROTOCOL
            </Text>
          </View>
        </Animated.View>
        </View>
      </SafeAreaView>

      {/* Bottom status bar */}
      <View
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(206,150,255,0.15)' }}
      >
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row items-center justify-between px-6 py-2">
            <View className="flex-row items-center gap-3">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>
                SYSTEM.ACTIVE
              </Text>
              <View className="flex-row gap-0.5">
                {barHeights.map((h, i) => (
                  <View
                    key={i}
                    className="w-1"
                    style={{ height: h, backgroundColor: 'rgba(206,150,255,0.2)' }}
                  />
                ))}
              </View>
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>
                V1.0.0
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>
                READY
              </Text>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'rgba(206,150,255,0.35)',
                }}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
