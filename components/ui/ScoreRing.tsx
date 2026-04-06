import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  type CircleProps,
} from 'react-native-svg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreRingProps {
  /** Progress value 0–100 */
  percentage: number;
  /** Outer diameter in px (default 120) */
  size?: number;
  /** Stroke width in px (default 8) */
  strokeWidth?: number;
  /** Solid fill color used when no gradient is wanted (default '#ce96ff') */
  color?: string;
  /** Track ring color (default '#23233f') */
  trackColor?: string;
  /** Center content rendered on top of the ring */
  children?: React.ReactNode;
  /** Animate the fill on mount / percentage change (default true) */
  animated?: boolean;
  /** Fill animation duration in ms (default 800) */
  duration?: number;
  /** Show a soft glow behind the progress arc (default false) */
  glowing?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRADIENT_ID = 'scoreRingGradient';
const GLOW_ID = 'scoreRingGlow';
const GRADIENT_START = '#ce96ff';
const GRADIENT_END = '#a434ff';

// ---------------------------------------------------------------------------
// Animated primitive
// ---------------------------------------------------------------------------

const AnimatedCircle = Animated.createAnimatedComponent(
  Circle as React.ComponentType<CircleProps>,
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScoreRing — circular SVG progress ring with animated fill and optional glow.
 *
 * Uses react-native-svg for the SVG primitives and react-native-reanimated for
 * smooth stroke-dashoffset animation on the UI thread.
 */
export function ScoreRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = GRADIENT_START,
  trackColor = '#23233f',
  children,
  animated: shouldAnimate = true,
  duration = 800,
  glowing = false,
}: ScoreRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Start at full offset (empty ring) and animate toward target
  const dashOffset = useSharedValue(circumference);

  useEffect(() => {
    const nextOffset = circumference * (1 - Math.max(0, Math.min(100, percentage)) / 100);

    if (shouldAnimate) {
      dashOffset.value = withDelay(
        120,
        withTiming(nextOffset, {
          duration,
          easing: Easing.out(Easing.cubic),
        }),
      );
    } else {
      dashOffset.value = nextOffset;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, circumference, shouldAnimate, duration]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Purple gradient along the arc */}
          <LinearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={GRADIENT_START} stopOpacity={1} />
            <Stop offset="100%" stopColor={GRADIENT_END} stopOpacity={1} />
          </LinearGradient>

          {/* Glow filter — rendered as a blurred shadow circle */}
          <LinearGradient id={GLOW_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={GRADIENT_START} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={GRADIENT_END} stopOpacity={0.45} />
          </LinearGradient>
        </Defs>

        {/* Track ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Glow halo — slightly thicker, semi-transparent arc behind the fill */}
        {glowing && (
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${GLOW_ID})`}
            strokeWidth={strokeWidth + 6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            // Rotate so arc starts at 12 o'clock
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        )}

        {/* Progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${GRADIENT_ID})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Rotate so arc starts at 12 o'clock
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center slot */}
      {children != null && (
        <View style={styles.centerContent} pointerEvents="box-none">
          {children}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScoreRing;
