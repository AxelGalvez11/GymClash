import { useEffect } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Animated number counter that rolls up from 0 to target value.
 * Perfect for stats, scores, and currency displays.
 *
 * @param target - The final number value
 * @param duration - Roll-up duration in ms (default 800ms)
 * @param decimals - Decimal places to display (default 0)
 * @param delay - Delay before starting in ms (default 0)
 */
export function useCountUp(
  target: number,
  duration = 800,
  decimals = 0,
  delay = 0,
) {
  const animatedValue: SharedValue<number> = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      animatedValue.value = withTiming(target, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  const displayValue = useDerivedValue(() => {
    if (decimals === 0) return Math.round(animatedValue.value).toString();
    return animatedValue.value.toFixed(decimals);
  });

  return { animatedValue, displayValue } as const;
}
