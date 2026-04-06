import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Arena, getArenaTier } from '@/constants/theme';
import { useProfile } from '@/hooks/use-profile';
import type { ArenaTier } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ArenaEntry {
  readonly tier: ArenaTier;
  readonly label: string;
  readonly accent: string;
  readonly badge: string;
  readonly minTrophies: number;
  readonly description: string;
}

// ─── Derived Data ────────────────────────────────────────────────────────────

const ARENA_LIST: readonly ArenaEntry[] = (
  Object.entries(Arena) as [ArenaTier, (typeof Arena)[ArenaTier]][]
)
  .sort((a, b) => a[1].minTrophies - b[1].minTrophies)
  .map(([tier, config]) => ({
    tier,
    label: config.label,
    accent: config.accent,
    badge: config.badge,
    minTrophies: config.minTrophies,
    description: config.description,
  }));

// ─── Arena Card ──────────────────────────────────────────────────────────────

function ArenaCard({
  entry,
  isCurrent,
  isUnlocked,
}: {
  readonly entry: ArenaEntry;
  readonly isCurrent: boolean;
  readonly isUnlocked: boolean;
}) {
  return (
    <View
      className="mx-4 mb-3 rounded-2xl border p-4"
      style={{
        backgroundColor: isUnlocked ? '#17172f' : '#111127',
        borderColor: isCurrent ? entry.accent : '#46465c33',
        borderWidth: isCurrent ? 2 : 1,
        opacity: isUnlocked ? 1 : 0.45,
        // Glow effect for current arena
        ...(isCurrent
          ? {
              shadowColor: entry.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
            }
          : {}),
      }}
    >
      <View className="flex-row items-center">
        {/* Badge */}
        <View
          className="w-12 h-12 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: isUnlocked ? `${entry.accent}22` : '#23233f' }}
        >
          <Text className="text-2xl">{entry.badge}</Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className="text-base font-semibold"
              style={{
                color: isUnlocked ? '#e5e3ff' : '#74738b',
                fontFamily: 'Lexend-SemiBold',
              }}
            >
              {entry.label}
            </Text>
            {isCurrent && (
              <View
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${entry.accent}33` }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: entry.accent, fontFamily: 'Lexend-SemiBold' }}
                >
                  CURRENT
                </Text>
              </View>
            )}
          </View>
          <Text
            className="text-xs mt-0.5"
            style={{
              color: isUnlocked ? '#aaa8c3' : '#74738b',
              fontFamily: 'Lexend-Regular',
            }}
          >
            {entry.description}
          </Text>
        </View>

        {/* Trophy threshold */}
        <View className="items-end ml-2">
          <View className="flex-row items-center">
            {!isUnlocked && (
              <FontAwesome name="lock" size={10} color="#74738b" style={{ marginRight: 4 }} />
            )}
            <Text
              className="text-sm font-bold"
              style={{
                color: isUnlocked ? entry.accent : '#74738b',
                fontFamily: 'Lexend-SemiBold',
              }}
            >
              {entry.minTrophies}
            </Text>
          </View>
          <Text
            className="text-[10px]"
            style={{ color: '#74738b', fontFamily: 'Lexend-Regular' }}
          >
            trophies
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ArenaScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();

  const trophyRating = profile?.trophy_rating ?? 0;
  const currentTier = getArenaTier(trophyRating);

  const currentIndex = useMemo(
    () => ARENA_LIST.findIndex((a) => a.tier === currentTier),
    [currentTier],
  );

  return (
    <ScreenBackground glowPosition="top">
      {/* ── Header ── */}
      <View className="flex-row items-center px-4 pt-2 pb-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: '#23233f' }}
        >
          <FontAwesome name="chevron-left" size={16} color="#e5e3ff" />
        </Pressable>
        <Text
          className="text-lg ml-3"
          style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}
        >
          Arenas
        </Text>
        <View className="flex-1" />
        <View className="flex-row items-center">
          <Text className="text-base mr-1">🏆</Text>
          <Text
            className="text-sm font-bold"
            style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold' }}
          >
            {trophyRating}
          </Text>
        </View>
      </View>

      {/* ── Arena List ── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {ARENA_LIST.map((entry, index) => (
          <ArenaCard
            key={entry.tier}
            entry={entry}
            isCurrent={entry.tier === currentTier}
            isUnlocked={index <= currentIndex}
          />
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}
