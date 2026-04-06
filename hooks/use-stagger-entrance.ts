import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Staggered entrance animation for list items.
 * Each item fades in + slides up with a cascading delay.
 *
 * @param index - Item index in the list (determines delay)
 * @param staggerDelay - Delay between items in ms (default 60ms per chrome spec)
 * @param duration - Animation duration per item (default 260ms)
 * @param slideDistance - Vertical slide distance in px (default 16)
 */
export function useStaggerEntrance(
  index: number,
  staggerDelay = 60,
  duration = 260,
  slideDistance = 16,
) {
  const opacity: SharedValue<number> = useSharedValue(0);
  const translateY: SharedValue<number> = useSharedValue(slideDistance);

  const delay = index * staggerDelay;

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle } as const;
}

/**
 * Batch version: returns array of animated styles for N items.
 * Useful when you know the count upfront.
 */
export function useStaggerEntranceBatch(
  count: number,
  staggerDelay = 60,
  duration = 260,
  slideDistance = 16,
) {
  const items = Array.from({ length: count }, (_, i) => i);
  const opacities = items.map(() => useSharedValue(0));
  const translates = items.map(() => useSharedValue(slideDistance));

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    items.forEach((_, i) => {
      const delay = i * staggerDelay;
      opacities[i].value = withDelay(delay, withTiming(1, { duration, easing }));
      translates[i].value = withDelay(delay, withTiming(0, { duration, easing }));
    });
  }, [count]);

  const getStyle = (index: number) =>
    useAnimatedStyle(() => ({
      opacity: opacities[index]?.value ?? 1,
      transform: [{ translateY: translates[index]?.value ?? 0 }],
    }));

  return { getStyle } as const;
}
