import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAnimatedBar } from '@/hooks/use-animated-bar';

export interface BiColorBarProps {
  leftLabel: string;
  rightLabel: string;
  leftPercent: number;   // 0–100
  leftColor?: string;    // default '#ce96ff'
  rightColor?: string;   // default '#ef4444'
  height?: number;       // default 10
  showLabels?: boolean;  // default true
  showPercents?: boolean;// default true
}

/**
 * BiColorBar: A split progress bar showing two competing clans' percentages.
 * Both sides animate from 0 → target on mount/change (600ms, 200ms delay).
 * Pulsing glow dot marks the split point.
 */
export function BiColorBar({
  leftLabel,
  rightLabel,
  leftPercent,
  leftColor = '#ce96ff',
  rightColor = '#ef4444',
  height = 10,
  showLabels = true,
  showPercents = true,
}: BiColorBarProps) {
  // Clamp to 0-100
  const clampedPercent = Math.max(0, Math.min(100, leftPercent));
  const rightPercent = 100 - clampedPercent;

  // Animated fills
  const { barStyle: leftBarStyle } = useAnimatedBar(clampedPercent, 600, 200);
  const { barStyle: rightBarStyle } = useAnimatedBar(rightPercent, 600, 200);

  // Pulsing glow opacity at split point
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    glowOpacity.value = withDelay(
      800, // start after fill settles
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
    );
  }, []);

  // Continuously pulse after mount
  useEffect(() => {
    let running = true;
    function pulse() {
      if (!running) return;
      glowOpacity.value = withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }, () => {
        if (!running) return;
        glowOpacity.value = withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }, () => {
          pulse();
        });
      });
    }
    // Kick off after initial delay
    const timer = setTimeout(pulse, 900);
    return () => {
      running = false;
      clearTimeout(timer);
    };
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View className="w-full">
      {/* Labels row */}
      {showLabels && (
        <View className="flex-row items-center justify-between mb-2">
          <Text style={{ color: leftColor, fontFamily: 'Lexend-SemiBold' }} className="text-sm font-bold">
            {leftLabel}
          </Text>
          <Text style={{ color: rightColor, fontFamily: 'Lexend-SemiBold' }} className="text-sm font-bold">
            {rightLabel}
          </Text>
        </View>
      )}

      {/* Main bar container */}
      <View
        className="w-full flex-row rounded-full overflow-hidden"
        style={{ height, backgroundColor: '#0c0c1f' }}
      >
        {/* Left animated fill */}
        <Animated.View
          className="rounded-l-full"
          style={[
            { backgroundColor: leftColor, height, opacity: 0.9 },
            leftBarStyle,
          ]}
        />

        {/* Right animated fill — grows from center outward */}
        <Animated.View
          className="rounded-r-full"
          style={[
            { backgroundColor: rightColor, height, opacity: 0.9 },
            rightBarStyle,
          ]}
        />
      </View>

      {/* Pulsing glow dot at the split point */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: `${clampedPercent}%`,
            top: -4,
            width: 20,
            height: height + 8,
            transform: [{ translateX: -10 }],
          },
          glowStyle,
        ]}
      >
        <View
          className="w-full h-full rounded-full"
          style={{
            backgroundColor: '#ffffff',
            shadowColor: '#ffffff',
            shadowOpacity: 0.6,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        />
      </Animated.View>

      {/* Percentage labels */}
      {showPercents && (
        <View className="flex-row items-center justify-between mt-1">
          <Text style={{ color: leftColor, fontFamily: 'Lexend-SemiBold' }} className="text-xs">
            {Math.round(clampedPercent)}%
          </Text>
          <Text style={{ color: rightColor, fontFamily: 'Lexend-SemiBold' }} className="text-xs">
            {Math.round(rightPercent)}%
          </Text>
        </View>
      )}
    </View>
  );
}

export default BiColorBar;
