import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

import { Colors, getStreakTier } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────

interface StreakFlameProps {
  readonly count: number;
  readonly size?: 'sm' | 'md' | 'lg';
}

// ─── Size Config ─────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { emojiSize: 16, countSize: 0, showLabel: false },
  md: { emojiSize: 20, countSize: 14, showLabel: false },
  lg: { emojiSize: 28, countSize: 18, showLabel: true },
} as const;

// ─── Component ──────────────────────────────────────────

export function StreakFlame({ count, size = 'md' }: StreakFlameProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const tier = getStreakTier(count);

  useEffect(() => {
    if (tier.pulseSpeed > 0) {
      const halfDuration = tier.pulseSpeed / 2;
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: halfDuration,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: halfDuration,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }

    // No pulse for lowest tier — reset to full opacity
    pulseAnim.setValue(1);
    return undefined;
  }, [count, tier.pulseSpeed, pulseAnim]);

  if (count <= 0) return null;

  const config = SIZE_CONFIG[size];

  return (
    <Animated.View
      style={[
        { opacity: pulseAnim },
        tier.glowRadius > 0
          ? {
              shadowColor: tier.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: tier.glowRadius,
            }
          : undefined,
      ]}
      className="flex-row items-center gap-1"
    >
      <Text style={{ fontSize: config.emojiSize }}>{tier.emoji}</Text>

      {config.countSize > 0 && (
        <Text
          className="font-bold"
          style={{ color: tier.color, fontSize: config.countSize }}
        >
          {count}
        </Text>
      )}

      {config.showLabel && (
        <Text
          className="text-xs"
          style={{ color: Colors.text.secondary, marginLeft: 2 }}
        >
          {tier.label} — {count} day streak
        </Text>
      )}
    </Animated.View>
  );
}

export default StreakFlame;
