import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

interface SkeletonProps {
  readonly width: number | string;
  readonly height: number;
  readonly borderRadius?: number;
  readonly style?: ViewStyle;
}

function SkeletonBase({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#1d1d37',
          opacity,
        },
        style,
      ]}
    />
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
  readonly width?: number | string;
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
