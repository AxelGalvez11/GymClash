import { View, Text } from 'react-native';
import type { PlayerType } from '@/types';
import {
  getPlayerTypeIcon,
  getPlayerTypeColor,
  getPlayerTypeDescription,
} from '@/lib/player-type/display';

interface PlayerTypeBadgeProps {
  readonly playerType: PlayerType;
  readonly size?: 'sm' | 'md';
}

/**
 * Compact badge showing the player's detected type.
 * sm: icon + display name inline.
 * md: icon + name + description + confidence bar.
 */
export function PlayerTypeBadge({
  playerType,
  size = 'sm',
}: PlayerTypeBadgeProps) {
  const icon = getPlayerTypeIcon(playerType);
  const color = getPlayerTypeColor(playerType);
  const description = getPlayerTypeDescription(playerType);
  const confidencePct = Math.round(playerType.confidence * 100);

  if (size === 'sm') {
    return (
      <View
        className="flex-row items-center rounded-full px-2.5 py-1"
        style={{ backgroundColor: `${color}20` }}
      >
        <Text className="text-xs mr-1">{icon}</Text>
        <Text className="text-xs font-semibold" style={{ color }}>
          {playerType.display_name}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-xl p-3"
      style={{ backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30` }}
    >
      {/* Header row */}
      <View className="flex-row items-center mb-1.5">
        <Text className="text-base mr-1.5">{icon}</Text>
        <Text className="text-sm font-bold text-white">
          {playerType.display_name}
        </Text>
      </View>

      {/* Description */}
      <Text className="text-xs text-neutral-400 mb-2">{description}</Text>

      {/* Confidence bar */}
      <View className="flex-row items-center">
        <Text className="text-[10px] text-neutral-500 mr-2">Confidence</Text>
        <View className="flex-1 h-1.5 rounded-full bg-neutral-800">
          <View
            className="h-1.5 rounded-full"
            style={{
              width: `${confidencePct}%`,
              backgroundColor: color,
            }}
          />
        </View>
        <Text className="text-[10px] text-neutral-500 ml-2">{confidencePct}%</Text>
      </View>
    </View>
  );
}
