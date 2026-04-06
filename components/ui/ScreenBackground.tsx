import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, interpolate } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { StarField } from '@/components/ui/StarField';

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_COLOR = '#0c0c1f' as const;

const GLOW_Y_BY_POSITION = {
  center: '50%',
  top:    '15%',
  bottom: '85%',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScreenBackgroundProps {
  readonly children: React.ReactNode;
  /** Glow bloom color. Default: '#ce96ff' (Elixir Purple) */
  readonly glowColor?: string;
  /** Peak opacity of the bloom at full pulse. Default: 0.12 */
  readonly glowOpacity?: number;
  /** Vertical anchor of the bloom. Default: 'center' */
  readonly glowPosition?: 'center' | 'top' | 'bottom';
  /** Render subtle animated star particles behind content. Default: false */
  readonly withStarField?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Base screen wrapper that provides the Midnight Void background (`#0c0c1f`)
 * with a breathing radial glow bloom and an optional star field.
 *
 * Usage:
 * ```tsx
 * <ScreenBackground glowPosition="top" withStarField>
 *   <YourScreenContent />
 * </ScreenBackground>
 * ```
 */
export function ScreenBackground({
  children,
  glowColor = '#ce96ff',
  glowOpacity = 0.12,
  glowPosition = 'center',
  withStarField = false,
}: ScreenBackgroundProps) {
  // Slow breathing pulse — 4 s cycle, opacity range maps to the prop
  const minOpacity = Math.max(0, glowOpacity - 0.04);
  const maxOpacity = Math.min(1, glowOpacity + 0.03);

  const { progress } = useGlowPulse(glowColor, minOpacity, maxOpacity, 4000);

  const bloomStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [minOpacity, maxOpacity]);
    return { opacity };
  });

  const glowY = GLOW_Y_BY_POSITION[glowPosition];

  return (
    <View style={styles.root}>
      {/* ── Star field (optional) ─────────────────────────── */}
      {withStarField && <StarField count={50} />}

      {/* ── Radial bloom — simulated with stacked LinearGradients ── */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, bloomStyle]}
      >
        {/* Outer halo — wide, very soft */}
        <LinearGradient
          colors={[hexWithAlpha(glowColor, 0.08), 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: glowYToFloat(glowY) }}
          end={{ x: 0.5, y: glowYToFloat(glowY) > 0.5 ? 0 : 1 }}
        />

        {/* Inner bloom — tighter, richer */}
        <LinearGradient
          colors={[hexWithAlpha(glowColor, 0.18), 'transparent']}
          style={[StyleSheet.absoluteFill, styles.innerBloom]}
          start={{ x: 0.5, y: glowYToFloat(glowY) }}
          end={deriveBloomEnd(glowY)}
        />

        {/* Horizontal spread — gives the circular feel */}
        <LinearGradient
          colors={['transparent', hexWithAlpha(glowColor, 0.06), 'transparent']}
          style={[StyleSheet.absoluteFill, styles.hSpread]}
          start={{ x: 0, y: glowYToFloat(glowY) }}
          end={{ x: 1, y: glowYToFloat(glowY) }}
        />
      </Animated.View>

      {/* ── Safe area + content ──────────────────────────── */}
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {children}
      </SafeAreaView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a CSS-style percentage string to a 0–1 float. */
function glowYToFloat(y: string): number {
  return parseFloat(y) / 100;
}

/**
 * Derive the `end` gradient point so the bloom spreads away from its anchor,
 * regardless of whether it sits at top, center, or bottom.
 */
function deriveBloomEnd(glowY: string): { x: number; y: number } {
  const yf = glowYToFloat(glowY);
  if (yf <= 0.3) return { x: 0.5, y: 1 };
  if (yf >= 0.7) return { x: 0.5, y: 0 };
  return { x: 0.5, y: yf > 0.5 ? 0 : 1 };
}

/**
 * Append an alpha byte to a 6-digit hex color string.
 * e.g. hexWithAlpha('#ce96ff', 0.15) → '#ce96ff26'
 */
function hexWithAlpha(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const alphaByte = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${alphaByte}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BASE_COLOR,
  },
  safeArea: {
    flex: 1,
  },
  innerBloom: {
    // Constrain inner bloom to center 60 % of screen width for tighter focus
    marginHorizontal: '20%',
  },
  hSpread: {
    // Constrain horizontal spread to the middle third vertically
    marginVertical: '30%',
  },
});
