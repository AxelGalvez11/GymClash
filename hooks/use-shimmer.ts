import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

/**
 * Shimmer sweep animation for progress bars and skeleton loaders.
 * Returns an animated style with a translateX-based shimmer sweep.
 *
 * @param width - The width of the shimmer container
 * @param duration - Full sweep duration in ms (default 1800ms)
 * @param active - Whether shimmer is running (default true)
 */
export function useShimmer(width = 200, duration = 1800, active = true) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [active, duration]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [-width, width]);
    return {
      transform: [{ translateX }],
      opacity: interpolate(progress.value, [0, 0.3, 0.5, 0.7, 1], [0, 0.4, 0.6, 0.4, 0]),
    };
  });

  return { shimmerStyle } as const;
}
