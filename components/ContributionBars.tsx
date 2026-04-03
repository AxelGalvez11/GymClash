import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

interface ContributionBarProps {
  readonly contributions: ReadonlyArray<{
    readonly user_id: string;
    readonly display_name: string;
    readonly contribution_points: number;
    readonly workout_count: number;
  }>;
  readonly maxPoints: number;
  readonly accentColor: string;
}

function AnimatedBar({
  fraction,
  color,
}: {
  readonly fraction: number;
  readonly color: string;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: fraction,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [fraction, widthAnim]);

  return (
    <View
      className="flex-2 h-[10px] rounded-full mx-2"
      style={{ backgroundColor: '#23233f' }}
    >
      <Animated.View
        className="h-[10px] rounded-full"
        style={{
          backgroundColor: color,
          width: widthAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
          }),
        }}
      />
    </View>
  );
}

export default function ContributionBars({
  contributions,
  maxPoints,
  accentColor,
}: ContributionBarProps) {
  const sorted = [...contributions]
    .sort((a, b) => b.contribution_points - a.contribution_points)
    .slice(0, 10);

  const safeMax = maxPoints > 0 ? maxPoints : 1;

  return (
    <View className="mt-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#23233f' }}>
      <Text
        style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
        className="text-xs uppercase mb-3"
      >
        Top Contributors
      </Text>
      {sorted.map((c) => {
        const fraction = Math.min(c.contribution_points / safeMax, 1);
        return (
          <View key={c.user_id} className="flex-row items-center mb-2">
            <Text
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
              className="flex-1"
              numberOfLines={1}
            >
              {c.display_name || 'Warrior'}
            </Text>
            <View className="flex-[2]">
              <AnimatedBar fraction={fraction} color={accentColor} />
            </View>
            <Text
              style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}
              className="text-xs text-right min-w-[60px]"
            >
              {Math.round(c.contribution_points)} pts
            </Text>
          </View>
        );
      })}
    </View>
  );
}
