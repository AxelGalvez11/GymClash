import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useActiveWar, useWarContributions, useMyClan } from '@/hooks/use-clan';
import { BiColorBar } from '@/components/BiColorBar';

// ── Victory Peak palette ────────────────────────────────
const VP = {
  surface:    '#0c0c1f',
  raised:     '#17172f',
  active:     '#1d1d37',
  highest:    '#23233f',
  textPri:    '#e5e3ff',
  textSec:    '#aaa8c3',
  textMuted:  '#74738b',
  primary:    '#ce96ff',
  primaryDim: '#a434ff',
  gold:       '#ffd709',
  cyan:       '#81ecff',
} as const;

interface WarContribution {
  user_id: string;
  display_name: string;
  score?: number;
  contribution?: number;
}

function StatBox({ label, value, color = VP.textPri }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: VP.highest, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(206,150,255,0.1)' }}>
      <Text style={{ color, fontFamily: 'Epilogue-Bold', fontSize: 22 }}>{value}</Text>
      <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function WarDetailsScreen() {
  const router = useRouter();
  const { data: war, isLoading: warLoading } = useActiveWar();
  const { data: myClan } = useMyClan();
  const { data: contributions } = useWarContributions(war?.id, myClan?.id);

  if (warLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: VP.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={VP.primary} size="large" />
      </SafeAreaView>
    );
  }

  // Determine which clan is "my clan" and get their score
  const isMyClanA = war && myClan ? war.clan_a_id === myClan.id : false;
  const myClanScore = war ? (isMyClanA ? war.clan_a_score?.total : war.clan_b_score?.total) : 0;
  const enemyScore = war ? (isMyClanA ? war.clan_b_score?.total : war.clan_a_score?.total) : 0;
  const totalScore = (myClanScore ?? 0) + (enemyScore ?? 0);
  const myPct = totalScore > 0 ? (myClanScore ?? 0) / totalScore : 0.5;

  const endTime = war?.ended_at ? new Date(war.ended_at) : null;
  const timeLeft = endTime ? Math.max(0, endTime.getTime() - Date.now()) : null;
  const hoursLeft = timeLeft !== null ? Math.floor(timeLeft / 3600000) : null;
  const minsLeft = timeLeft !== null ? Math.floor((timeLeft % 3600000) / 60000) : null;

  const myClanName = myClan?.name ?? 'My Clan';
  const enemyName = war?.opponent_clan?.name ?? 'Opponent';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VP.surface }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: VP.raised, borderBottomWidth: 1, borderBottomColor: 'rgba(206,150,255,0.12)' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome name="arrow-left" size={18} color={VP.textSec} />
        </Pressable>
        <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 18, flex: 1 }}>⚔️ War Details</Text>
        {war && (
          <View style={{ backgroundColor: '#22c55e20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' }}>
            <Text style={{ color: '#22c55e', fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1 }}>ACTIVE</Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {!war ? (
          /* No active war */
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>⚔️</Text>
            <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 20, marginBottom: 8 }}>No Active War</Text>
            <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
              Your clan isn't currently in a war. Ask your clan leader to initiate one to start competing!
            </Text>
          </View>
        ) : (
          <>
            {/* War countdown */}
            {hoursLeft !== null && (
              <View style={{
                backgroundColor: VP.raised,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: hoursLeft < 3 ? 'rgba(239,68,68,0.3)' : 'rgba(255,215,9,0.2)',
                shadowColor: hoursLeft < 3 ? '#ef4444' : '#ffd709',
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 5,
              }}>
                <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Time Remaining</Text>
                <Text style={{ color: hoursLeft < 3 ? '#ef4444' : VP.gold, fontFamily: 'Epilogue-Bold', fontSize: 36 }}>
                  {hoursLeft}h {minsLeft}m
                </Text>
                {hoursLeft < 3 && (
                  <Text style={{ color: '#ef4444', fontFamily: 'Lexend-SemiBold', fontSize: 11, marginTop: 4 }}>⚠️ Final hours — push hard!</Text>
                )}
              </View>
            )}

            {/* Score bar */}
            <View style={{ backgroundColor: VP.raised, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(206,150,255,0.12)', shadowColor: VP.primary, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 }}>
              <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Score</Text>
              <BiColorBar
                leftLabel={myClanName}
                rightLabel={enemyName}
                leftPercent={myPct * 100}
                leftColor="#ce96ff"
                rightColor="#ff6e84"
                showLabels
                showPercents
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <StatBox label="Us" value={myClanScore ?? 0} color={VP.primary} />
                <StatBox label="Them" value={enemyScore ?? 0} color="#ff6e84" />
                <StatBox label="Total" value={totalScore} color={VP.textSec} />
              </View>
            </View>

            {/* Top contributors */}
            {contributions && contributions.length > 0 && (
              <View style={{ backgroundColor: VP.raised, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(206,150,255,0.12)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: VP.cyan }} />
                  <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 15 }}>Top Contributors</Text>
                </View>
                {(contributions as WarContribution[]).slice(0, 5).map((c: WarContribution, i: number) => (
                  <View key={c.user_id ?? i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: 'rgba(206,150,255,0.06)' }}>
                    <Text style={{ color: i === 0 ? VP.gold : VP.textMuted, fontFamily: 'Epilogue-Bold', fontSize: 14, width: 24 }}>#{i + 1}</Text>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: VP.highest, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <FontAwesome name="user" size={14} color={VP.textMuted} />
                    </View>
                    <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 13, flex: 1 }}>{c.display_name ?? 'Member'}</Text>
                    <Text style={{ color: VP.primary, fontFamily: 'Epilogue-Bold', fontSize: 14 }}>{c.score ?? c.contribution ?? 0}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* War type info */}
            <View style={{ backgroundColor: VP.raised, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(206,150,255,0.08)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: VP.primary }} />
                <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 15 }}>War Info</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>Week Number</Text>
                <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{war.week_number ?? '–'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>Opponent</Text>
                <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{enemyName}</Text>
              </View>
              {war.started_at && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>Started</Text>
                  <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
                    {new Date(war.started_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
