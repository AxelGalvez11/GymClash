import { View, Text } from 'react-native';
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

export function Badge(props: BadgeProps) {
  const color = resolveColor(props);

  return (
    <View
      className="rounded-full px-2.5 py-0.5"
      style={{ backgroundColor: color + '20' }}
    >
      <Text
        className="text-xs font-bold uppercase"
        style={{ color, fontFamily: 'SpaceMono', letterSpacing: 0.5 }}
      >
        {props.label}
      </Text>
    </View>
  );
}

export default Badge;
