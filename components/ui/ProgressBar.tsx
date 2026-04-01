import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

type ProgressBarHeight = 'sm' | 'md';

interface ProgressBarProps {
  readonly current: number;
  readonly max: number;
  readonly color?: string;
  readonly height?: ProgressBarHeight;
  readonly showLabel?: boolean;
}

const HEIGHT_VALUES: Record<ProgressBarHeight, number> = {
  sm: 6,
  md: 10,
};

export function ProgressBar({
  current,
  max,
  color,
  height = 'sm',
  showLabel = false,
}: ProgressBarProps) {
  // TODO: Replace solid fill with expo-linear-gradient when available
  const barColor = color ?? '#a434ff';
  const fraction = max > 0 ? Math.min(current / max, 1) : 0;

  const animatedWidth = useRef(new Animated.Value(0)).current;
  const shimmerPos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: fraction,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [fraction, animatedWidth]);

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerPos, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerPos]);

  const h = HEIGHT_VALUES[height];

  return (
    <View>
      <View
        className="w-full rounded-full overflow-hidden"
        style={{ height: h, backgroundColor: '#23233f' }}
      >
        <Animated.View
          className="rounded-full overflow-hidden"
          style={{
            height: h,
            backgroundColor: barColor,
            width: animatedWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        >
          {/* Shimmer overlay */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '40%',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 999,
              left: shimmerPos.interpolate({
                inputRange: [0, 1],
                outputRange: ['-40%', '140%'],
              }),
            }}
          />
        </Animated.View>
      </View>
      {showLabel && (
        <Text
          className="text-xs mt-1 text-center"
          style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}
        >
          {current} / {max}
        </Text>
      )}
    </View>
  );
}

export default ProgressBar;
