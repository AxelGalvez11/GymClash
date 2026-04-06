import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedBar } from '@/hooks/use-animated-bar';
import { useShimmer } from '@/hooks/use-shimmer';

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

// Shimmer overlay width as fraction of container (40%)
const SHIMMER_WIDTH_FRACTION = 0.4;

export function ProgressBar({
  current,
  max,
  color,
  height = 'sm',
  showLabel = false,
}: ProgressBarProps) {
  const barColor = color ?? '#a434ff';
  const fraction = max > 0 ? Math.min(current / max, 1) : 0;
  const percentage = fraction * 100;

  const h = HEIGHT_VALUES[height];

  // Animated fill from 0 → target percentage (600ms)
  const { barStyle } = useAnimatedBar(percentage, 600, 200);

  // Shimmer sweep across the filled area (1800ms cycle)
  // Width passed to useShimmer is used to drive translateX range.
  // We pass a nominal width; the shimmer is clipped inside the fill anyway.
  const { shimmerStyle } = useShimmer(300, 1800, fraction > 0);

  return (
    <View>
      {/* Track */}
      <View
        className="w-full rounded-full overflow-hidden"
        style={{ height: h, backgroundColor: '#23233f' }}
      >
        {/* Animated fill — clips the shimmer to the filled region */}
        <Animated.View
          className="rounded-full overflow-hidden"
          style={[
            { height: h, backgroundColor: barColor, position: 'absolute', left: 0 },
            barStyle,
          ]}
        >
          {/* Shimmer overlay — clipped by parent overflow:hidden */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                // Shimmer blade is 40% of whatever the fill width is
                width: `${SHIMMER_WIDTH_FRACTION * 100}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                borderRadius: 999,
              },
              shimmerStyle,
            ]}
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
