import { useState } from 'react';
import { View, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Animated from 'react-native-reanimated';
import { useShimmer } from '@/hooks/use-shimmer';

interface SkeletonProps {
  readonly width: number | `${number}%` | 'auto';
  readonly height: number;
  readonly borderRadius?: number;
  readonly style?: ViewStyle;
}

function SkeletonBase({ width, height, borderRadius = 8, style }: SkeletonProps) {
  // For percentage/auto widths we measure the container so useShimmer gets the real pixel width
  const [measuredWidth, setMeasuredWidth] = useState<number>(
    typeof width === 'number' ? width : 200,
  );

  const { shimmerStyle } = useShimmer(measuredWidth);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setMeasuredWidth(w);
  };

  return (
    <View
      onLayout={typeof width !== 'number' ? onLayout : undefined}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#1d1d37',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {/* Shimmer sweep layer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: measuredWidth * 0.55,
            // Subtle white highlight gradient approximated via a translucent white bar
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderRadius,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

export function Skeleton(props: SkeletonProps) {
  return <SkeletonBase {...props} />;
}

/** Preset: card-shaped skeleton */
export function SkeletonCard({ style }: { readonly style?: ViewStyle }) {
  return <SkeletonBase width="100%" height={80} borderRadius={16} style={style} />;
}

/** Preset: single line of text */
export function SkeletonText({
  width = '60%',
  style,
}: {
  readonly width?: number | `${number}%` | 'auto';
  readonly style?: ViewStyle;
}) {
  return <SkeletonBase width={width} height={14} borderRadius={4} style={style} />;
}

/** Preset: circular avatar */
export function SkeletonAvatar({
  size = 40,
  style,
}: {
  readonly size?: number;
  readonly style?: ViewStyle;
}) {
  return <SkeletonBase width={size} height={size} borderRadius={size / 2} style={style} />;
}

export default Skeleton;
