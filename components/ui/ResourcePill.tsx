import React, { useMemo } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { usePressScale } from '@/hooks/use-press-scale';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BG_COLOR = '#23233f';
const DEFAULT_COLOR = '#ffd709';

const SIZE_STYLES = {
  sm: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    lineHeight: 16,
    gap: 4,
  },
  md: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    fontSize: 14,
    lineHeight: 20,
    gap: 5,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 16,
    lineHeight: 22,
    gap: 6,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a hex color + alpha fraction to rgba string. */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Format a number with comma thousands separators. */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Props
// ---------------------------------------------------------------------------

export interface ResourcePillProps {
  /** Numeric value or pre-formatted string to display. */
  value: number | string;
  /** Emoji icon shown after the value, e.g. "🏆" "💎" "⚡". */
  icon?: string;
  /** Text color. Defaults to gold `#ffd709`. */
  color?: string;
  /** Border base color at 20% opacity. Defaults to `color`. */
  borderColor?: string;
  /** Size variant. Defaults to `'md'`. */
  size?: 'sm' | 'md' | 'lg';
  /** Makes the pill pressable with spring scale feedback. */
  onPress?: () => void;
  /** Roll the number up from 0 when the component mounts. */
  animated?: boolean;
  /** Additional styles applied to the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier. */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StaticLabelProps {
  value: number | string;
  icon?: string;
  color: string;
  fontSize: number;
  lineHeight: number;
}

function StaticLabel({ value, icon, color, fontSize, lineHeight }: StaticLabelProps) {
  const display = typeof value === 'number' ? formatNumber(value) : value;
  const label = icon ? `${display} ${icon}` : display;

  const textStyle = useMemo(
    () => ({
      fontFamily: 'Lexend_600SemiBold',
      fontSize,
      lineHeight,
      color,
      includeFontPadding: false,
    }),
    [fontSize, lineHeight, color],
  );

  return (
    <Text style={textStyle} numberOfLines={1}>
      {label}
    </Text>
  );
}

// InteractivePill — wraps with Pressable + spring scale when onPress is given
// ---------------------------------------------------------------------------

interface InteractivePillProps {
  pillStyle: ViewStyle;
  outerStyle: StyleProp<ViewStyle>;
  onPress: () => void;
  testID?: string;
  children: React.ReactNode;
}

function InteractivePill({
  pillStyle,
  outerStyle,
  onPress,
  testID,
  children,
}: InteractivePillProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.95);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={testID}
      accessibilityRole="button"
    >
      <Animated.View style={[pillStyle, animatedStyle, outerStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ResourcePill
// ---------------------------------------------------------------------------

export function ResourcePill({
  value,
  icon,
  color = DEFAULT_COLOR,
  borderColor,
  size = 'md',
  onPress,
  animated = false,
  style,
  testID,
}: ResourcePillProps) {
  const sizes = SIZE_STYLES[size];
  const resolvedBorderColor = borderColor ?? color;
  const borderRgba = useMemo(() => hexToRgba(resolvedBorderColor, 0.2), [resolvedBorderColor]);

  const pillStyle = useMemo<ViewStyle>(
    () => ({
      backgroundColor: BG_COLOR,
      borderWidth: 1,
      borderColor: borderRgba,
      borderRadius: 999,
      paddingHorizontal: sizes.paddingHorizontal,
      paddingVertical: sizes.paddingVertical,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: sizes.gap,
    }),
    [borderRgba, sizes],
  );

  const label = (
    <StaticLabel
      value={value}
      icon={icon}
      color={color}
      fontSize={sizes.fontSize}
      lineHeight={sizes.lineHeight}
    />
  );

  if (onPress) {
    return (
      <InteractivePill
        pillStyle={pillStyle}
        outerStyle={style}
        onPress={onPress}
        testID={testID}
      >
        {label}
      </InteractivePill>
    );
  }

  return (
    <View style={[pillStyle, style]} testID={testID}>
      {label}
    </View>
  );
}
