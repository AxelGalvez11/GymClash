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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Reanimated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors, Rank } from '@/constants/theme';
import { ClanEmblem } from '@/components/ClanEmblem';
import { BiColorBar } from '@/components/BiColorBar';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Card } from '@/components/ui/Card';
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
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useEntrance } from '@/hooks/use-entrance';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { usePressScale } from '@/hooks/use-press-scale';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/services/supabase';
import {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import type { Rank as RankType, ClanRole } from '@/types';

// ─── Constants ────────────────────────────────────────────

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

// Role badge background — diluted version of role color
const ROLE_BG: Record<ClanRole, string> = {
  leader: 'rgba(255,215,9,0.15)',
  officer: 'rgba(206,150,255,0.15)',
  member: 'rgba(116,115,139,0.15)',
};

const WAR_TYPE_LABELS: Record<string, string> = {
  mixed: 'Mixed',
  strength_only: 'Strength Only',
  cardio_only: 'Cardio Only',
};

// ─── Heavy press spring ───────────────────────────────────

const HEAVY_PRESS_SPRING = { damping: 18, stiffness: 260, mass: 1.0 } as const;
const HEAVY_RELEASE_SPRING = { damping: 16, stiffness: 180, mass: 0.9 } as const;

function usePressScaleHeavy(targetScale = 0.95) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const onPressIn = () => { scale.value = withSpring(targetScale, HEAVY_PRESS_SPRING); };
  const onPressOut = () => { scale.value = withSpring(1, HEAVY_RELEASE_SPRING); };
  return { animatedStyle, onPressIn, onPressOut } as const;
}

// ─── Helpers ─────────────────────────────────────────────

function isActiveToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function getCountdownUrgency(ms: number): { color: string; pulse: boolean } {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 3) return { color: '#ff6e84', pulse: true };
  if (hours < 12) return { color: '#ff6e84', pulse: false };
  if (hours < 24) return { color: '#ffd709', pulse: false };
  return { color: '#74738b', pulse: false };
}

// ─── War Countdown ────────────────────────────────────────

