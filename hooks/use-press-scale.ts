import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Tactile press-scale hook using reanimated springs.
 * Returns animated style + press handlers for Pressable.
 *
 * Default scale matches chrome spec: 0.97 for cards, 0.95 for buttons.
 */

const PRESS_SPRING = { damping: 15, stiffness: 300, mass: 0.8 } as const;
const RELEASE_SPRING = { damping: 12, stiffness: 200, mass: 0.6 } as const;

export function usePressScale(targetScale = 0.97) {
  const scale: SharedValue<number> = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(targetScale, PRESS_SPRING);
  }, [targetScale]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, RELEASE_SPRING);
  }, []);

  return { animatedStyle, onPressIn, onPressOut } as const;
}
