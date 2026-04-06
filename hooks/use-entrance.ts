import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

/**
 * Screen/section entrance animation using reanimated.
 * Replaces the old Animated API-based useFadeSlide with spring physics.
 *
 * @param delay - Delay before animation starts (default 0)
 * @param variant - 'fade-slide' | 'fade-scale' | 'spring-up' (default 'fade-slide')
 * @param duration - Duration in ms (default 280ms per chrome spec)
 */
export function useEntrance(
  delay = 0,
  variant: 'fade-slide' | 'fade-scale' | 'spring-up' = 'fade-slide',
  duration = 280,
) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(variant === 'spring-up' ? 24 : 14);
  const scale = useSharedValue(variant === 'fade-scale' ? 0.92 : 1);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);

    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));

    if (variant === 'spring-up') {
      translateY.value = withDelay(
        delay,
        withSpring(0, { damping: 14, stiffness: 160, mass: 0.8 }),
      );
    } else {
      translateY.value = withDelay(delay, withTiming(0, { duration, easing }));
    }

    if (variant === 'fade-scale') {
      scale.value = withDelay(delay, withTiming(1, { duration, easing }));
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return { animatedStyle, opacity, translateY, scale } as const;
}
