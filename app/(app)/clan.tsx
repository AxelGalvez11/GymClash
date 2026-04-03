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
import ContributionBars from '@/components/ContributionBars';
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
  useSendChallenge,
} from '@/hooks/use-clan';
import WarInitiationModal from '@/components/WarInitiationModal';
import MemberActionSheet from '@/components/MemberActionSheet';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { useAuthStore } from '@/stores/auth-store';
import type { Rank as RankType, ClanRole } from '@/types';

type ClanView = 'my-clan' | 'search' | 'create';

const ROLE_LABELS: Record<ClanRole, string> = {
  leader: 'Leader',
  officer: 'Officer',
  member: 'Member',
};

const ROLE_COLORS: Record<ClanRole, string> = {
  leader: '#ffd709',
  officer: '#ce96ff',
  member: '#74738b',
};

function isActiveToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function MemberRow({
  userId,
  displayName,
  rank,
  level,
  role,
  lastWorkoutDate,
  trophyRating,
  onPress,
}: {
  userId: string;
  displayName: string;
  rank: RankType;
  level: number;
  role: ClanRole;
  lastWorkoutDate?: string | null;
  trophyRating?: number;
  onPress?: () => void;
}) {
  const rankConfig = Rank[rank] ?? Rank.rookie;

  return (
    <Pressable
      className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center active:scale-[0.98]"
      onPress={onPress}
    >
      <View className="w-8 h-8 rounded-full bg-[#23233f] items-center justify-center">
        <FontAwesome name="user" size={14} color="#aaa8c3" />
      </View>
      <View className="flex-1 ml-3">
        <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }} className="font-bold">{displayName || 'Warrior'}</Text>
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">
          Lv.{level} · <Text style={{ color: rankConfig.color }}>{rankConfig.label}</Text>
        </Text>
        <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold' }} className="text-xs">
          {trophyRating ?? 0} <FontAwesome name="trophy" size={8} color="#ffd709" />
        </Text>
      </View>
      <Text style={{ color: ROLE_COLORS[role], fontFamily: 'Lexend-SemiBold' }} className="text-xs mr-2">{ROLE_LABELS[role]}</Text>
      {/* Activity dot */}
      <View
        className="w-2 h-2 rounded-full mr-2"
        style={{
          backgroundColor: lastWorkoutDate && isActiveToday(lastWorkoutDate) ? '#22c55e' : '#74738b',
        }}
      />
      <FontAwesome name="chevron-right" size={10} color="#74738b" />
    </Pressable>
  );
}

// ─── My Clan View ────────────────────────────────────────

