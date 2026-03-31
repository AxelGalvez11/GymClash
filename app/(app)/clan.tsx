import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from '@/hooks/use-clan';
import type { Rank as RankType, ClanRole } from '@/types';

type ClanView = 'my-clan' | 'search' | 'create';

const ROLE_LABELS: Record<ClanRole, string> = {
  leader: 'Leader',
  officer: 'Officer',
  member: 'Member',
};

function MemberRow({
  displayName,
  rank,
  level,
  role,
}: {
  displayName: string;
  rank: RankType;
  level: number;
  role: ClanRole;
}) {
  const rankConfig = Rank[rank] ?? Rank.bronze;

  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center">
      <View className="w-8 h-8 rounded-full bg-surface-overlay items-center justify-center">
        <FontAwesome name="user" size={14} color={Colors.text.secondary} />
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-white font-bold">{displayName || 'Warrior'}</Text>
        <Text className="text-text-muted text-xs">
          Lv.{level} · <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text>
        </Text>
      </View>
      <Text className="text-text-secondary text-xs">{ROLE_LABELS[role]}</Text>
    </View>
  );
}

// ─── My Clan View ────────────────────────────────────────

function MyClanView({ clan, onLeave }: { clan: any; onLeave: () => void }) {
  const { data: roster, isLoading: rosterLoading } = useClanRoster(clan?.id);
  const { data: war } = useActiveWar();
  const myClanId = clan?.id;
  const { data: contributions } = useWarContributions(war?.id, myClanId);
  const { data: warHistory } = useWarHistory(myClanId);
  const leaveMutation = useLeaveClan();

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
      <View className="items-center py-6">
        <Text className="text-4xl mb-2">⚔️</Text>
        <Text className="text-white text-2xl font-bold">{clan.name}</Text>
        <Text className="text-brand font-bold text-lg">[{clan.tag}]</Text>
        {clan.description ? (
          <Text className="text-text-secondary text-center mt-2 px-4">
            {clan.description}
          </Text>
        ) : null}
        <Text className="text-text-muted text-sm mt-2">
          {clan.member_count} / {clan.max_members} members · Your role: {ROLE_LABELS[clan.my_role as ClanRole]}
        </Text>
      </View>

      {/* War Status */}
      {war && (
        <View className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-4">
          <Text className="text-white font-bold text-lg mb-2">Active War — Week {war.week_number}</Text>
          <View className="flex-row items-center justify-between">
            <View className="items-center flex-1">
              <Text className="text-text-secondary text-xs">Your Clan</Text>
              <Text className="text-brand text-2xl font-bold">
                {war.clan_a_id === myClanId
                  ? (war.clan_a_score?.total ?? 0)
                  : (war.clan_b_score?.total ?? 0)}
              </Text>
            </View>
            <Text className="text-text-muted text-xl mx-4">vs</Text>
            <View className="items-center flex-1">
              <Text className="text-text-secondary text-xs">Opponent</Text>
              <Text className="text-danger text-2xl font-bold">
                {war.clan_a_id === myClanId
                  ? (war.clan_b_score?.total ?? 0)
                  : (war.clan_a_score?.total ?? 0)}
              </Text>
            </View>
          </View>

          {/* Top contributors */}
          {contributions && contributions.length > 0 && (
            <View className="mt-4 border-t border-surface-border pt-3">
              <Text className="text-text-secondary text-xs uppercase mb-2">Top Contributors</Text>
              {contributions.slice(0, 5).map((c: any, i: number) => (
                <View key={c.user_id} className="flex-row justify-between py-1">
                  <Text className="text-white">
                    {i + 1}. {c.display_name || 'Warrior'}
                  </Text>
                  <Text className="text-brand font-bold">
                    {Math.round(c.contribution_points)} pts ({c.workout_count} workouts)
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* War History */}
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

      {/* Roster */}
      <Text className="text-white text-lg font-bold mb-3">Members</Text>
      {rosterLoading ? (
        <ActivityIndicator color={Colors.brand.DEFAULT} />
      ) : (
        <View className="gap-2 mb-6">
          {(roster ?? []).map((m: any) => (
            <MemberRow
              key={m.user_id}
              displayName={m.display_name}
              rank={m.rank}
              level={m.level}
              role={m.role}
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
        placeholderTextColor="#6A6A8A"
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? (
        <ActivityIndicator color={Colors.brand.DEFAULT} />
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
                <Text className="text-brand text-sm">[{item.tag}]</Text>
                <Text className="text-text-muted text-xs">
                  {item.member_count}/{item.max_members} members
                </Text>
              </View>
              <FontAwesome name="plus-circle" size={24} color={Colors.brand.DEFAULT} />
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

function CreateView({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateClan();

  function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Error', 'Enter a clan name');
      return;
    }
    if (tag.length < 3 || tag.length > 6 || !/^[A-Za-z0-9]+$/.test(tag)) {
      Alert.alert('Error', 'Tag must be 3-6 alphanumeric characters');
      return;
    }

    createMutation.mutate(
      { name: name.trim(), tag: tag.toUpperCase(), description: description.trim() },
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
          <Text className="text-text-secondary text-xs uppercase mb-1">Clan Name</Text>
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            placeholder="Iron Wolves"
            placeholderTextColor="#6A6A8A"
            value={name}
            onChangeText={setName}
          />
        </View>
        <View>
          <Text className="text-text-secondary text-xs uppercase mb-1">Tag (3-6 characters)</Text>
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base uppercase"
            placeholder="WOLVES"
            placeholderTextColor="#6A6A8A"
            value={tag}
            onChangeText={(t) => setTag(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            autoCapitalize="characters"
          />
        </View>
        <View>
          <Text className="text-text-secondary text-xs uppercase mb-1">Description (optional)</Text>
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white text-base"
            placeholder="We train hard and compete harder"
            placeholderTextColor="#6A6A8A"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <Pressable
        className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
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
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color={Colors.brand.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  // If user has a clan, show it
  if (clan) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <MyClanView clan={clan} onLeave={() => refetch()} />
      </SafeAreaView>
    );
  }

  // No clan — show search/create
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Tab Switcher */}
      <View className="flex-row border-b border-surface-border">
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'search' ? 'border-b-2 border-brand' : ''}`}
          onPress={() => setView('search')}
        >
          <Text className={view === 'search' ? 'text-brand font-bold' : 'text-text-secondary'}>
            Find Clan
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'create' ? 'border-b-2 border-brand' : ''}`}
          onPress={() => setView('create')}
        >
          <Text className={view === 'create' ? 'text-brand font-bold' : 'text-text-secondary'}>
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
