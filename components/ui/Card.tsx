import { Platform, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { Colors, Radius } from '@/constants/theme';

// ─── Variant backgrounds ────────────────────────────────────────────────────
const VARIANT_BG: Record<NonNullable<CardProps['variant']>, string> = {
  default:  Colors.surface.containerHigh,    // #1d1d37
  glass:    'rgba(23,23,47,0.8)',            // semi-transparent layering
  elevated: Colors.surface.containerHighest, // #23233f
  recessed: Colors.surface.containerLowest,  // #000000
};

// ─── Chromatic neon shadow per variant ──────────────────────────────────────
const VARIANT_SHADOW: Record<NonNullable<CardProps['variant']>, object> = {
  default: Platform.OS === 'ios'
    ? { shadowColor: Colors.primary.DEFAULT, shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: 0 } }
    : { elevation: 4 },
  glass: Platform.OS === 'ios'
    ? { shadowColor: Colors.primary.DEFAULT, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }
    : { elevation: 3 },
  elevated: Platform.OS === 'ios'
    ? { shadowColor: Colors.primary.DEFAULT, shadowOpacity: 0.18, shadowRadius: 48, shadowOffset: { width: 0, height: 4 } }
    : { elevation: 8 },
  recessed: Platform.OS === 'ios'
    ? { shadowColor: '#000000', shadowOpacity: 0.60, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }
    : { elevation: 0 },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'recessed';
  accentBorder?: string;   // left border color — stat card mode
  glowing?: boolean;       // breathing glow animation
  glowColor?: string;      // glow color override (defaults to elixir purple)
  onPress?: () => void;    // makes it pressable with spring feedback
  className?: string;
  style?: object | object[];
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Card({
  children,
  variant = 'default',
  accentBorder,
  glowing = false,
  glowColor = Colors.primary.DEFAULT,
  onPress,
  className = '',
  style,
}: CardProps) {
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.98);
  const { glowStyle } = useGlowPulse(glowColor, 0.15, 0.45, 2400, glowing);

  // Base static styles
  const baseStyle: object = {
    backgroundColor: VARIANT_BG[variant],
    borderRadius: Radius.md,
    overflow: 'hidden' as const,
    ...(accentBorder
      ? { borderLeftWidth: 4, borderLeftColor: accentBorder }
      : {}),
  };

  // Shadow layer: glow animation overrides when active, else static shadow
  const shadowStyle = glowing ? glowStyle : VARIANT_SHADOW[variant];

  // Full style composition — immutable array, no mutation
  const composedStyle = [baseStyle, shadowStyle, style];

  const cardClassName = `p-4 ${className}`;

  if (onPress) {
    return (
      <Animated.View style={[pressStyle, composedStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          className={cardClassName}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View className={cardClassName} style={composedStyle}>
      {children}
    </Animated.View>
  );
}

export default Card;