function getCountdownUrgency(ms: number): { color: string; pulse: boolean } {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 3) return { color: '#ff6e84', pulse: true };
  if (hours < 12) return { color: '#ff6e84', pulse: false };
  if (hours < 24) return { color: '#ffd709', pulse: false };
  return { color: '#74738b', pulse: false };
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
      <Text style={{ color: urgency.color, fontFamily: 'Lexend-SemiBold' }} className="text-xs text-center">
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
  const sendChallengeMutation = useSendChallenge();
  const [showWarModal, setShowWarModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; name: string; role: ClanRole } | null>(null);
  const currentUserId = useAuthStore((s) => s.user?.id);

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
        {clan.my_role === 'leader' && (
          <Pressable
            className="mt-1 active:scale-[0.98]"
            onPress={() => Alert.alert('Coming Soon', 'Custom clan emblems will be available in a future update.')}
          >
            <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
              Change Emblem
            </Text>
          </Pressable>
        )}
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-2xl font-bold">{clan.name}</Text>
        <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold' }} className="font-bold text-lg">[{clan.tag}]</Text>
        {clan.description ? (
          <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-center mt-2 px-4">
            {clan.description}
          </Text>
        ) : null}
        {clan.my_role === 'leader' && (
          <Pressable
            className="mt-2 active:scale-[0.98]"
            onPress={() => Alert.alert('Coming Soon', 'Clan description editing will be available in a future update.')}
          >
            <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
              <FontAwesome name="pencil" size={10} color="#ce96ff" /> Edit Description
            </Text>
          </Pressable>
        )}
        <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-sm mt-2">
          {clan.member_count} / {clan.max_members} members · Your role: {ROLE_LABELS[clan.my_role as ClanRole]}
        </Text>
        <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold' }} className="text-sm mt-1">
          <FontAwesome name="trophy" size={12} color="#ffd709" /> {roster ? roster.reduce((sum: number, m: any) => sum + (m.trophy_rating ?? 0), 0) : 0} Total Trophies
        </Text>
      </Animated.View>

      {/* Initiate War Button — leaders and officers only, when no active war */}
      {!war && (clan.my_role === 'leader' || clan.my_role === 'officer') && (
        <Pressable
          className="mx-0 mb-4 py-3 rounded-xl flex-row items-center justify-center gap-2 active:scale-[0.98]"
          style={{ backgroundColor: '#a434ff' }}
          onPress={() => setShowWarModal(true)}
        >
          <FontAwesome name="fire" size={16} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">
            INITIATE WAR
          </Text>
        </Pressable>
      )}

      {/* War Initiation Modal */}
      <WarInitiationModal
        visible={showWarModal}
        onClose={() => setShowWarModal(false)}
        sending={sendChallengeMutation.isPending}
        onSendChallenge={(warType, _durationDays) => {
          // TODO: Implement opponent search/matchmaking UI
          // For now, matchmaking is not yet available
          Alert.alert(
            'Matchmaking Coming Soon',
            'Automatic opponent matching will be available in a future update. For now, ask a rival clan leader to challenge you!',
            [{ text: 'OK', onPress: () => setShowWarModal(false) }]
          );
        }}
      />

      {/* Incoming Challenges */}
      <Animated.View style={fadeWar.style}>
      {incomingChallenges.length > 0 && (
        <View className="mb-4">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-lg font-bold mb-3">War Challenges</Text>
          {incomingChallenges.map((c: any) => (
            <View key={c.id} className="bg-[#ffd709]/10 rounded-xl p-4 mb-2">
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold mb-1">Challenge Received!</Text>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-sm mb-3">
                Type: {WAR_TYPE_LABELS[c.war_type] ?? 'Mixed'}
              </Text>
              <View className="flex-row gap-2">
                <Pressable
                  className="flex-1 py-2 items-center rounded-xl active:scale-[0.98]"
                  style={{ backgroundColor: '#a434ff' }}
                  onPress={() => respondMutation.mutate({ challengeId: c.id, accept: true })}
                  disabled={respondMutation.isPending}
                >
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">Accept</Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#23233f] rounded-xl py-2 items-center active:scale-[0.98]"
                  onPress={() => respondMutation.mutate({ challengeId: c.id, accept: false })}
                  disabled={respondMutation.isPending}
                >
                  <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="font-bold">Decline</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* War Status */}
      {war && (
        <View
          className="bg-[#1d1d37] rounded-xl p-4 mb-4"
          style={{
            shadowColor: '#a434ff',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold text-lg">Active War — Week {war.week_number}</Text>
            {war.war_type && war.war_type !== 'mixed' && (
              <View className="bg-[#23233f] rounded-full px-2 py-0.5">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="text-xs font-bold">{WAR_TYPE_LABELS[war.war_type]}</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center justify-between">
            <View className="items-center flex-1">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs">Your Clan</Text>
              <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }} className="text-2xl font-bold">
                {war.clan_a_id === myClanId
                  ? (war.clan_a_score?.total ?? 0)
                  : (war.clan_b_score?.total ?? 0)}
              </Text>
            </View>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xl mx-4">vs</Text>
            <View className="items-center flex-1">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs">Opponent</Text>
              <Text style={{ color: '#ff6e84', fontFamily: 'Lexend-SemiBold' }} className="text-2xl font-bold">
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
            className="bg-[#a434ff]/10 rounded-lg py-2 items-center mt-3 active:scale-[0.98]"
            onPress={() => router.push(`/(app)/war-chat/${war.id}` as any)}
          >
            <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold text-sm">
              <FontAwesome name="comments" size={14} color="#ce96ff" />  War Chat
            </Text>
          </Pressable>

          {/* Top contributors — visual bars */}
          {contributions && contributions.length > 0 && (
            <ContributionBars
              contributions={contributions ?? []}
              maxPoints={Math.max(...(contributions ?? []).map((c: any) => c.contribution_points), 1)}
              accentColor="#ce96ff"
            />
          )}
        </View>
      )}
      </Animated.View>

      {/* War History */}
      <Animated.View style={fadeHistory.style}>
      {warHistory && warHistory.length > 0 && (
        <View className="mb-6">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-lg font-bold mb-3">War History</Text>
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
                  className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center"
                >
                  <View className="flex-1">
                    <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs">Week {w.week_number}</Text>
                    <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">
                      {myScore ?? 0} – {theirScore ?? 0}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: draw
                        ? '#74738b' + '30'
                        : won
                        ? Colors.success + '30'
                        : '#ff6e84' + '30',
                    }}
                  >
                    <Text
                      className="font-bold text-xs"
                      style={{
                        color: draw ? '#74738b' : won ? Colors.success : '#ff6e84',
                        fontFamily: 'Lexend-SemiBold',
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

      {/* Clan Chat */}
      <Animated.View style={fadeRoster.style}>
      <Pressable
        className="bg-[#1d1d37] rounded-xl p-4 mb-3 flex-row items-center active:scale-[0.98]"
        onPress={() => Alert.alert('Coming Soon', 'Clan messaging will be available in a future update. During wars, use War Chat to coordinate with your clan.')}
      >
        <FontAwesome name="comments" size={18} color="#ce96ff" />
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold ml-3 flex-1">Clan Chat</Text>
        <View className="bg-[#23233f] rounded-full px-2 py-0.5">
          <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>SOON</Text>
        </View>
      </Pressable>

      {/* Leaderboard Link */}
      <Pressable
        className="bg-[#1d1d37] rounded-xl p-4 mb-4 flex-row items-center active:scale-[0.98]"
        onPress={() => router.push('/(app)/leaderboard' as any)}
      >
        <FontAwesome name="trophy" size={18} color="#ffd709" />
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold ml-3 flex-1">Clan Leaderboard</Text>
        <FontAwesome name="chevron-right" size={14} color="#74738b" />
      </Pressable>

      {/* Roster */}
      <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-lg font-bold mb-3">Members</Text>
      {rosterLoading ? (
        <ActivityIndicator color="#ce96ff" />
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
              lastWorkoutDate={m.last_workout_date}
              trophyRating={m.trophy_rating}
              onPress={() => setSelectedMember({ userId: m.user_id, name: m.display_name || 'Warrior', role: m.role })}
            />
          ))}
        </View>
      )}

      {/* Leave */}
      <Pressable
        className="rounded-xl py-3 items-center active:scale-[0.98]"
        style={{ borderWidth: 1, borderColor: '#ff6e84' }}
        onPress={handleLeave}
        disabled={leaveMutation.isPending}
      >
        <Text style={{ color: '#ff6e84', fontFamily: 'Lexend-SemiBold' }} className="font-bold">
          {leaveMutation.isPending ? 'Leaving...' : 'Leave Clan'}
        </Text>
      </Pressable>
      </Animated.View>

      {/* Member Action Sheet */}
      <MemberActionSheet
        visible={selectedMember !== null}
        memberName={selectedMember?.name ?? ''}
        memberRole={selectedMember?.role ?? 'member'}
        myRole={(selectedMember?.userId === currentUserId ? 'member' : clan.my_role) as ClanRole}
        onClose={() => setSelectedMember(null)}
        onViewProfile={() => {
          if (selectedMember) {
            router.push(`/(app)/player/${selectedMember.userId}` as any);
          }
          setSelectedMember(null);
        }}
        onPromote={() => {
          Alert.alert('Coming Soon', 'Role management will be available in a future update.');
          setSelectedMember(null);
        }}
        onDemote={() => {
          Alert.alert('Coming Soon', 'Role management will be available in a future update.');
          setSelectedMember(null);
        }}
        onKick={() => {
          Alert.alert('Coming Soon', 'Role management will be available in a future update.');
          setSelectedMember(null);
        }}
        actionPending={false}
      />
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
        className="bg-[#000000] rounded-xl px-4 py-3 text-base mb-4"
        style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
        placeholder="Search clans by name or tag..."
        placeholderTextColor="#74738b"
        value={query}
        onChangeText={setQuery}
      />
      {isLoading ? (
        <ActivityIndicator color="#ce96ff" />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <Pressable
              className="bg-[#1d1d37] rounded-xl p-4 mb-2 flex-row items-center active:scale-[0.98]"
              onPress={() => handleJoin(item.id, item.name)}
            >
              <View className="flex-1">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="font-bold">{item.name}</Text>
                <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold' }} className="text-sm">[{item.tag}]</Text>
                <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-xs">
                  {item.member_count}/{item.max_members} members
                </Text>
              </View>
              <FontAwesome name="plus-circle" size={24} color="#ce96ff" />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }} className="text-center py-8">
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
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }} className="text-xs uppercase mb-1">Clan Name</Text>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3 text-base"
            style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
            placeholder="Iron Wolves"
            placeholderTextColor="#74738b"
            value={name}
            onChangeText={setName}
          />
          {autoTag && (
            <View className="bg-[#1d1d37] rounded-lg px-3 py-2 mt-2 mb-1">
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }} className="text-xs uppercase mb-0.5">Auto-generated Tag</Text>
              <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold' }} className="font-bold text-lg">[{autoTag}]</Text>
            </View>
          )}
        </View>
        <View>
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }} className="text-xs uppercase mb-1">Description (optional)</Text>
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-3 text-base"
            style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
            placeholder="We train hard and compete harder"
            placeholderTextColor="#74738b"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
      </View>

      <Pressable
        className="py-3.5 items-center rounded-xl active:scale-[0.98]"
        style={{ backgroundColor: '#a434ff' }}
        onPress={handleCreate}
        disabled={createMutation.isPending}
      >
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }} className="text-lg font-bold">
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
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  // If user has a clan, show it
  if (clan) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
        <MyClanView clan={clan} onLeave={() => refetch()} />
      </SafeAreaView>
    );
  }

  // No clan — show search/create
  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      {/* Tab Switcher */}
      <View className="flex-row">
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'search' ? 'bg-[#ce96ff]' : 'bg-[#23233f]'}`}
          onPress={() => setView('search')}
        >
          <Text
            style={{ fontFamily: 'Lexend-SemiBold' }}
            className={view === 'search' ? 'text-black font-bold' : 'text-[#aaa8c3]'}
          >
            Find Clan
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-3 items-center ${view === 'create' ? 'bg-[#ce96ff]' : 'bg-[#23233f]'}`}
          onPress={() => setView('create')}
        >
          <Text
            style={{ fontFamily: 'Lexend-SemiBold' }}
            className={view === 'create' ? 'text-black font-bold' : 'text-[#aaa8c3]'}
          >
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
