import { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Dimensions } from 'react-native';

interface Star {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly delay: number;
}

/**
 * Animated star field background — React Native adaptation of the
 * CSS stars-bg pattern from the hero-ascii-one web component.
 */
export function StarField({ count = 40 }: { readonly count?: number }) {
  const { width, height } = Dimensions.get('window');

  const stars: readonly Star[] = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 3000,
      })),
    [count, width, height]
  );

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {stars.map((star, i) => (
        <AnimatedStar key={i} star={star} />
      ))}
    </View>
  );
}

function AnimatedStar({ star }: { readonly star: Star }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(star.delay),
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 1500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.1,
          duration: 1500 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, star.delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: star.x,
        top: star.y,
        width: star.size,
        height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: '#ffffff',
        opacity,
      }}
    />
  );
}
