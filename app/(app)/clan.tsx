import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank } from '@/constants/theme';
import {
  useMyClan,
  useSearchClans,
  useClanRoster,
  useCreateClan,
  useJoinClan,
  useLeaveClan,
  useActiveWar,
  useWarContributions,
  useWarHistory,
  useMyClanChallenges,
  useRespondToChallenge,
} from '@/hooks/use-clan';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import type { Rank as RankType, ClanRole } from '@/types';

type ClanView = 'my-clan' | 'search' | 'create';

const ROLE_LABELS: Record<ClanRole, string> = {
  leader: 'Leader',
  officer: 'Officer',
  member: 'Member',
};

function MemberRow({
  userId,
  displayName,
  rank,
  level,
  role,
  onPress,
}: {
  userId: string;
  displayName: string;
  rank: RankType;
  level: number;
  role: ClanRole;
  onPress?: () => void;
}) {
  const rankConfig = Rank[rank] ?? Rank.rookie;

  return (
    <Pressable
      className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center active:opacity-80"
      onPress={onPress}
    >
      <View className="w-8 h-8 rounded-full bg-surface-overlay items-center justify-center">
        <FontAwesome name="user" size={14} color={Colors.text.secondary} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold">{displayName || 'Warrior'}</Text>
        <Text className="text-text-muted text-xs">
          Lv.{level} · <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text>
        </Text>
      </View>
      <Text className="text-white/50 text-xs mr-2">{ROLE_LABELS[role]}</Text>
      <FontAwesome name="chevron-right" size={10} color={Colors.text.muted} />
    </Pressable>
  );
}

// ─── My Clan View ────────────────────────────────────────

function getCountdownUrgency(ms: number): { color: string; pulse: boolean } {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 3) return { color: Colors.danger, pulse: true };
  if (hours < 12) return { color: Colors.danger, pulse: false };
  if (hours < 24) return { color: Colors.warning, pulse: false };
  return { color: Colors.text.muted, pulse: false };
}

