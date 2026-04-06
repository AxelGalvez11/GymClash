import { Platform, Pressable, ActivityIndicator, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'hero';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  glowing?: boolean;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

/** Primary gradient: Elixir Purple top → deep violet bottom */
const PRIMARY_GRADIENT = ['#ce96ff', '#a434ff'] as const;
/** Danger gradient: hot coral → crimson */
const DANGER_GRADIENT = ['#ff6e84', '#d73357'] as const;

/** Vertical padding per size */
const PADDING_Y: Record<ButtonSize, number> = {
  sm: 8,
  md: 12,
  lg: 14,
  hero: 20,
};

/** Horizontal padding per size */
const PADDING_X: Record<ButtonSize, number> = {
  sm: 14,
  md: 20,
  lg: 24,
  hero: 36,
};

/** Font size per size (in px) */
const FONT_SIZE: Record<ButtonSize, number> = {
  sm: 11,
  md: 13,
  lg: 15,
  hero: 18,
};

/** Letter spacing per size */
const LETTER_SPACING: Record<ButtonSize, number> = {
  sm: 0.8,
  md: 1.0,
  lg: 1.2,
  hero: 2.0,
};

/** Border radius per size */
const BORDER_RADIUS: Record<ButtonSize, number> = {
  sm: 20,
  md: 24,
  lg: 28,
  hero: 32,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * iOS-only neon shadow for primary/danger variants at rest.
 * The 40px radius matches the HTML reference spec.
 */
function buildNeonShadow(color: string) {
  if (Platform.OS !== 'ios') return {};
  return {
    shadowColor: color,
    shadowRadius: 40,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
  };
}

/**
 * 3-D tactility: a 2px bottom "inset" illusion via a darker
 * border-bottom colour. Works cross-platform (no shadow needed).
 */
function buildTactileBorder(color: string) {
  return {
    borderBottomWidth: 2,
    borderBottomColor: color,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  glowing = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Spring-physics press scale — 0.95 matches spec
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.95);

  // Breathing glow — only wires up when glowing=true & not disabled
  const { glowStyle } = useGlowPulse(
    '#ce96ff',
    0.3,
    0.75,
    2400,
    glowing && !isDisabled,
  );

  // ── Sizing ──
  const py = PADDING_Y[size];
  const px = PADDING_X[size];
  const radius = BORDER_RADIUS[size];
  const fontSize = FONT_SIZE[size];
  const letterSpacing = LETTER_SPACING[size];

  // ── Label colour ──
  const labelColor = (() => {
    if (isDisabled) return '#6b698a';
    switch (variant) {
      case 'primary': return '#ffffff';
      case 'secondary': return '#e5e3ff';
      case 'danger': return '#ffffff';
      case 'ghost': return '#aaa8c3';
    }
  })();

  // ── Spinner colour ──
  const spinnerColor = variant === 'primary' || variant === 'danger'
    ? '#ffffff'
    : '#ce96ff';

  // ── Shared inner content ──
  const innerContent = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon != null && icon}
      <Text
        style={{
          fontFamily: variant === 'ghost' ? 'BeVietnamPro-Medium' : 'Epilogue-Bold',
          fontSize,
          letterSpacing,
          color: labelColor,
          textTransform: 'uppercase',
          includeFontPadding: false,
        }}
      >
        {children}
      </Text>
    </View>
  );

  // ── Wrapper: full-width or intrinsic ──
  const wrapperStyle = fullWidth
    ? ({ alignSelf: 'stretch' } as const)
    : ({ alignSelf: 'flex-start' } as const);

  // ── Pressable shared props ──
  const pressableProps = {
    onPress: isDisabled ? undefined : onPress,
    onPressIn: isDisabled ? undefined : onPressIn,
    onPressOut: isDisabled ? undefined : onPressOut,
    disabled: isDisabled,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PRIMARY — gradient fill + neon shadow + 3D tactile bottom
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === 'primary') {
    return (
      <Animated.View
        style={[
          wrapperStyle,
          pressStyle,
          glowing && !isDisabled && glowStyle,
          !isDisabled && buildNeonShadow('#ce96ff'),
          { borderRadius: radius },
          isDisabled && { opacity: 0.5 },
        ]}
      >
        <Pressable {...pressableProps}>
          <LinearGradient
            colors={PRIMARY_GRADIENT}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              {
                borderRadius: radius,
                paddingVertical: py,
                paddingHorizontal: px,
                alignItems: 'center',
                justifyContent: 'center',
              },
              buildTactileBorder('#7a1fd6'),
            ]}
          >
            {innerContent}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DANGER — gradient fill + coral neon shadow + 3D tactile bottom
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === 'danger') {
    return (
      <Animated.View
        style={[
          wrapperStyle,
          pressStyle,
          !isDisabled && buildNeonShadow('#ff6e84'),
          { borderRadius: radius },
          isDisabled && { opacity: 0.5 },
        ]}
      >
        <Pressable {...pressableProps}>
          <LinearGradient
            colors={DANGER_GRADIENT}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              {
                borderRadius: radius,
                paddingVertical: py,
                paddingHorizontal: px,
                alignItems: 'center',
                justifyContent: 'center',
              },
              buildTactileBorder('#8f1a2e'),
            ]}
          >
            {innerContent}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECONDARY — dark fill + ghost border
  // ─────────────────────────────────────────────────────────────────────────
  if (variant === 'secondary') {
    return (
      <Animated.View
        style={[
          wrapperStyle,
          pressStyle,
          {
            borderRadius: radius,
            backgroundColor: '#23233f',
            borderWidth: 1,
            borderColor: isDisabled ? 'transparent' : 'rgba(70, 70, 92, 0.2)',
          },
          buildTactileBorder('rgba(70, 70, 92, 0.35)'),
          isDisabled && { opacity: 0.5 },
        ]}
      >
        <Pressable
          {...pressableProps}
          style={{
            paddingVertical: py,
            paddingHorizontal: px,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {innerContent}
        </Pressable>
      </Animated.View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GHOST — transparent, no border, muted label
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        wrapperStyle,
        pressStyle,
        { borderRadius: radius },
        isDisabled && { opacity: 0.5 },
      ]}
    >
      <Pressable
        {...pressableProps}
        style={{
          paddingVertical: py,
          paddingHorizontal: px,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {innerContent}
      </Pressable>
    </Animated.View>
  );
}

export default Button;
