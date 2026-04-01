import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { StarField } from '@/components/ui/StarField';
import { CornerFrames } from '@/components/ui/CornerFrames';

function PulsingDot({ delay = 0 }: { readonly delay?: number }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.8, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#fff', opacity }} />
  );
}

function DotRow() {
  return (
    <View className="flex-row gap-1 mb-3 opacity-40">
      {Array.from({ length: 30 }).map((_, i) => (
        <View key={i} className="w-0.5 h-0.5 rounded-full bg-white" />
      ))}
    </View>
  );
}

export default function LandingScreen() {
  const router = useRouter();
  const { enterGuestMode } = useAuthStore();

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
    <View className="flex-1 bg-black">
      {/* Star field background */}
      <StarField count={50} />

      {/* Corner frame accents */}
      <CornerFrames />

      {/* Top header bar */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10">
        <View
          className="flex-row items-center justify-between px-6 py-3"
          style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.15)' }}
        >
          <View className="flex-row items-center gap-3">
            <Text
              className="text-white text-xl font-bold"
              style={{ fontFamily: 'SpaceMono', letterSpacing: 4 }}
            >
              GYMCLASH
            </Text>
            <View className="h-3 w-px bg-white/30" />
            <Text className="text-white/40" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>
              EST. 2025
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <PulsingDot delay={0} />
            <PulsingDot delay={200} />
            <PulsingDot delay={400} />
          </View>
        </View>
      </SafeAreaView>

      {/* Main content */}
      <View className="flex-1 justify-end px-6 pb-28">
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          {/* Decorative line */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-8 h-px bg-white" />
            <Text className="text-white/60" style={{ fontFamily: 'SpaceMono', fontSize: 10 }}>⚔️</Text>
            <View className="flex-1 h-px bg-white/30" />
          </View>

          {/* Title */}
          <Text
            className="text-white text-4xl font-bold mb-2"
            style={{ fontFamily: 'SpaceMono', letterSpacing: 3 }}
          >
            TRAIN.{'\n'}LEVEL UP.{'\n'}DOMINATE.
          </Text>

          {/* Dot row */}
          <DotRow />

          {/* Description */}
          <Text
            className="text-white/60 text-sm mb-8 leading-6"
            style={{ fontFamily: 'SpaceMono' }}
          >
            Real workouts. Real competition.{'\n'}
            Your clan needs you in the arena.
          </Text>

          {/* CTA Buttons — matching the hero-ascii-one style */}
          <View className="gap-3">
            {/* Primary: Get Started */}
            <Pressable
              className="py-3.5 items-center active:bg-white"
              style={{
                borderWidth: 1,
                borderColor: '#ffffff',
                backgroundColor: 'transparent',
              }}
              onPress={() => router.push('/(auth)/login?mode=signup')}
            >
              {({ pressed }) => (
                <Text
                  className={`font-bold text-sm ${pressed ? 'text-black' : 'text-white'}`}
                  style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
                >
                  BEGIN THE CLIMB
                </Text>
              )}
            </Pressable>

            {/* Secondary: Sign In */}
            <Pressable
              className="py-3.5 items-center active:bg-white/10"
              style={{
                borderWidth: 0.5,
                borderColor: 'rgba(255,255,255,0.4)',
              }}
              onPress={() => router.push('/(auth)/login?mode=signin')}
            >
              <Text
                className="text-white/70 text-sm"
                style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
              >
                I HAVE AN ACCOUNT
              </Text>
            </Pressable>

            {/* Skip */}
            <Pressable
              className="py-2 items-center"
              onPress={() => {
                enterGuestMode();
                router.replace('/(app)/home');
              }}
            >
              <Text
                className="text-white/30 text-xs"
                style={{ fontFamily: 'SpaceMono', letterSpacing: 1 }}
              >
                SKIP FOR NOW
              </Text>
            </Pressable>
          </View>

          {/* Bottom technical notation */}
          <View className="flex-row items-center gap-2 mt-6">
            <Text className="text-white/20" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>∞</Text>
            <View className="flex-1 h-px bg-white/10" />
            <Text className="text-white/20" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>
              GYMCLASH.PROTOCOL
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom status bar */}
      <View
        className="absolute bottom-0 left-0 right-0 z-10"
        style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.15)' }}
      >
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row items-center justify-between px-6 py-2">
            <View className="flex-row items-center gap-3">
              <Text className="text-white/30" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>
                SYSTEM.ACTIVE
              </Text>
              <View className="flex-row gap-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <View
                    key={i}
                    className="w-1 bg-white/20"
                    style={{ height: Math.random() * 8 + 3 }}
                  />
                ))}
              </View>
              <Text className="text-white/30" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>
                V1.0.0
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-white/30" style={{ fontFamily: 'SpaceMono', fontSize: 8 }}>
                ◐ READY
              </Text>
              <PulsingDot />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