function WarCountdown({ endedAt }: { readonly endedAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const time = new Date(endedAt).getTime();
    return isNaN(time) ? 0 : Math.max(0, time - Date.now());
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    if (urgency.pulse && remaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
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
        ? `${hours}h ${minutes}m`
        : `${days}d ${hours}h`;

  return (
    <Animated.View style={{ opacity: pulseAnim }} className="flex-row items-center justify-center gap-1">
      {urgency.pulse && <FontAwesome name="exclamation-circle" size={10} color={urgency.color} />}
      <Text style={{ color: urgency.color, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
        {timeLabel} remaining
      </Text>
    </Animated.View>
  );
}

// ─── Member Row ───────────────────────────────────────────

function MemberRow({
  userId,
  displayName,
  rank,
  level,
  role,
  lastWorkoutDate,
  trophyRating,
  onPress,
  index,
}: {
  userId: string;
  displayName: string;
  rank: RankType;
  level: number;
  role: ClanRole;
  lastWorkoutDate?: string | null;
  trophyRating?: number;
  onPress?: () => void;
  index: number;
}) {
  const rankConfig = Rank[rank] ?? Rank.rookie;
  const { animatedStyle: entranceStyle } = useStaggerEntrance(index, 60, 260, 16);
  const { animatedStyle: scaleStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const isLive = lastWorkoutDate ? isActiveToday(lastWorkoutDate) : false;

  return (
    <Reanimated.View style={entranceStyle}>
      <Reanimated.View style={scaleStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1d1d37',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: 'rgba(206,150,255,0.1)',
            marginBottom: 8,
          }}
        >
          {/* Avatar circle with online dot */}
          <View style={{ position: 'relative', marginRight: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#23233f',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: isLive ? '#22c55e' : 'rgba(116,115,139,0.3)',
              }}
            >
              <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 16 }}>
                {(displayName || 'W').charAt(0).toUpperCase()}
              </Text>
            </View>
            {/* Online dot */}
            <View
              style={{
                position: 'absolute',
                bottom: -1,
                right: -1,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: isLive ? '#22c55e' : '#74738b',
                borderWidth: 2,
                borderColor: '#0c0c1f',
              }}
            />
          </View>

          {/* Name + role */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Medium', fontSize: 14, marginBottom: 2 }}>
              {displayName || 'Warrior'}
            </Text>
            <Text style={{ color: rankConfig.color, fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase' }}>
              Lv.{level} · {rankConfig.label}
            </Text>
          </View>

          {/* Trophy count */}
          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold', fontSize: 12, marginBottom: 4 }}>
              {trophyRating ?? 0} <FontAwesome name="trophy" size={9} color="#ffd709" />
            </Text>
            {/* Role badge */}
            <View style={{ backgroundColor: ROLE_BG[role], borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: ROLE_COLORS[role], fontFamily: 'Lexend-SemiBold', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isLive ? 'Live' : ROLE_LABELS[role]}
              </Text>
            </View>
          </View>

          <FontAwesome name="chevron-right" size={10} color="#46465c" />
        </Pressable>
      </Reanimated.View>
    </Reanimated.View>
  );
}

// ─── My Clan View ─────────────────────────────────────────

function MyClanView({ clan, onLeave }: { clan: any; onLeave: () => void }) {
  const router = useRouter();
  const { data: roster, isLoading: rosterLoading } = useClanRoster(clan?.id);
  const { data: war, isLoading: warLoading } = useActiveWar();
  const myClanId = clan?.id;
  const { data: contributions } = useWarContributions(war?.id, myClanId);
  const { data: warHistory } = useWarHistory(myClanId);
  const { data: challenges } = useMyClanChallenges();
  const respondMutation = useRespondToChallenge();
  const leaveMutation = useLeaveClan();
  const sendChallengeMutation = useSendChallenge();
  const [showWarModal, setShowWarModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; name: string; role: ClanRole } | null>(null);
  const [showEditDesc, setShowEditDesc] = useState(false);
  const [editDescText, setEditDescText] = useState(clan.description ?? '');
  const [showWarInfo, setShowWarInfo] = useState(false);
  const [showWarHistoryModal, setShowWarHistoryModal] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Cascade entrance animations
  const nameEntrance = useEntrance(0, 'fade-slide', 280);
  const warEntrance = useEntrance(80, 'fade-slide', 280);
  const cardsEntrance = useEntrance(160, 'fade-slide', 280);
  const membersEntrance = useEntrance(240, 'fade-slide', 280);

  // Glow pulses
  const warBtnPress = usePressScale(0.95);
  const warBtnGlow = useGlowPulse('#ffd709', 0.2, 0.55, 2000);
  const chatCardPress = usePressScale(0.97);
  const { animatedStyle: chatCardEntrance } = useStaggerEntrance(0, 60, 260);
  const clanChatCardPress = usePressScale(0.97);
  const { animatedStyle: clanChatCardEntrance } = useStaggerEntrance(1, 60, 260);
  const lbCardPress = usePressScale(0.97);
  const { animatedStyle: lbCardEntrance } = useStaggerEntrance(2, 60, 260);
  const leavePress = usePressScaleHeavy(0.95);

  const scrollRef = useRef<ScrollView>(null);

  const incomingChallenges = (challenges ?? []).filter(
    (c: any) => c.target_clan_id === myClanId && c.status === 'pending'
  );

  // Compute total clan trophies
  const totalTrophies = roster ? roster.reduce((sum: number, m: any) => sum + (m.trophy_rating ?? 0), 0) : 0;

  // War score data
  const hasActiveWar = !warLoading && war && war.status === 'active';
  const myClanIsA = hasActiveWar && war.clan_a_id === clan.id;
  const myWarScore = hasActiveWar
    ? (myClanIsA ? war.clan_a_score?.total : war.clan_b_score?.total) ?? 0
    : 0;
  const theirWarScore = hasActiveWar
    ? (myClanIsA ? war.clan_b_score?.total : war.clan_a_score?.total) ?? 0
    : 0;
  const warTotalScore = myWarScore + theirWarScore;
  const myWarPercent = warTotalScore === 0 ? 50 : (myWarScore / warTotalScore) * 100;
  const opponentName = hasActiveWar ? (war.opponent_clan?.name ?? 'Opponent') : 'Rival Clan';

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Clan vs Clan Header ─────────────────────────────── */}
      <Reanimated.View style={nameEntrance.animatedStyle}>
        {hasActiveWar ? (
          /* Top bar: your clan | enemy clan */
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <View>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#81ecff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>
                Your Clan
              </Text>
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 20, color: '#e5e3ff', fontStyle: 'italic' }} numberOfLines={1}>
                {clan.name?.toUpperCase()}
              </Text>
            </View>

            {/* Center info button */}
            <Pressable
              onPress={() => setShowWarInfo(true)}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#23233f', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.2)' }}
            >
              <FontAwesome name="question" size={13} color="#ce96ff" />
            </Pressable>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#ff6e84', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>
                Enemy Clan
              </Text>
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 20, color: '#e5e3ff', fontStyle: 'italic' }} numberOfLines={1}>
                {opponentName.toUpperCase()}
              </Text>
            </View>
          </View>
        ) : (
          /* No war — centered clan name only */
          <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, color: '#81ecff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>
              Your Clan
            </Text>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 24, color: '#e5e3ff', fontStyle: 'italic', textAlign: 'center' }} numberOfLines={1}>
              {clan.name?.toUpperCase()}
            </Text>
          </View>
        )}

        {/* ── Tug-of-War Bar ──────────────────────────────────── */}
        <Reanimated.View style={warEntrance.animatedStyle}>
          <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
            {hasActiveWar ? (
              <Pressable
                onPress={() => router.push(`/(app)/war-details/${war.id}` as any)}
                style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(206,150,255,0.15)' }}
              >
                {/* Score bar */}
                <View style={{ height: 56, flexDirection: 'row', backgroundColor: '#17172f' }}>
                  {/* My clan side */}
                  <LinearGradient
                    colors={['#7a1fd6', '#ce96ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ width: `${myWarPercent}%` as any, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 14 }}
                  >
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 18, color: '#000', fontWeight: '900' }}>
                      {myWarScore.toLocaleString()}
                    </Text>
                  </LinearGradient>

                  {/* Sword divider */}
                  <View style={{ position: 'absolute', left: `${myWarPercent}%` as any, top: 0, bottom: 0, width: 2, backgroundColor: '#ffd709', zIndex: 10, shadowColor: '#ffd709', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
                    <View style={{ position: 'absolute', top: '50%', left: -13, width: 26, height: 26, borderRadius: 13, backgroundColor: '#17172f', borderWidth: 2, borderColor: '#ffd709', alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -13 }] }}>
                      <FontAwesome name="shield" size={11} color="#ffd709" />
                    </View>
                  </View>

                  {/* Enemy side */}
                  <LinearGradient
                    colors={['#ff6e84', '#a70138']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1, justifyContent: 'center', paddingLeft: 14 }}
                  >
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 18, color: '#ffb2b9', fontWeight: '900' }}>
                      {theirWarScore.toLocaleString()}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Time remaining pill */}
                <View style={{ alignItems: 'center', backgroundColor: '#0c0c1f', paddingVertical: 6 }}>
                  {war.ended_at ? (
                    <WarCountdown endedAt={war.ended_at} />
                  ) : (
                    <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: '#74738b', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      WAR IN PROGRESS
                    </Text>
                  )}
                </View>
              </Pressable>
            ) : (
              /* No active war state */
              <View style={{ borderRadius: 16, backgroundColor: '#17172f', borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)', padding: 16, alignItems: 'center' }}>
                <FontAwesome name="shield" size={24} color="#46465c" style={{ marginBottom: 8 }} />
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#74738b', textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center' }}>
                  {clan.my_role === 'member' ? 'No active war · Ask your leader' : 'No active war · Initiate below'}
                </Text>
              </View>
            )}
          </View>

          {/* Trophy count row */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,9,0.08)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,215,9,0.2)' }}>
              <FontAwesome name="trophy" size={13} color="#ffd709" />
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 14, color: '#ffd709' }}>
                {totalTrophies.toLocaleString()}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(129,236,255,0.08)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(129,236,255,0.2)' }}>
              <FontAwesome name="users" size={12} color="#81ecff" />
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: '#81ecff' }}>
                {clan.member_count}/{clan.max_members}
              </Text>
            </View>
          </View>
        </Reanimated.View>
      </Reanimated.View>

      {/* ── Content padding wrapper ──────────────────────────── */}
      <View style={{ paddingHorizontal: 16 }}>

        {/* ── Incoming Challenges ────────────────────────────── */}
        {incomingChallenges.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            {incomingChallenges.map((c: any) => (
              <View key={c.id} style={{ backgroundColor: 'rgba(255,215,9,0.06)', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,215,9,0.25)' }}>
                <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 14, marginBottom: 4 }}>
                  ⚔️ War Challenge Received!
                </Text>
                <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, marginBottom: 12 }}>
                  Type: {WAR_TYPE_LABELS[c.war_type] ?? 'Mixed'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={{ flex: 1, backgroundColor: '#a434ff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
                    onPress={() => respondMutation.mutate({ challengeId: c.id, accept: true })}
                    disabled={respondMutation.isPending}
                  >
                    <Text style={{ color: '#fff', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Accept</Text>
                  </Pressable>
                  <Pressable
                    style={{ flex: 1, backgroundColor: '#23233f', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(116,115,139,0.3)' }}
                    onPress={() => respondMutation.mutate({ challengeId: c.id, accept: false })}
                    disabled={respondMutation.isPending}
                  >
                    <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Initiate War Button ────────────────────────────── */}
        {!warLoading && (clan.my_role === 'leader' || clan.my_role === 'officer') && (
          <Reanimated.View style={[{ marginBottom: 20 }]}>
            <Reanimated.View style={[warBtnGlow.glowStyle, { borderRadius: 16 }]}>
              <Reanimated.View style={warBtnPress.animatedStyle}>
                <Pressable
                  style={{ borderRadius: 14, overflow: 'hidden' }}
                  onPress={() => setShowWarModal(true)}
                  onPressIn={warBtnPress.onPressIn}
                  onPressOut={warBtnPress.onPressOut}
                >
                  <LinearGradient
                    colors={['#ce96ff', '#a434ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24 }}
                  >
                    <FontAwesome name="fire" size={16} color="#fff" />
                    <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 15, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 }}>
                      Initiate Clan War
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Reanimated.View>
            </Reanimated.View>
          </Reanimated.View>
        )}

        {/* ── Clan Roster Section ────────────────────────────── */}
        <Reanimated.View style={membersEntrance.animatedStyle}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: '#ce96ff' }} />
            <FontAwesome name="users" size={14} color="#ce96ff" />
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff', textTransform: 'uppercase', letterSpacing: 1.5, flex: 1 }}>
              Clan Roster
            </Text>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#74738b' }}>
              {roster?.length ?? 0} members
            </Text>
          </View>

          {rosterLoading ? (
            <ActivityIndicator color="#ce96ff" style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ marginBottom: 8 }}>
              {(roster ?? []).map((m: any, idx: number) => (
                <MemberRow
                  key={m.user_id}
                  userId={m.user_id}
                  displayName={m.display_name}
                  rank={m.rank}
                  level={m.level}
                  role={m.role}
                  lastWorkoutDate={m.last_workout_date}
                  trophyRating={m.trophy_rating}
                  index={idx}
                  onPress={() => setSelectedMember({ userId: m.user_id, name: m.display_name || 'Warrior', role: m.role })}
                />
              ))}
            </View>
          )}

          {/* Report button */}
          <Pressable
            style={{ borderRadius: 10, borderWidth: 1, borderColor: 'rgba(116,115,139,0.2)', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, marginBottom: 20 }}
            onPress={() => Alert.alert('Report', 'Unfair play reporting coming soon.')}
          >
            <FontAwesome name="flag" size={11} color="#74738b" />
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#74738b', textTransform: 'uppercase', letterSpacing: 1 }}>
              Report for Unfair Play
            </Text>
          </Pressable>
        </Reanimated.View>

        {/* ── Global Rankings Section ─────────────────────────── */}
        <Reanimated.View style={cardsEntrance.animatedStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: '#81ecff' }} />
            <FontAwesome name="globe" size={14} color="#81ecff" />
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Global Rankings
            </Text>
          </View>

          <Card variant="default" accentBorder="#81ecff" style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 16, color: '#ffd709' }}>#12 National</Text>
              <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#74738b' }}>Top 0.5%</Text>
            </View>
          </Card>
          <Card variant="default" style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 16, color: '#81ecff' }}>#3 Local</Text>
              <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: '#74738b' }}>City ranking</Text>
            </View>
          </Card>
        </Reanimated.View>

        {/* ── Navigation Links: Chat / Leaderboard ──────────── */}
        <Reanimated.View style={[cardsEntrance.animatedStyle, chatCardEntrance]}>
          <Reanimated.View style={chatCardPress.animatedStyle}>
            <Pressable
              style={{ backgroundColor: '#1d1d37', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.2)' }}
              onPress={() => {
                if (hasActiveWar) {
                  router.push(`/(app)/war-chat/${war.id}` as any);
                } else {
                  Alert.alert('War Chat', 'Start an active war to access the war chat channel.');
                }
              }}
              onPressIn={chatCardPress.onPressIn}
              onPressOut={chatCardPress.onPressOut}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(206,150,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <FontAwesome name="comments" size={16} color="#ce96ff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff' }}>War Chat</Text>
                <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: '#74738b', marginTop: 1 }}>
                  {hasActiveWar ? `Channel #001 · vs ${opponentName}` : 'Active during war'}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={11} color="#46465c" />
            </Pressable>
          </Reanimated.View>
        </Reanimated.View>

        <Reanimated.View style={[cardsEntrance.animatedStyle, clanChatCardEntrance]}>
          <Reanimated.View style={clanChatCardPress.animatedStyle}>
            <Pressable
              style={{ backgroundColor: '#1d1d37', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(129,236,255,0.2)' }}
              onPress={() => router.push(`/(app)/clan-chat/${clan.id}` as any)}
              onPressIn={clanChatCardPress.onPressIn}
              onPressOut={clanChatCardPress.onPressOut}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(129,236,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <FontAwesome name="comments" size={16} color="#81ecff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff' }}>Clan Chat</Text>
                <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: '#74738b', marginTop: 1 }}>
                  Chat with your clanmates
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={11} color="#46465c" />
            </Pressable>
          </Reanimated.View>
        </Reanimated.View>

        <Reanimated.View style={[cardsEntrance.animatedStyle, lbCardEntrance]}>
          <Reanimated.View style={lbCardPress.animatedStyle}>
            <Pressable
              style={{ backgroundColor: '#1d1d37', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,9,0.15)' }}
              onPress={() => router.push('/(app)/leaderboard' as any)}
              onPressIn={lbCardPress.onPressIn}
              onPressOut={lbCardPress.onPressOut}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,215,9,0.08)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <FontAwesome name="trophy" size={16} color="#ffd709" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff' }}>Clan Leaderboards</Text>
                <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 11, color: '#74738b', marginTop: 1 }}>
                  Clan rankings &amp; stats
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,215,9,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 }}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: '#ffd709' }}>#101</Text>
              </View>
              <FontAwesome name="chevron-right" size={11} color="#46465c" />
            </Pressable>
          </Reanimated.View>
        </Reanimated.View>

        {/* ── War History (inline preview) ───────────────────── */}
        {warHistory && warHistory.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: '#74738b' }} />
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 14, color: '#e5e3ff', textTransform: 'uppercase', letterSpacing: 1.5, flex: 1 }}>
                War History
              </Text>
              <Pressable onPress={() => setShowWarHistoryModal(true)}>
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: '#ce96ff' }}>See All</Text>
              </Pressable>
            </View>
            <View style={{ gap: 6 }}>
              {warHistory.slice(0, 3).map((w: any) => {
                const isA = w.clan_a_id === myClanId;
                const myScore = (isA ? w.clan_a_score?.total : w.clan_b_score?.total) ?? 0;
                const theirScore = (isA ? w.clan_b_score?.total : w.clan_a_score?.total) ?? 0;
                const opponentNameHistory = isA ? w.clan_b_name : w.clan_a_name;
                const won = w.winner_clan_id === myClanId;
                const draw = w.winner_clan_id === null;
                return (
                  <View
                    key={w.id}
                    style={{ backgroundColor: '#1d1d37', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.08)' }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 3, textTransform: 'uppercase' }}>
                        Week {w.week_number} · vs {opponentNameHistory || 'Opponent'}
                      </Text>
                      <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 15 }}>
                        {myScore} – {theirScore}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: draw ? 'rgba(116,115,139,0.2)' : won ? 'rgba(34,197,94,0.15)' : 'rgba(255,110,132,0.15)' }}>
                      <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: draw ? '#74738b' : won ? '#22c55e' : '#ff6e84' }}>
                        {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Clan description ───────────────────────────────── */}
        {clan.description ? (
          <View style={{ backgroundColor: 'rgba(206,150,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
              {clan.description}
            </Text>
            {clan.my_role === 'leader' && (
              <Pressable onPress={() => setShowEditDesc(true)} style={{ alignSelf: 'center', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="pencil" size={10} color="#ce96ff" />
                <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>Edit</Text>
              </Pressable>
            )}
          </View>
        ) : (
          clan.my_role === 'leader' && (
            <Pressable onPress={() => setShowEditDesc(true)} style={{ marginBottom: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(206,150,255,0.15)', borderStyle: 'dashed', padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                + Add Clan Description
              </Text>
            </Pressable>
          )
        )}

        {/* ── Leave Clan ─────────────────────────────────────── */}
        <Reanimated.View style={[leavePress.animatedStyle, { marginBottom: 8 }]}>
          <Pressable
            style={{ borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,110,132,0.35)' }}
            onPress={() => setShowLeaveConfirm(true)}
            onPressIn={leavePress.onPressIn}
            onPressOut={leavePress.onPressOut}
            disabled={leaveMutation.isPending}
          >
            <Text style={{ color: '#ff6e84', fontFamily: 'Lexend-SemiBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
              {leaveMutation.isPending ? 'Leaving...' : 'Leave Clan'}
            </Text>
          </Pressable>
        </Reanimated.View>
      </View>

      {/* ──────────────── MODALS ──────────────────────────── */}

      {/* Edit Description Modal */}
      <Modal visible={showEditDesc} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.9)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#1d1d37', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 18 }}>Edit Description</Text>
                <Pressable onPress={() => setShowEditDesc(false)}>
                  <FontAwesome name="times" size={18} color="#74738b" />
                </Pressable>
              </View>
              <TextInput
                style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 }}
                placeholder="Describe your clan..."
                placeholderTextColor="#74738b"
                value={editDescText}
                onChangeText={setEditDescText}
                multiline
                maxLength={200}
              />
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11, textAlign: 'right', marginBottom: 16 }}>
                {editDescText.length}/200
              </Text>
              <Pressable
                style={{ backgroundColor: '#a434ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={async () => {
                  try {
                    const { error } = await supabase
                      .from('clans')
                      .update({ description: editDescText.trim() })
                      .eq('id', clan.id);
                    if (error) throw error;
                    setShowEditDesc(false);
                    Alert.alert('Updated', 'Clan description has been updated.');
                  } catch (err: any) {
                    Alert.alert('Error', err.message ?? 'Failed to update description');
                  }
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Epilogue-Bold', fontSize: 15 }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* War Info Modal */}
      <Modal visible={showWarInfo} animationType="fade" transparent>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 }}
          onPress={() => setShowWarInfo(false)}
        >
          <Pressable
            style={{ backgroundColor: '#1d1d37', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: 'rgba(206,150,255,0.3)' }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <FontAwesome name="shield" size={20} color="#ce96ff" />
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, marginLeft: 10, flex: 1 }}>How Clan Wars Work</Text>
              <Pressable onPress={() => setShowWarInfo(false)}>
                <FontAwesome name="times" size={18} color="#74738b" />
              </Pressable>
            </View>
            {[
              { icon: 'fire', color: '#ff6e84', title: 'Challenge a Rival', body: 'Leaders and officers can initiate clan wars. Find a rival clan and send them a challenge to begin.' },
              { icon: 'bolt', color: '#eab308', title: 'Earn War Points', body: 'Every workout logged during an active war earns points for your clan. Strength = lifting points, Scout = cardio points.' },
              { icon: 'bar-chart', color: '#ce96ff', title: 'Live Scores', body: 'Tap the Active War card to see the live scoreboard, top contributors, and time remaining.' },
              { icon: 'trophy', color: '#ffd709', title: 'Win & Claim Glory', body: 'The clan with the most points when time expires wins. Victory rewards go to all participating members.' },
            ].map((item) => (
              <View key={item.title} style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#23233f', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                  <FontAwesome name={item.icon as any} size={14} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14, marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, lineHeight: 18 }}>{item.body}</Text>
                </View>
              </View>
            ))}
            <Pressable
              style={{ backgroundColor: '#a434ff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
              onPress={() => setShowWarInfo(false)}
            >
              <Text style={{ color: '#fff', fontFamily: 'Epilogue-Bold', fontSize: 15 }}>Got It</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Leave Confirm */}
      <ConfirmModal
        visible={showLeaveConfirm}
        title="Leave Clan?"
        message={`Are you sure you want to leave ${clan.name}? You'll lose your role and war contributions.`}
        confirmText="Leave"
        cancelText="Stay"
        destructive
        onConfirm={() => {
          setShowLeaveConfirm(false);
          leaveMutation.mutate(undefined, {
            onSuccess: onLeave,
            onError: (err: any) => Alert.alert('Error', err.message ?? 'Failed to leave clan'),
          });
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* War Initiation Modal */}
      <WarInitiationModal
        visible={showWarModal}
        onClose={() => setShowWarModal(false)}
        sending={sendChallengeMutation.isPending}
        onSendChallenge={(_warType, _durationDays) => {
          Alert.alert(
            'Matchmaking Coming Soon',
            'Automatic opponent matching will be available in a future update. For now, ask a rival clan leader to challenge you!',
            [{ text: 'OK', onPress: () => setShowWarModal(false) }]
          );
        }}
      />

      {/* War History Modal */}
      <Modal visible={showWarHistoryModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(12,12,31,0.95)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1d1d37', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 20, flex: 1 }}>War History</Text>
              <Pressable onPress={() => setShowWarHistoryModal(false)}>
                <FontAwesome name="times" size={20} color="#74738b" />
              </Pressable>
            </View>
            <FlatList
              data={warHistory ?? []}
              scrollEnabled
              keyExtractor={(w: any) => w.id}
              renderItem={({ item: w }: { item: any }) => {
                const isA = w.clan_a_id === myClanId;
                const myScore = (isA ? w.clan_a_score?.total : w.clan_b_score?.total) ?? 0;
                const theirScore = (isA ? w.clan_b_score?.total : w.clan_a_score?.total) ?? 0;
                const oppName = isA ? w.clan_b_name : w.clan_a_name;
                const won = w.winner_clan_id === myClanId;
                const draw = w.winner_clan_id === null;
                return (
                  <View style={{ backgroundColor: '#23233f', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11, marginBottom: 4 }}>
                        Week {w.week_number} · vs {oppName || 'Opponent'}
                      </Text>
                      <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>
                        {myScore} – {theirScore}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: draw ? 'rgba(116,115,139,0.2)' : won ? 'rgba(34,197,94,0.15)' : 'rgba(255,110,132,0.15)' }}>
                      <Text style={{ color: draw ? '#74738b' : won ? '#22c55e' : '#ff6e84', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
                        {draw ? 'DRAW' : won ? 'WIN' : 'LOSS'}
                      </Text>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <FontAwesome name="shield" size={48} color="#74738b" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginBottom: 4 }}>No wars yet</Text>
                  <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, textAlign: 'center' }}>
                    Initiate your first clan war to build your legacy!
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          </View>
        </View>
      </Modal>

      {/* Member Action Sheet */}
      <MemberActionSheet
        visible={selectedMember !== null}
        memberName={selectedMember?.name ?? ''}
        memberRole={selectedMember?.role ?? 'member'}
        myRole={(selectedMember?.userId === currentUserId ? 'member' : clan.my_role) as ClanRole}
        onClose={() => setSelectedMember(null)}
        onViewProfile={() => {
          if (selectedMember) {
            if (selectedMember.userId === currentUserId) {
              router.push('/(app)/profile' as any);
            } else {
              router.push(`/(app)/player/${selectedMember.userId}` as any);
            }
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

// ─── Search / Join View ───────────────────────────────────

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <TextInput
          style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 }}
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
                style={{ backgroundColor: '#1d1d37', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}
                onPress={() => handleJoin(item.id, item.name)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 15, marginBottom: 2 }}>{item.name}</Text>
                  <Text style={{ color: '#ffd709', fontFamily: 'Lexend-SemiBold', fontSize: 12, marginBottom: 2 }}>[{item.tag}]</Text>
                  <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
                    {item.member_count}/{item.max_members} members
                  </Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(206,150,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name="plus" size={16} color="#ce96ff" />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, textAlign: 'center', paddingVertical: 40 }}>
                {query ? 'No clans found' : 'Search for a clan or create your own'}
              </Text>
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Create Clan View ─────────────────────────────────────

function generateClanTag(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const initials = words.map(w => w[0]).join('').toUpperCase();
    if (initials.length < 3) {
      return (initials + words[words.length - 1].slice(1, 4 - initials.length + 1)).toUpperCase().slice(0, 6);
    }
    return initials.slice(0, 6);
  }

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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 16, marginBottom: 24 }}>
          <View>
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Clan Name
            </Text>
            <TextInput
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}
              placeholder="Iron Wolves"
              placeholderTextColor="#74738b"
              value={name}
              onChangeText={setName}
            />
            {autoTag ? (
              <View style={{ backgroundColor: '#1d1d37', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase' }}>Auto-tag:</Text>
                <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>[{autoTag}]</Text>
              </View>
            ) : null}
          </View>
          <View>
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
              Description (optional)
            </Text>
            <TextInput
              style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top' }}
              placeholder="We train hard and compete harder"
              placeholderTextColor="#74738b"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        <Pressable
          style={{ borderRadius: 14, overflow: 'hidden', opacity: createMutation.isPending ? 0.7 : 1 }}
          onPress={handleCreate}
          disabled={createMutation.isPending}
        >
          <LinearGradient
            colors={['#ce96ff', '#a434ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 16, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 15, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 }}>
              {createMutation.isPending ? 'Creating...' : 'Create Clan'}
            </Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Main Clan Screen ─────────────────────────────────────

export default function ClanScreen() {
  const { data: clan, isLoading, refetch } = useMyClan();
  const [view, setView] = useState<ClanView>('search');

  if (isLoading) {
    return (
      <ScreenBackground glowPosition="center">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#ce96ff" size="large" />
        </View>
      </ScreenBackground>
    );
  }

  // User has a clan — show the war hub
  if (clan) {
    return (
      <ScreenBackground glowPosition="top" glowColor="#a434ff" glowOpacity={0.1}>
        <MyClanView clan={clan} onLeave={() => refetch()} />
      </ScreenBackground>
    );
  }

  // No clan — search / create
  return (
    <ScreenBackground glowPosition="center">
      {/* Tab Switcher */}
      <View style={{ flexDirection: 'row', borderRadius: 12, margin: 16, backgroundColor: '#17172f', padding: 4, borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 9,
            backgroundColor: view === 'search' ? '#a434ff' : 'transparent',
          }}
          onPress={() => setView('search')}
        >
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: view === 'search' ? '#fff' : '#74738b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Find Clan
          </Text>
        </Pressable>
        <Pressable
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: 'center',
            borderRadius: 9,
            backgroundColor: view === 'create' ? '#a434ff' : 'transparent',
          }}
          onPress={() => setView('create')}
        >
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: view === 'create' ? '#fff' : '#74738b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Create Clan
          </Text>
        </Pressable>
      </View>

      {view === 'search' ? (
        <SearchView onJoined={() => refetch()} />
      ) : (
        <CreateView onCreated={() => refetch()} />
      )}
    </ScreenBackground>
  );
}
