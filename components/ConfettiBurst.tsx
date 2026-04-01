import { useEffect, useMemo, useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { DEFAULT_CONFETTI } from '@/constants/theme';
import type { ConfettiConfig } from '@/types';

// ─── Types ───────────────────────────────────────────────

interface ConfettiBurstProps {
  readonly visible: boolean;
  readonly config?: ConfettiConfig;
  readonly onComplete?: () => void;
}

interface ParticleConfig {
  readonly id: number;
  readonly color: string;
  readonly size: number;
  readonly startX: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly rotation: number;
  readonly delay: number;
  readonly isCircle: boolean;
}

// ─── Particle seed generation (pure) ─────────────────────

function buildParticleSeeds(config: ConfettiConfig): readonly ParticleConfig[] {
  const { particleCount, colors, spread } = config;
  const particles: ParticleConfig[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = ((Math.random() - 0.5) * spread * Math.PI) / 180;
    const speed = 300 + Math.random() * 400;

    particles.push({
      id: i,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 6,
      startX: (Math.random() - 0.5) * 40,
      velocityX: Math.sin(angle) * speed,
      velocityY: -(Math.cos(angle) * speed * (0.6 + Math.random() * 0.4)),
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 200,
      isCircle: Math.random() > 0.5,
    });
  }

  return particles;
}

// ─── Single Particle ─────────────────────────────────────

function Particle({
  seed,
  visible,
  duration,
}: {
  readonly seed: ParticleConfig;
  readonly visible: boolean;
  readonly duration: number;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      opacity.value = 0;

      opacity.value = withDelay(
        seed.delay,
        withTiming(1, { duration: 80 }),
      );

      progress.value = withDelay(
        seed.delay,
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.quad),
        }),
      );
    } else {
      progress.value = 0;
      opacity.value = 0;
    }
  }, [visible, duration, seed.delay, progress, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const gravity = 600;

    const translateX = seed.velocityX * t;
    const translateY = seed.velocityY * t + 0.5 * gravity * t * t;
    const rotate = seed.rotation * t;
    const fadeOpacity = opacity.value * (1 - t * t);

    return {
      opacity: Math.max(0, fadeOpacity),
      transform: [
        { translateX: seed.startX + translateX },
        { translateY },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: seed.size,
          height: seed.size,
          backgroundColor: seed.color,
          borderRadius: seed.isCircle ? seed.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── ConfettiBurst Component ─────────────────────────────

export function ConfettiBurst({ visible, config, onComplete }: ConfettiBurstProps) {
  const resolvedConfig = config ?? DEFAULT_CONFETTI;
  const [alive, setAlive] = useState(false);

  // Re-generate particles each time visible flips to true
  const [seed, setSeed] = useState(0);

  const handleAutoClean = useCallback(() => {
    setAlive(false);
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (visible) {
      setSeed((s) => s + 1);
      setAlive(true);

      const timer = setTimeout(handleAutoClean, resolvedConfig.duration + 300);
      return () => clearTimeout(timer);
    }
    setAlive(false);
    return undefined;
  }, [visible, resolvedConfig.duration, handleAutoClean]);

  const particles = useMemo(
    () => buildParticleSeeds(resolvedConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolvedConfig, seed],
  );

  if (!alive) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.emitter}>
        {particles.map((p) => (
          <Particle
            key={p.id}
            seed={p}
            visible={alive}
            duration={resolvedConfig.duration}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    overflow: 'hidden',
  },
  emitter: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    width: 0,
    height: 0,
  },
});

export default ConfettiBurst;
