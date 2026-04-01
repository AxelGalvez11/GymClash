import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';

type ProgressBarHeight = 'sm' | 'md';

interface ProgressBarProps {
  readonly current: number;
  readonly max: number;
  readonly color?: string;
  readonly height?: ProgressBarHeight;
  readonly showLabel?: boolean;
}

const HEIGHT_VALUES: Record<ProgressBarHeight, number> = {
  sm: 4,
  md: 8,
};

export function ProgressBar({
  current,
  max,
  color,
  height = 'sm',
  showLabel = false,
}: ProgressBarProps) {
  const accent = useAccent();
  const barColor = color ?? accent.DEFAULT;
  const fraction = max > 0 ? Math.min(current / max, 1) : 0;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: fraction,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [fraction, animatedWidth]);

  const h = HEIGHT_VALUES[height];

  return (
    <View>
      <View
        className="w-full rounded-full overflow-hidden"
        style={{ height: h, backgroundColor: Colors.surface.border }}
      >
        <Animated.View
          className="rounded-full"
          style={{
            height: h,
            backgroundColor: barColor,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>
      {showLabel && (
        <Text className="text-text-muted text-xs mt-1 text-center">
          {current} / {max}
        </Text>
      )}
    </View>
  );
}

export default ProgressBar;
