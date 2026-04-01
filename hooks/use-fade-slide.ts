import { useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';

/**
 * Reusable entrance animation: fade in + slide up.
 * Respects system reduce-motion preference.
 */
export function useFadeSlide(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;

      if (reduceMotion) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      cancelled = true;
    };
  }, [opacity, translateY, delay]);

  return {
    opacity,
    translateY,
    style: { opacity, transform: [{ translateY }] },
  };
}
