import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useActiveWar, useWarContributions, useMyClan } from '@/hooks/use-clan';
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function WarDetailsScreen() {
  const router = useRouter();
  const { warId } = useLocalSearchParams<{ warId: string }>();
  const { data: war, isLoading: warLoading } = useActiveWar();
  const { data: myClan } = useMyClan();
  const myClanId = myClan?.id;
  const { data: contributions, isLoading: contribLoading } = useWarContributions(warId, myClanId);

  const isLoading = warLoading || contribLoading;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  if (!war) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>No active war</Text>
        <Pressable className="mt-4" onPress={() => router.replace('/(app)/clan' as any)}>
          <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }}>Back to Clan</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isClansA = myClanId === war.clan_a_id;
  const myScore = isClansA ? (war.clan_a_score?.total ?? 0) : (war.clan_b_score?.total ?? 0);
  const opponentScore = isClansA ? (war.clan_b_score?.total ?? 0) : (war.clan_a_score?.total ?? 0);
  const warType = war.war_type ?? 'mixed';

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(206,150,255,0.15)' }}>
          <Pressable onPress={() => router.replace('/(app)/clan' as any)} hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <Text className="ml-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>War Details</Text>
        </View>

        {/* War Header */}
        <View className="items-center py-6">
          <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>CLAN WAR — WEEK {war.week_number}</Text>
          <View className="flex-row items-center gap-6 mt-4">
            <View className="items-center">
              <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>YOUR CLAN</Text>
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 36 }}>{myScore}</Text>
            </View>
            <Text style={{ color: '#74738b', fontFamily: 'Epilogue-Bold', fontSize: 20 }}>vs</Text>
            <View className="items-center">
              <Text style={{ color: '#ff6e84', fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>OPPONENT</Text>
              <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 36 }}>{opponentScore}</Text>
            </View>
          </View>
          {/* Score progress bar */}
          <View className="w-full px-8 mt-4">
            <ProgressBar current={myScore} max={Math.max(myScore + opponentScore, 1)} color="#ce96ff" height="md" />
          </View>
        </View>

        {/* War Objectives */}
        <View className="px-4 mb-6">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginBottom: 12 }}>Objectives</Text>
          {(warType === 'mixed' || warType === 'strength_only') && (
            <View className="bg-[#1d1d37] rounded-xl p-4 mb-3">
              <View className="flex-row items-center gap-2 mb-2">
                <FontAwesome name="heartbeat" size={16} color="#ef4444" />
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>Lifting Volume</Text>
              </View>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
                Total lifting volume across all members. Higher combined score wins this objective.
              </Text>
            </View>
          )}
          {(warType === 'mixed' || warType === 'cardio_only') && (
            <View className="bg-[#1d1d37] rounded-xl p-4 mb-3">
              <View className="flex-row items-center gap-2 mb-2">
                <FontAwesome name="road" size={16} color="#81ecff" />
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>Cardio Distance</Text>
              </View>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
                Total distance covered by all members. GPS-verified sessions count toward this objective.
              </Text>
            </View>
          )}
          <View className="bg-[#1d1d37] rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <FontAwesome name="users" size={16} color="#ce96ff" />
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>Participation</Text>
            </View>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
              Members who complete at least one workout during the war contribute participation points.
            </Text>
          </View>
        </View>

        {/* Contributions */}
        <View className="px-4">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginBottom: 12 }}>Your Clan's Contributions</Text>
          {(!contributions || contributions.length === 0) ? (
            <View className="bg-[#1d1d37] rounded-xl p-6 items-center">
              <FontAwesome name="hourglass-o" size={24} color="#74738b" />
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', marginTop: 8 }}>No contributions yet — start working out!</Text>
            </View>
          ) : (
            <View className="gap-2">
              {contributions.slice(0, 15).map((c: any, i: number) => {
                const maxPts = Math.max(...contributions.map((x: any) => x.contribution_points), 1);
                return (
                  <View key={c.user_id} className="bg-[#1d1d37] rounded-xl p-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>
                        {i + 1}. {c.display_name || 'Warrior'}
                      </Text>
                      <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>
                        {Math.round(c.contribution_points)} pts
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-[#23233f] overflow-hidden">
                      <View
                        className="h-2 rounded-full"
                        style={{ width: `${Math.min((c.contribution_points / maxPts) * 100, 100)}%`, backgroundColor: '#ce96ff' }}
                      />
                    </View>
                    <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 10, marginTop: 2 }}>
                      {c.workout_count} workout{c.workout_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* War Chat Link */}
        <View className="px-4 mt-6">
          <Pressable
            className="bg-[#23233f] rounded-xl p-4 flex-row items-center active:scale-[0.98]"
            onPress={() => router.push(`/(app)/war-chat/${warId}` as any)}
          >
            <FontAwesome name="comments" size={18} color="#ce96ff" />
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', marginLeft: 12 }}>Open War Chat</Text>
            <View className="flex-1" />
            <FontAwesome name="chevron-right" size={12} color="#74738b" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
