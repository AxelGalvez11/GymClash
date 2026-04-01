import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { fetchClanLeaderboard, fetchPersonalLeaderboard } from '@/services/api';
import type { Rank as RankType, ArenaTier } from '@/types';

type Tab = 'clans' | 'players';

function MedalIcon({ position }: { readonly position: number }) {
  if (position === 0) return <Text className="text-lg">🥇</Text>;
  if (position === 1) return <Text className="text-lg">🥈</Text>;
  if (position === 2) return <Text className="text-lg">🥉</Text>;
  return (
    <View className="w-7 h-7 rounded-full bg-surface-overlay items-center justify-center">
      <Text className="text-text-muted text-xs font-bold">{position + 1}</Text>
    </View>
  );
}

function ClanRow({ item, index }: { readonly item: any; readonly index: number }) {
  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-2 flex-row items-center">
      <MedalIcon position={index} />
      <View className="flex-1 ml-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-bold">{item.name}</Text>
          <Text className="text-white/60 text-sm">[{item.tag}]</Text>
        </View>
        <Text className="text-text-muted text-xs">
          {item.member_count} members · {item.war_wins ?? 0}W / {item.wars_played ?? 0} wars
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-white font-bold">{item.total_trophies ?? 0}</Text>
        <Text className="text-text-muted text-xs">🏆</Text>
      </View>
    </View>
  );
}

function PlayerRow({ item, index }: { readonly item: any; readonly index: number }) {
  const rankKey = (item.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;
  const trophies = item.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (item.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier];

  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-2 flex-row items-center">
      <MedalIcon position={index} />
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold">{item.display_name || 'Warrior'}</Text>
        <Text className="text-text-muted text-xs">
          <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text> · Lv.{item.level ?? 1} · {item.current_streak ?? 0}d streak
        </Text>
      </View>
      <View className="items-end">
        <Text className="text-white font-bold">{trophies}</Text>
        <Text className="text-xs" style={{ color: arenaConfig.accent }}>{arenaConfig.badge}</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('clans');

  const { data: clans, isLoading: clansLoading } = useQuery({
    queryKey: ['clan-leaderboard'],
    queryFn: () => fetchClanLeaderboard(50),
    staleTime: 1000 * 60 * 5,
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['player-leaderboard'],
    queryFn: () => fetchPersonalLeaderboard(100),
    staleTime: 1000 * 60 * 5,
    enabled: tab === 'players',
  });

  const isLoading = tab === 'clans' ? clansLoading : playersLoading;
  const data = tab === 'clans' ? clans : players;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-white/60 text-base">← Back</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Leaderboard</Text>
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
                tab === key ? 'bg-white' : 'bg-surface-raised border border-surface-border'
              }`}
              onPress={() => setTab(key)}
            >
              <FontAwesome name={icon} size={14} color={tab === key ? '#000' : Colors.text.secondary} />
              <Text className={tab === key ? 'text-black font-bold' : 'text-text-secondary'}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand.DEFAULT} className="mt-8" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerClassName="px-4 pb-8"
          renderItem={({ item, index }) =>
            tab === 'clans'
              ? <ClanRow item={item} index={index} />
              : <PlayerRow item={item} index={index} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <FontAwesome name="trophy" size={32} color={Colors.text.muted} />
              <Text className="text-text-muted text-lg mt-3">
                {tab === 'clans' ? 'No clans yet' : 'No ranked players yet'}
              </Text>
              {tab === 'players' && (
                <Text className="text-text-muted text-sm mt-1 text-center px-8">
                  Complete your biodata and log 10 workouts to appear here
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
