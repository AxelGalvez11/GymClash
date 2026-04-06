import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

/**
 * Animated progress bar fill.
 * Smoothly fills from 0% to target percentage with optional delay.
 *
 * @param percentage - Target fill 0-100
 * @param duration - Fill animation duration (default 600ms)
 * @param delay - Delay before fill starts (default 200ms)
 */
export function useAnimatedBar(
  percentage: number,
  duration = 600,
  delay = 200,
) {
  const width = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, percentage));
    width.value = withDelay(
      delay,
      withTiming(clamped, {
        duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [percentage]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as `${number}%`,
  }));

  return { barStyle, width } as const;
}