function WarCountdown({ endedAt }: { readonly endedAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    return Math.max(0, new Date(endedAt).getTime() - Date.now());
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update every 30s for sub-12h precision
  useEffect(() => {
    if (remaining <= 0) return;
    const tick = remaining < 12 * 60 * 60 * 1000 ? 30_000 : 60_000;
    const interval = setInterval(() => {
      const next = Math.max(0, new Date(endedAt).getTime() - Date.now());
      setRemaining(next);
      if (next <= 0) clearInterval(interval);
    }, tick);
    return () => clearInterval(interval);
  }, [endedAt, remaining]);

  const urgency = getCountdownUrgency(remaining);

  // Pulsing animation for <3h
  useEffect(() => {
    if (urgency.pulse && remaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [urgency.pulse, remaining, pulseAnim]);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const hoursTotal = remaining / (1000 * 60 * 60);

  const timeLabel =
    remaining <= 0
      ? 'War ended'
      : hoursTotal < 12
        ? `${hours}h ${minutes}m remaining`
        : `${days}d ${hours}h remaining`;

  return (
    <Animated.View style={{ opacity: pulseAnim }} className="flex-row items-center justify-center mt-2 gap-1">
      {urgency.pulse && (
        <FontAwesome name="exclamation-circle" size={12} color={urgency.color} />
      )}
      <Text style={{ color: urgency.color }} className="text-xs text-center">
        {timeLabel}
      </Text>
    </Animated.View>
  );
}

const WAR_TYPE_LABELS: Record<string, string> = {
  mixed: 'Mixed',
  strength_only: 'Strength Only',
  cardio_only: 'Cardio Only',
};

function MyClanView({ clan, onLeave }: { clan: any; onLeave: () => void }) {
  const router = useRouter();
  const { data: roster, isLoading: rosterLoading } = useClanRoster(clan?.id);
  const { data: war } = useActiveWar();
  const myClanId = clan?.id;
  const { data: contributions } = useWarContributions(war?.id, myClanId);
  const { data: warHistory } = useWarHistory(myClanId);
  const { data: challenges } = useMyClanChallenges();
  const respondMutation = useRespondToChallenge();
  const leaveMutation = useLeaveClan();

  // Entrance animations
  const fadeHeader = useFadeSlide(0);
  const fadeWar = useFadeSlide(100);
  const fadeHistory = useFadeSlide(200);
  const fadeRoster = useFadeSlide(300);

  const incomingChallenges = (challenges ?? []).filter(
    (c: any) => c.target_clan_id === myClanId && c.status === 'pending'
  );

  function handleLeave() {
    Alert.alert('Leave Clan?', `Are you sure you want to leave ${clan.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveMutation.mutate(undefined, {
            onSuccess: onLeave,
            onError: (err: any) => Alert.alert('Error', err.message ?? 'Failed to leave clan'),
          });
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
      {/* Clan Header */}
      <Animated.View style={fadeHeader.style} className="items-center py-6">
        <Text className="text-4xl mb-2">⚔️</Text>
        <Text className="text-white text-2xl font-bold">{clan.name}</Text>
        <Text className="text-white font-bold text-lg">[{clan.tag}]</Text>
        {clan.description ? (
          <Text className="text-white/50 text-center mt-2 px-4">
            {clan.description}
          </Text>
        ) : null}
        <Text className="text-text-muted text-sm mt-2">
          {clan.member_count} / {clan.max_members} members · Your role: {ROLE_LABELS[clan.my_role as ClanRole]}
        </Text>
      </Animated.View>

      {/* Incoming Challenges */}
      <Animated.View style={fadeWar.style}>
      {incomingChallenges.length > 0 && (
        <View className="mb-4">
          <Text className="text-white text-lg font-bold mb-3">War Challenges</Text>
          {incomingChallenges.map((c: any) => (
            <View key={c.id} className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-2">
              <Text className="text-white font-bold mb-1">Challenge Received!</Text>
              <Text className="text-white/50 text-sm mb-3">
                Type: {WAR_TYPE_LABELS[c.war_type] ?? 'Mixed'}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className="flex-1 py-2 items-center active:opacity-70"
                  style={{ borderWidth: 1, borderColor: '#ffffff', borderRadius: 12 }}
                  onPress={() => respondMutation.mutate({ challengeId: c.id, accept: true })}
                  disabled={respondMutation.isPending}
                >
                  <Text className="text-white font-bold">Accept</Text>
                </Pressable>
                <Pressable
                  className="flex-1 border border-surface-border rounded-xl py-2 items-center active:bg-surface-raised"
                  onPress={() => respondMutation.mutate({ challengeId: c.id, accept: false })}
                  disabled={respondMutation.isPending}
                >
                  <Text className="text-white/50 font-bold">Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* War Status */}
      {war && (
        <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white font-bold text-lg">Active War — Week {war.week_number}</Text>
            {war.war_type && war.war_type !== 'mixed' && (
              <View className="bg-white/20 rounded-full px-2 py-0.5">
                <Text className="text-white text-xs font-bold">{WAR_TYPE_LABELS[war.war_type]}</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center justify-between">
            <View className="items-center flex-1">
              <Text className="text-white/50 text-xs">Your Clan</Text>
              <Text className="text-white text-2xl font-bold">
                {war.clan_a_id === myClanId
                  ? (war.clan_a_score?.total ?? 0)
                  : (war.clan_b_score?.total ?? 0)}
              </Text>
            </View>
            <Text className="text-text-muted text-xl mx-4">vs</Text>
            <View className="items-center flex-1">
              <Text className="text-white/50 text-xs">Opponent</Text>
              <Text className="text-danger text-2xl font-bold">
                {war.clan_a_id === myClanId
                  ? (war.clan_b_score?.total ?? 0)
                  : (war.clan_a_score?.total ?? 0)}
              </Text>
            </View>
          </View>

          {/* War countdown */}
          {war.ended_at && <WarCountdown endedAt={war.ended_at} />}

          {/* War Chat link */}
          <Pressable
            className="bg-white/5 border border-white/20 rounded-lg py-2 items-center mt-3 active:bg-white/10"
            onPress={() => router.push(`/(app)/war-chat/${war.id}` as any)}
          >
            <Text className="text-white font-bold text-sm">
              <FontAwesome name="comments" size={14} color={Colors.text.primary} />  War Chat
            </Text>
          </Pressable>

          {/* Top contributors */}
          {contributions && contributions.length > 0 && (
            <View className="mt-4 border-t border-surface-border pt-3">
              <Text className="text-white/50 text-xs uppercase mb-2">Top Contributors</Text>
              {contributions.slice(0, 5).map((c: any, i: number) => (
                <View key={c.user_id} className="flex-row justify-between py-1">
                  <Text className="text-white">
                    {i + 1}. {c.display_name || 'Warrior'}
                  </Text>
                  <Text className="text-white font-bold">
                    {Math.round(c.contribution_points)} pts ({c.workout_count} workouts)
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      </Animated.View>

      {/* War History */}
      <Animated.View style={fadeHistory.style}>
      {warHistory && warHistory.length > 0 && (
        <View className="mb-6">
          <Text className="text-white text-lg font-bold mb-3">War History</Text>
          <View className="gap-2">
            {warHistory.slice(0, 5).map((w: any) => {
              const isA = w.clan_a_id === myClanId;
              const myScore = isA ? w.clan_a_score?.total : w.clan_b_score?.total;
              const theirScore = isA ? w.clan_b_score?.total : w.clan_a_score?.total;
              const won = w.winner_clan_id === myClanId;
              const draw = w.winner_clan_id === null;

              return (
                <View
                  key={w.id}
                  className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center"
                >
                  <View className="flex-1">
                    <Text className="text-text-muted text-xs">Week {w.week_number}</Text>
                    <Text className="text-white font-bold">
                      {myScore ?? 0} – {theirScore ?? 0}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: draw
                        ? Colors.text.muted + '30'
                        : won
                        ? Colors.success + '30'
                        : Colors.danger + '30',
                    }}
                  >
                    <Text
                      className="font-bold text-xs"
                      style={{
                        color: draw ? Colors.text.muted : won ? Colors.success : Colors.danger,
                      }}
                    >
                      {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      </Animated.View>

      {/* Leaderboard Link */}
      <Animated.View style={fadeRoster.style}>
      <Pressable
        className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4 flex-row items-center active:opacity-80"
        onPress={() => router.push('/(app)/leaderboard' as any)}
      >
        <FontAwesome name="trophy" size={18} color={Colors.warning} />
        <Text className="text-white font-bold ml-3 flex-1">Clan Leaderboard</Text>
        <FontAwesome name="chevron-right" size={14} color={Colors.text.muted} />
      </Pressable>

      {/* Roster */}
      <Text className="text-white text-lg font-bold mb-3">Members</Text>
      {rosterLoading ? (
        <ActivityIndicator color={Colors.text.primary} />
      ) : (
        <View className="gap-2 mb-6">
          {(roster ?? []).map((m: any) => (
            <MemberRow
              key={m.user_id}
              userId={m.user_id}
              displayName={m.display_name}
              rank={m.rank}
              level={m.level}
              role={m.role}
              onPress={() => router.push(`/(app)/player/${m.user_id}` as any)}
            />
          ))}
        </View>
      )}

      {/* Leave */}
      <Pressable
        className="border border-danger rounded-xl py-3 items-center active:bg-danger/10"
        onPress={handleLeave}
        disabled={leaveMutation.isPending}
      >
        <Text className="text-danger font-bold">
          {leaveMutation.isPending ? 'Leaving...' : 'Leave Clan'}
        </Text>
      </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Search / Join View ──────────────────────────────────

function SearchView({ onJoined }: { onJoined: () => void }) {
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useSearchClans(query);
  const joinMutation = useJoinClan();

  function handleJoin(clanId: string, clanName: string) {
    Alert.alert('Join Clan?', `Join "${clanName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Join',
        onPress: () => {
          joinMutation.mutate(clanId, {
            onSuccess: onJoined,
            onError: (err: any) => Alert.alert('Error', err.message ?? 'Failed to join'),
          });
        },
      },
    ]);
  }

  return (
    <View className="flex-1 px-4">
      <TextInput
        className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base mb-4"
        placeholder="Search clans by name or tag..."
        placeholderTextColor={Colors.text.muted}
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.text.primary} />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <Pressable
              className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-2 flex-row items-center"
              onPress={() => handleJoin(item.id, item.name)}
            >
              <View className="flex-1">
                <Text className="text-white font-bold">{item.name}</Text>
                <Text className="text-white text-sm">[{item.tag}]</Text>
                <Text className="text-text-muted text-xs">
                  {item.member_count}/{item.max_members} members
                </Text>
              </View>
              <FontAwesome name="plus-circle" size={24} color={Colors.text.primary} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-text-muted text-center py-8">
              {query ? 'No clans found' : 'Search for a clan or create your own'}
            </Text>
          }
        />
      )}
    </View>
  );
}

