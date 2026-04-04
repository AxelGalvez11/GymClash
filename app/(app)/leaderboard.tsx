import { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier, LeaderboardZoneColors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { fetchClanLeaderboard, fetchPersonalLeaderboard } from '@/services/api';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { useProfile } from '@/hooks/use-profile';
import type { Rank as RankType, ArenaTier, LeaderboardZone } from '@/types';

type Tab = 'clans' | 'players';

function getZone(index: number, total: number): LeaderboardZone {
  if (total === 0) return 'safe';
  const promoteEnd = Math.max(1, Math.floor(total * 0.2));
  const demoteStart = total - Math.max(1, Math.floor(total * 0.2));
  if (index < promoteEnd) return 'promote';
  if (index >= demoteStart) return 'demote';
  return 'safe';
}

function ZoneIndicator({ zone }: { readonly zone: LeaderboardZone }) {
  if (zone === 'safe') return null;
  return (
    <FontAwesome
      name={zone === 'promote' ? 'arrow-up' : 'arrow-down'}
      size={10}
      color={zone === 'promote' ? LeaderboardZoneColors.promote : LeaderboardZoneColors.demote}
      style={{ marginRight: 4 }}
    />
  );
}

function MedalIcon({ position }: { readonly position: number }) {
  if (position === 0) return <Text className="text-lg">🥇</Text>;
  if (position === 1) return <Text className="text-lg">🥈</Text>;
  if (position === 2) return <Text className="text-lg">🥉</Text>;
  return (
    <View className="w-7 h-7 rounded-full bg-[#23233f] items-center justify-center">
      <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs font-bold">{position + 1}</Text>
    </View>
  );
}

function ClanRow({
  item,
  index,
  zone,
  onPress,
}: {
  readonly item: any;
  readonly index: number;
  readonly zone: LeaderboardZone;
  readonly onPress: () => void;
}) {
  const zoneBg =
    zone === 'promote'
      ? { backgroundColor: LeaderboardZoneColors.promote + '15' }
      : zone === 'demote'
        ? { backgroundColor: LeaderboardZoneColors.demote + '15' }
        : undefined;

  const zoneBorder =
    zone === 'promote'
      ? { borderLeftColor: LeaderboardZoneColors.promote, borderLeftWidth: 3 }
      : zone === 'demote'
        ? { borderLeftColor: LeaderboardZoneColors.demote, borderLeftWidth: 3 }
        : undefined;

  return (
    <Pressable
      className="bg-[#1d1d37] rounded-xl p-4 mb-2 flex-row items-center active:scale-[0.98]"
      style={[zoneBg, zoneBorder]}
      onPress={onPress}
    >
      <ZoneIndicator zone={zone} />
      <MedalIcon position={index} />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center gap-2">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold">{item.name}</Text>
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }} className="text-sm">[{item.tag}]</Text>
        </View>
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">
          {item.member_count} members · {item.war_wins ?? 0}W / {item.wars_played ?? 0} wars
        </Text>
      </View>
      <View className="items-end">
        <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">{item.total_trophies ?? 0}</Text>
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">🏆</Text>
      </View>
    </Pressable>
  );
}

