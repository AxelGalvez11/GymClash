import { useEffect, useRef } from 'react';
import { Platform, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Rank } from '@/constants/theme';
import type { Rank as RankType, CosmeticRarity } from '@/types';

type BadgeVariant = 'status' | 'rank' | 'rarity';

type StatusType = 'accepted' | 'rejected' | 'pending' | 'flagged';

const STATUS_COLORS: Record<StatusType, string> = {
  accepted: Colors.success,
  rejected: Colors.danger,
  pending: Colors.warning,
  flagged: Colors.danger,
};

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: Colors.text.secondary,
  rare: Colors.info,
  epic: Colors.brand.DEFAULT,
  legendary: Colors.warning,
};

interface BadgeBaseProps {
  readonly label: string;
  readonly color?: string;
  /** Changing this value triggers the scale bounce. Pass any numeric counter or version. */
  readonly value?: string | number;
}

interface StatusBadgeProps extends BadgeBaseProps {
  readonly variant: 'status';
  readonly status: StatusType;
}

interface RankBadgeProps extends BadgeBaseProps {
  readonly variant: 'rank';
  readonly rank: RankType;
}

interface RarityBadgeProps extends BadgeBaseProps {
  readonly variant: 'rarity';
  readonly rarity: CosmeticRarity;
}

type BadgeProps = StatusBadgeProps | RankBadgeProps | RarityBadgeProps;

function resolveColor(props: BadgeProps): string {
  if (props.color) return props.color;
  switch (props.variant) {
    case 'status':
      return STATUS_COLORS[props.status] ?? Colors.text.muted;
    case 'rank': {
      const rankConfig = Rank[props.rank] ?? Rank.rookie;
      return rankConfig.color;
    }
    case 'rarity':
      return RARITY_COLORS[props.rarity] ?? Colors.text.muted;
  }
}

const chromaticShadow = (color: string) =>
  Platform.OS === 'ios'
    ? {
        shadowColor: color,
        shadowRadius: 8,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 0 },
      }
    : { elevation: 4 };

export function Badge(props: BadgeProps) {
  const color = resolveColor(props);
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip bounce on initial mount — only react to value changes
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scale.value = withSpring(1.15, { damping: 6, stiffness: 280, mass: 0.6 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200, mass: 0.6 });
    });
  }, [props.value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        className="rounded-full px-2.5 py-0.5"
        style={[{ backgroundColor: color + '20' }, chromaticShadow(color)]}
      >
        <Text
          style={{ color, fontFamily: 'Lexend-Bold', fontSize: 10, letterSpacing: 1.5 }}
        >
          {props.label.toUpperCase()}
        </Text>
      </View>
    </Animated.View>
  );
}

export default Badge;