// ─── Create Clan View ────────────────────────────────────

function generateClanTag(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    // Multi-word: use initials (e.g., "Iron Wolves" → "IW", "The Dark Knights" → "TDK")
    const initials = words.map(w => w[0]).join('').toUpperCase();
    // Pad to 3 chars minimum if needed
    if (initials.length < 3) {
      return (initials + words[words.length - 1].slice(1, 4 - initials.length + 1)).toUpperCase().slice(0, 6);
    }
    return initials.slice(0, 6);
  }

  // Single word: take first 3-4 chars uppercase
  return trimmed.slice(0, 4).toUpperCase();
}

function CreateView({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const autoTag = generateClanTag(name);
  const createMutation = useCreateClan();

  function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Enter a clan name');
      return;
    }
    if (!autoTag || autoTag.length < 2) {
      Alert.alert('Error', 'Clan name is too short to generate a tag');
      return;
    }

    createMutation.mutate(
      { name: name.trim(), tag: autoTag, description: description.trim() },
      {
        onSuccess: onCreated,
        onError: (err: any) => Alert.alert('Error', err.message ?? 'Failed to create clan'),
      }
    );
  }

  return (
    <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
      <View className="gap-4 mb-6">
        <View>
          <Text className="text-white/50 text-xs uppercase mb-1">Clan Name</Text>
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            placeholder="Iron Wolves"
            placeholderTextColor={Colors.text.muted}
            value={name}
            onChangeText={setName}
          />
          {autoTag && (
            <View className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 mt-2 mb-1">
              <Text className="text-text-muted text-xs uppercase mb-0.5">Auto-generated Tag</Text>
              <Text className="text-white font-bold text-lg">[{autoTag}]</Text>
            </View>
          )}
        </View>
        <View>
          <Text className="text-white/50 text-xs uppercase mb-1">Description (optional)</Text>
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            placeholder="We train hard and compete harder"
            placeholderTextColor={Colors.text.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <Pressable
        className="py-3.5 items-center active:opacity-70"
        style={{ borderWidth: 1, borderColor: '#ffffff' }}
        onPress={handleCreate}
        disabled={createMutation.isPending}
      >
        <Text className="text-white text-lg font-bold">
          {createMutation.isPending ? 'Creating...' : 'Create Clan'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main Clan Screen ────────────────────────────────────

export default function ClanScreen() {
  const { data: clan, isLoading, refetch } = useMyClan();
  const [view, setView] = useState<ClanView>('search');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={Colors.text.primary} size="large" />
      </SafeAreaView>
    );
  }

  // If user has a clan, show it
  if (clan) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <MyClanView clan={clan} onLeave={() => refetch()} />
      </SafeAreaView>
    );
  }

  // No clan — show search/create
  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Tab Switcher */}
      <View className="flex-row border-b border-surface-border">
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'search' ? 'border-b-2 border-white' : ''}`}
          onPress={() => setView('search')}
        >
          <Text className={view === 'search' ? 'text-white font-bold' : 'text-white/50'}>
            Find Clan
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'create' ? 'border-b-2 border-white' : ''}`}
          onPress={() => setView('create')}
        >
          <Text className={view === 'create' ? 'text-white font-bold' : 'text-white/50'}>
            Create Clan
          </Text>
        </Pressable>
      </View>

      {view === 'search' ? (
        <SearchView onJoined={() => refetch()} />
      ) : (
        <CreateView onCreated={() => refetch()} />
      )}
    </SafeAreaView>
  );
}