function PlayerRow({
  item,
  index,
  zone,
  onPress,
}: {
  readonly item: any;
  readonly index: number;
  readonly zone: LeaderboardZone;
  readonly onPress: () => void;
}) {
  const rankKey = (item.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;
  const trophies = item.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (item.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier];

  const zoneBg =
    zone === 'promote'
      ? { backgroundColor: LeaderboardZoneColors.promote + '15' }
      : zone === 'demote'
        ? { backgroundColor: LeaderboardZoneColors.demote + '15' }
        : undefined;

  const zoneBorder =
    zone === 'promote'
      ? { borderLeftColor: LeaderboardZoneColors.promote, borderLeftWidth: 3 }
      : zone === 'demote'
        ? { borderLeftColor: LeaderboardZoneColors.demote, borderLeftWidth: 3 }
        : undefined;

  return (
    <Pressable
      onPress={onPress}
      className="bg-[#1d1d37] rounded-xl p-4 mb-2 flex-row items-center active:scale-[0.98]"
      style={[zoneBg, zoneBorder]}
    >
      <ZoneIndicator zone={zone} />
      <MedalIcon position={index} />
      <View className="flex-1 ml-3">
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold">{item.display_name || 'Warrior'}</Text>
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">
          <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text> · Lv.{item.level ?? 1} · {item.current_streak ?? 0}d streak
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="items-end">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">{trophies}</Text>
          <Text className="text-xs" style={{ color: arenaConfig.accent }}>{arenaConfig.badge}</Text>
        </View>
        <FontAwesome name="chevron-right" size={12} color="#74738b" />
      </View>
    </Pressable>
  );
}

function StickyYouRow({
  profile,
  players,
  accentColor,
}: {
  readonly profile: any;
  readonly players: readonly any[] | undefined;
  readonly accentColor: string;
}) {
  const userEntry = players?.find((p: any) => p.id === profile.id);
  const userIndex = players?.findIndex((p: any) => p.id === profile.id) ?? -1;
  const isRanked = userIndex >= 0;

  const rankKey = (profile.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;

  return (
    <View
      className="bg-[#23233f] rounded-t-xl px-4 py-3 flex-row items-center"
      style={{
        borderLeftColor: accentColor,
        borderLeftWidth: 3,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      }}
    >
      {isRanked ? (
        <>
          <View className="w-7 h-7 rounded-full bg-[#1d1d37] items-center justify-center">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="text-xs font-bold">{userIndex + 1}</Text>
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row items-center gap-2">
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold text-sm">You</Text>
              <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">{profile.display_name}</Text>
            </View>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">
              <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text> · Lv.{profile.level ?? 1}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">{userEntry?.trophy_rating ?? profile.trophy_rating ?? 0}</Text>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">🏆</Text>
          </View>
        </>
      ) : (
        <>
          <View className="w-7 h-7 rounded-full bg-[#1d1d37] items-center justify-center">
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs font-bold">—</Text>
          </View>
          <View className="flex-1 ml-3">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold text-sm">Unranked</Text>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">Complete your biodata and log workouts to appear here</Text>
          </View>
        </>
      )}
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const accent = useAccent();
  const [tab, setTab] = useState<Tab>('clans');
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile } = useProfile();

  // Entrance animations
  const fadeHeader = useFadeSlide(0);
  const fadeList = useFadeSlide(100);

  const {
    data: clans,
    isLoading: clansLoading,
    refetch: refetchClans,
  } = useQuery({
    queryKey: ['clan-leaderboard'],
    queryFn: () => fetchClanLeaderboard(50),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: players,
    isLoading: playersLoading,
    refetch: refetchPlayers,
  } = useQuery({
    queryKey: ['player-leaderboard'],
    queryFn: () => fetchPersonalLeaderboard(100),
    staleTime: 1000 * 60 * 5,
    enabled: tab === 'players',
  });

  const isLoading = tab === 'clans' ? clansLoading : playersLoading;
  const data = tab === 'clans' ? clans : players;
  const dataLength = data?.length ?? 0;

  const getZoneForIndex = useCallback(
    (index: number): LeaderboardZone => getZone(index, dataLength),
    [dataLength],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === 'clans') {
        await refetchClans();
      } else {
        await refetchPlayers();
      }
    } finally {
      setRefreshing(false);
    }
  }, [tab, refetchClans, refetchPlayers]);

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const zone = getZoneForIndex(index);
      if (tab === 'clans') {
        return <ClanRow item={item} index={index} zone={zone} onPress={() => router.push(`/(app)/clan-view/${item.id}` as any)} />;
      }
      return (
        <PlayerRow
          item={item}
          index={index}
          zone={zone}
          onPress={() => router.push(`/(app)/player/${item.id}`)}
        />
      );
    },
    [tab, getZoneForIndex, router],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <Animated.View style={fadeHeader.style} className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.replace('/(app)/clan' as any)} className="active:scale-[0.98]" hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-lg font-bold">Leaderboard</Text>
          <View className="w-12" />
        </View>

        {/* Tab Switcher */}
        <View className="flex-row gap-2 mb-2">
          {([
            { key: 'clans' as Tab, label: 'Clans', icon: 'shield' as const },
            { key: 'players' as Tab, label: 'Players', icon: 'user' as const },
          ]).map(({ key, label, icon }) => (
            <Pressable
              key={key}
              className={`flex-1 flex-row items-center justify-center gap-2 py-2 rounded-full ${
                tab === key ? 'bg-[#ce96ff]' : 'bg-[#23233f]'
              }`}
              onPress={() => setTab(key)}
            >
              <FontAwesome name={icon} size={14} color={tab === key ? '#000' : '#aaa8c3'} />
              <Text
                style={{ fontFamily: 'Lexend-SemiBold' }}
                className={tab === key ? 'text-black font-bold' : 'text-[#aaa8c3]'}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={fadeList.style} className="flex-1">
      {isLoading ? (
        <ActivityIndicator color="#ce96ff" className="mt-8" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerClassName="px-4 pb-8"
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={renderItem}
          ListEmptyComponent={
            <View className="items-center py-12">
              <FontAwesome name="trophy" size={32} color="#74738b" />
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-lg mt-3">
                {tab === 'clans' ? 'No clans yet' : 'No ranked players yet'}
              </Text>
              {tab === 'players' && (
                <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-sm mt-1 text-center px-8">
                  Complete your biodata and log 10 workouts to appear here
                </Text>
              )}
            </View>
          }
        />
      )}
      </Animated.View>

      {/* Sticky "You" row — players tab only */}
      {tab === 'players' && profile && !isLoading && (
        <StickyYouRow
          profile={profile}
          players={players}
          accentColor={accent.DEFAULT}
        />
      )}
    </SafeAreaView>
  );
}
