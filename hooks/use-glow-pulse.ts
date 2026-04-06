import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

/**
 * Breathing neon glow pulse for borders, shadows, and accent elements.
 * Returns animated style with oscillating opacity and optional shadow radius.
 *
 * @param color - Glow color (default Elixir Purple)
 * @param minOpacity - Minimum opacity (default 0.3)
 * @param maxOpacity - Maximum opacity (default 0.8)
 * @param duration - Full breathing cycle in ms (default 2400ms)
 * @param active - Whether pulse is running (default true)
 */
export function useGlowPulse(
  color = '#ce96ff',
  minOpacity = 0.3,
  maxOpacity = 0.8,
  duration = 2400,
  active = true,
) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    const halfDur = duration / 2;
    const easing = Easing.inOut(Easing.ease);
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: halfDur, easing }),
        withTiming(0, { duration: halfDur, easing }),
      ),
      -1,
      false,
    );
  }, [active, duration]);

  const glowStyle = useAnimatedStyle(() => {
    const opacity = minOpacity + progress.value * (maxOpacity - minOpacity);
    return {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: 8 + progress.value * 8,
      shadowOffset: { width: 0, height: 0 },
    };
  });

  const borderGlowStyle = useAnimatedStyle(() => {
    const opacity = minOpacity + progress.value * (maxOpacity - minOpacity);
    return {
      borderColor: color,
      borderWidth: 1.5,
      opacity,
    };
  });

  return { glowStyle, borderGlowStyle, progress } as const;
}
