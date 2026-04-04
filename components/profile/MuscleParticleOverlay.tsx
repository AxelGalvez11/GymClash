import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';
import type { HeatmapData } from '@/lib/analytics/muscle-heatmap';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MuscleParticleOverlayProps {
  readonly heatmapData: HeatmapData;
  readonly view: 'front' | 'back';
  readonly width?: number;
  readonly height?: number;
}

// Approximate center positions for each muscle region (in viewBox 200x360 coords)
const FRONT_MUSCLE_CENTERS: Partial<Record<MuscleGroup, { x: number; y: number; spread: number }>> = {
  chest: { x: 100, y: 90, spread: 18 },
  shoulders: { x: 100, y: 72, spread: 35 },
  biceps: { x: 100, y: 100, spread: 48 },
  abs: { x: 100, y: 140, spread: 14 },
  quads: { x: 100, y: 230, spread: 20 },
  calves: { x: 100, y: 310, spread: 18 },
};

const BACK_MUSCLE_CENTERS: Partial<Record<MuscleGroup, { x: number; y: number; spread: number }>> = {
  upper_back: { x: 100, y: 72, spread: 22 },
  lats: { x: 100, y: 98, spread: 25 },
  triceps: { x: 100, y: 100, spread: 48 },
  lower_back: { x: 100, y: 135, spread: 14 },
  glutes: { x: 100, y: 165, spread: 18 },
  hamstrings: { x: 100, y: 230, spread: 20 },
  calves: { x: 100, y: 310, spread: 18 },
};

interface Particle {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly baseOpacity: number;
  readonly color: string;
  readonly pulseDelay: number;
}

// Seeded pseudo-random for deterministic placement
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateParticles(
  heatmapData: HeatmapData,
  view: 'front' | 'back',
): readonly Particle[] {
  const centers = view === 'front' ? FRONT_MUSCLE_CENTERS : BACK_MUSCLE_CENTERS;
  const particles: Particle[] = [];
  const rand = seededRandom(42 + (view === 'front' ? 0 : 1000));

  for (const [muscle, center] of Object.entries(centers)) {
    const data = heatmapData.muscles.get(muscle as MuscleGroup);
    if (!data || data.normalizedIntensity < 0.1) continue;

    const intensity = data.normalizedIntensity;
    // Scale particle count: 2 at low, up to 12 at max
    const count = Math.floor(2 + intensity * 10);

    // For muscles with L/R symmetry, mirror particles
    const isSymmetric = ['shoulders', 'biceps', 'quads', 'calves', 'triceps', 'lats', 'hamstrings'].includes(muscle);
    const offsets = isSymmetric ? [-center.spread, center.spread] : [0];

    for (const xOffset of offsets) {
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const dist = rand() * center.spread * 0.8;
        const cx = center.x + xOffset + Math.cos(angle) * dist;
        const cy = center.y + Math.sin(angle) * dist;

        // Size scales with intensity
        const r = 1 + rand() * (intensity * 2.5);
        // Opacity scales with intensity
        const baseOpacity = 0.15 + intensity * 0.55;

        // Color: warm -> hot -> maxed
        const color = intensity > 0.75 ? '#ef4444'
          : intensity > 0.45 ? '#f97316'
          : '#eab308';

        particles.push({
          id: `${muscle}-${xOffset}-${i}`,
          cx,
          cy,
          r,
          baseOpacity,
          color,
          pulseDelay: rand() * 2000,
        });
      }
    }
  }

  return particles;
}

// Pulsing particle with reanimated
function PulsingParticle({ particle }: { readonly particle: Particle }) {
  const opacity = useSharedValue(particle.baseOpacity);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(particle.baseOpacity * 0.4, {
        duration: 1500 + particle.pulseDelay,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, // infinite
      true, // reverse
    );
  }, [opacity, particle.baseOpacity, particle.pulseDelay]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedCircle
      cx={particle.cx}
      cy={particle.cy}
      r={particle.r}
      fill={particle.color}
      animatedProps={animatedProps}
    />
  );
}

export function MuscleParticleOverlay({
  heatmapData,
  view,
  width = 180,
  height = 324,
}: MuscleParticleOverlayProps) {
  const particles = useMemo(
    () => generateParticles(heatmapData, view),
    [heatmapData, view],
  );

  if (particles.length === 0) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width, height }} pointerEvents="none">
      <Svg width={width} height={height} viewBox="0 0 200 360">
        <G>
          {particles.map((p) => (
            <PulsingParticle key={p.id} particle={p} />
          ))}
        </G>
      </Svg>
    </View>
  );
}
