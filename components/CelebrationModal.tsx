import { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated } from 'react-native';

import { Colors, Rank } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { Button } from '@/components/ui/Button';
import type { Rank as RankType } from '@/types';
import { getCharacterTier } from '@/components/ui/CharacterDisplay';

// ─── Types ───────────────────────────────────────────────

interface CelebrationModalProps {
  readonly visible: boolean;
  readonly type: 'level_up' | 'rank_up';
  readonly newLevel?: number;
  readonly newRank?: RankType;
  readonly onDismiss: () => void;
}

// ─── Tier Emoji (mirrors CharacterDisplay) ──────────────

const TIER_EMOJI: Record<string, string> = {
  basic: '🧑',
  equipped: '🏋️',
  geared: '💪',
  elite: '⚡',
  legendary: '🔥',
  mythic: '👑',
};

// ─── Decorative Stars ───────────────────────────────────

function DecorativeStars({ color }: { readonly color: string }) {
  return (
    <View className="flex-row items-center gap-3 mt-3">
      {['✦', '★', '✦'].map((star, i) => (
        <Text
          key={i}
          style={{
            color,
            fontSize: i === 1 ? 20 : 14,
            opacity: i === 1 ? 1 : 0.6,
          }}
        >
          {star}
        </Text>
      ))}
    </View>
  );
}

// ─── Component ──────────────────────────────────────────

export function CelebrationModal({
  visible,
  type,
  newLevel,
  newRank,
  onDismiss,
}: CelebrationModalProps) {
  const accent = useAccent();

  // Overlay fade
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, overlayOpacity]);

  // Card scale-in (spring from 0.8 → 1.0)
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      cardScale.setValue(0.8);
      cardOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 150,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, cardScale, cardOpacity]);

  // Number/rank glow pulse
  const glowScale = useRef(new Animated.Value(0.6)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      glowScale.setValue(0.6);
      glowOpacity.setValue(0);
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.spring(glowScale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 10,
            stiffness: 120,
          }),
          Animated.timing(glowOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, glowScale, glowOpacity]);

  const isLevelUp = type === 'level_up';
  const rankConfig = newRank ? (Rank[newRank] ?? Rank.rookie) : null;
  const primaryColor = isLevelUp ? accent.DEFAULT : (rankConfig?.color ?? accent.DEFAULT);
  const tierEmoji = newLevel ? TIER_EMOJI[getCharacterTier(newLevel)] ?? '🧑' : '🧑';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: overlayOpacity,
          backgroundColor: 'rgba(0,0,0,0.90)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
            width: '100%',
          }}
        >
          <View
            className="rounded-2xl p-8 items-center"
            style={{
              backgroundColor: Colors.surface.raised,
              borderWidth: 1,
              borderColor: primaryColor + '40',
            }}
          >
            {/* Title */}
            <Text
              className="text-2xl mb-2"
              style={{
                fontFamily: 'SpaceMono',
                letterSpacing: 4,
                color: primaryColor,
              }}
            >
              {isLevelUp ? 'LEVEL UP!' : 'RANK UP!'}
            </Text>

            {/* Decorative divider */}
            <View
              className="w-16 h-0.5 rounded-full mb-6"
              style={{ backgroundColor: primaryColor + '60' }}
            />

            {/* Level-Up content */}
            {isLevelUp && newLevel != null && (
              <Animated.View
                style={{
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                }}
                className="items-center"
              >
                <View
                  className="w-24 h-24 rounded-full items-center justify-center mb-4"
                  style={{
                    backgroundColor: primaryColor + '15',
                    borderWidth: 2,
                    borderColor: primaryColor + '50',
                  }}
                >
                  <Text
                    className="font-bold"
                    style={{
                      fontSize: 42,
                      fontFamily: 'SpaceMono',
                      color: primaryColor,
                    }}
                  >
                    {newLevel}
                  </Text>
                </View>
                <Text className="text-text-secondary text-sm">
                  {tierEmoji} {getCharacterTier(newLevel).charAt(0).toUpperCase() + getCharacterTier(newLevel).slice(1)} tier
                </Text>
              </Animated.View>
            )}

            {/* Rank-Up content */}
            {!isLevelUp && rankConfig && (
              <Animated.View
                style={{
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                }}
                className="items-center"
              >
                <Text className="text-5xl mb-3">{tierEmoji}</Text>
                <Text
                  className="text-3xl font-bold mb-2"
                  style={{ color: rankConfig.color, fontFamily: 'SpaceMono' }}
                >
                  {rankConfig.label}
                </Text>
                <DecorativeStars color={rankConfig.color} />
              </Animated.View>
            )}

            {/* Continue button */}
            <View className="w-full mt-8">
              <Button
                label="Continue"
                onPress={onDismiss}
                variant="primary"
                size="lg"
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default CelebrationModal;
