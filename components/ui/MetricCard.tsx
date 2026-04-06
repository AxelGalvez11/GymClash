import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useCountUp } from '@/hooks/use-count-up';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadgeProp {
  text: string;
  color: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  iconColor?: string;
  accentColor?: string;
  subtitle?: string;
  onPress?: () => void;
  animated?: boolean;
  badge?: BadgeProp;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_COLOR = '#1d1d37';
const LABEL_COLOR = '#aaa8c3';
const VALUE_COLOR = '#e5e3ff';
const DEFAULT_ACCENT = '#81ecff';

const SHADOW_STYLE =
  Platform.OS === 'ios'
    ? {
        shadowColor: '#ce96ff',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }
    : { elevation: 4 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ text, color }: BadgeProp) {
  // 20% opacity background from badge color — convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <View
      style={{
        backgroundColor: hexToRgba(color, 0.2),
        borderRadius: 99,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontFamily: 'Lexend_600SemiBold',
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// Animated value display — only mounts when animated=true and value is numeric
function AnimatedValue({ value }: { value: number }) {
  const { animatedValue } = useCountUp(value, 800, 0, 120);
  const [display, setDisplay] = React.useState('0');

  React.useEffect(() => {
    const id = setInterval(() => {
      setDisplay(Math.round(animatedValue.value).toString());
    }, 16);
    const timeout = setTimeout(() => clearInterval(id), 1000);
    return () => { clearInterval(id); clearTimeout(timeout); };
  }, [value]);

  return (
    <Text
      style={{
        fontFamily: 'Epilogue_700Bold',
        fontSize: 28,
        color: VALUE_COLOR,
        fontStyle: 'italic',
        lineHeight: 34,
      }}
    >
      {display}
    </Text>
  );
}

// Static value display
function StaticValue({ value }: { value: string | number }) {
  return (
    <Text
      style={{
        fontFamily: 'Epilogue_700Bold',
        fontSize: 28,
        color: VALUE_COLOR,
        fontStyle: 'italic',
        lineHeight: 34,
      }}
    >
      {String(value)}
    </Text>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  icon,
  iconColor = DEFAULT_ACCENT,
  accentColor = DEFAULT_ACCENT,
  subtitle,
  onPress,
  animated = false,
  badge,
}: MetricCardProps) {
  const { animatedStyle: entranceStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);

  const shouldAnimate = animated && typeof value === 'number';

  const cardStyle = [
    {
      backgroundColor: BG_COLOR,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: accentColor,
      padding: 16,
      ...SHADOW_STYLE,
    },
    entranceStyle,
    onPress ? pressStyle : undefined,
  ].filter(Boolean);

  const inner = (
    <>
      {/* Label row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text
          style={{
            fontFamily: 'Lexend_600SemiBold',
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: LABEL_COLOR,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {badge && <Badge text={badge.text} color={badge.color} />}
      </View>

      {/* Value row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon && (
          <FontAwesome name={icon} size={22} color={iconColor} />
        )}
        {shouldAnimate ? (
          <AnimatedValue value={value as number} />
        ) : (
          <StaticValue value={value} />
        )}
      </View>

      {/* Optional subtitle */}
      {subtitle && (
        <Text
          style={{
            fontFamily: 'Lexend_400Regular',
            fontSize: 11,
            color: LABEL_COLOR,
            marginTop: 4,
          }}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
        >
          {inner}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={cardStyle}>
      {inner}
    </Animated.View>
  );
}

export default MetricCard;
