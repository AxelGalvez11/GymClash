import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import type { CharacterBuild, CharacterState, CharacterTier, PlayerType } from '@/types';

interface CharacterDisplayProps {
  readonly level: number;
  readonly strengthCount: number;
  readonly scoutCount: number;
  readonly isWorkingOut?: boolean;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly playerType?: PlayerType;
}

function getCharacterTier(level: number): CharacterTier {
  if (level >= 76) return 'mythic';
  if (level >= 51) return 'legendary';
  if (level >= 31) return 'elite';
  if (level >= 16) return 'geared';
  if (level >= 6) return 'equipped';
  return 'basic';
}

function getCharacterBuild(strengthCount: number, scoutCount: number): CharacterBuild {
  const total = strengthCount + scoutCount;
  if (total === 0) return 'balanced';
  const strengthRatio = strengthCount / total;
  if (strengthRatio > 0.6) return 'strength';
  if (strengthRatio < 0.4) return 'cardio';
  return 'balanced';
}

function getCharacterState(isWorkingOut: boolean): CharacterState {
  if (isWorkingOut) return 'active';
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'sleeping';
  return 'resting';
}

const TIER_EMOJI: Record<CharacterTier, string> = {
  basic: '🧑',
  equipped: '🏋️',
  geared: '💪',
  elite: '⚡',
  legendary: '🔥',
  mythic: '👑',
};

const TIER_COLORS: Record<CharacterTier, string> = {
  basic: Colors.text.muted,
  equipped: Colors.rank.silver,
  geared: Colors.rank.gold,
  elite: Colors.rank.platinum,
  legendary: Colors.rank.diamond,
  mythic: Colors.rank.champion,
};

const BUILD_ICON: Record<CharacterBuild, React.ComponentProps<typeof FontAwesome>['name']> = {
  strength: 'heartbeat',
  cardio: 'road',
  balanced: 'bolt',
};

const SIZE_CONFIG = {
  sm: { container: 'w-12 h-12', emoji: 'text-2xl', badge: 'text-xs' },
  md: { container: 'w-20 h-20', emoji: 'text-4xl', badge: 'text-sm' },
  lg: { container: 'w-28 h-28', emoji: 'text-6xl', badge: 'text-base' },
};

/**
 * Character display component.
 *
 * MVP: Uses emoji + tier-colored border + build icon badge.
 * Phase 5A.1: Replace emoji with actual character sprite PNG.
 * The component API stays the same — only the rendering changes.
 */
function getBuildFromPlayerType(playerType: PlayerType): CharacterBuild {
  switch (playerType.category) {
    case 'cardio_specialist':
      return 'cardio';
    case 'strength_specialist':
      return 'strength';
    case 'balanced':
      return 'balanced';
  }
}

export function CharacterDisplay({
  level,
  strengthCount,
  scoutCount,
  isWorkingOut = false,
  size = 'md',
  playerType,
}: CharacterDisplayProps) {
  const tier = getCharacterTier(level);
  const build = playerType && playerType.confidence > 0
    ? getBuildFromPlayerType(playerType)
    : getCharacterBuild(strengthCount, scoutCount);
  const state = getCharacterState(isWorkingOut);
  const config = SIZE_CONFIG[size];

  return (
    <View className={`${config.container} rounded-full items-center justify-center relative`}
      style={{ borderWidth: 2, borderColor: TIER_COLORS[tier], backgroundColor: Colors.surface.overlay }}
    >
      {/* Character sprite (placeholder emoji — swap for Image when art is ready) */}
      <Text className={config.emoji}>
        {state === 'sleeping' ? '😴' : TIER_EMOJI[tier]}
      </Text>

      {/* Build type badge */}
      <View
        className="absolute -bottom-0.5 -right-0.5 rounded-full p-1"
        style={{ backgroundColor: Colors.surface.raised, borderWidth: 1, borderColor: TIER_COLORS[tier] }}
      >
        <FontAwesome
          name={BUILD_ICON[build]}
          size={size === 'sm' ? 8 : size === 'md' ? 10 : 12}
          color={TIER_COLORS[tier]}
        />
      </View>

      {/* Active workout indicator */}
      {state === 'active' && (
        <View
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
          style={{ backgroundColor: Colors.success }}
        />
      )}
    </View>
  );
}

export { getCharacterTier, getCharacterBuild, getCharacterState };
