import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function WarDetailsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View
          className="flex-row items-center px-4 py-3"
          style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(206,150,255,0.15)' }}
        >
          <Pressable onPress={() => router.replace('/(app)/clan' as any)} hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <Text className="ml-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>
            Clan Wars
          </Text>
        </View>

        {/* Hero */}
        <View className="items-center py-8 px-6">
          <Text className="text-5xl mb-3">⚔️</Text>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 28, textAlign: 'center', letterSpacing: 1 }}>
            CLAN WARS
          </Text>
          <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Compete against rival clans in head-to-head battles. Every workout your clan logs during a war counts toward victory.
          </Text>
        </View>

        <View className="px-4">
          {/* How It Works */}
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, marginBottom: 12 }}>How It Works</Text>

          {[
            { icon: 'fire' as const, color: '#ef4444', title: '1. Initiate a War', desc: 'Clan leaders and officers can challenge rival clans. Choose between Lifting Only, Cardio Only, or Mixed wars.' },
            { icon: 'users' as const, color: '#ce96ff', title: '2. Rally Your Clan', desc: 'Every member contributes by completing workouts during the war period. More workouts = more points for your clan.' },
            { icon: 'trophy' as const, color: '#ffd709', title: '3. Win Trophies', desc: 'The clan with the highest combined score wins. Winners earn +30 trophies per member. Losers lose -15.' },
          ].map((step) => (
            <View key={step.title} className="bg-[#1d1d37] rounded-xl p-4 mb-3 flex-row">
              <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: step.color + '20' }}>
                <FontAwesome name={step.icon} size={16} color={step.color} />
              </View>
              <View className="flex-1">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, marginBottom: 4 }}>{step.title}</Text>
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, lineHeight: 18 }}>{step.desc}</Text>
              </View>
            </View>
          ))}

          {/* War Types */}
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, marginTop: 16, marginBottom: 12 }}>War Types</Text>

          {[
            { icon: 'heartbeat' as const, color: '#ef4444', title: 'Lifting War', desc: 'Total lifting volume across all members is compared. Every set counts.' },
            { icon: 'road' as const, color: '#81ecff', title: 'Cardio War', desc: 'Total distance covered by all members. GPS-verified sessions earn full points.' },
            { icon: 'bolt' as const, color: '#ce96ff', title: 'Mixed War', desc: 'Both lifting and cardio count. The most versatile clan wins.' },
          ].map((type) => (
            <View key={type.title} className="bg-[#23233f] rounded-xl p-4 mb-2 flex-row items-center">
              <FontAwesome name={type.icon} size={18} color={type.color} style={{ marginRight: 12, width: 24, textAlign: 'center' }} />
              <View className="flex-1">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{type.title}</Text>
                <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>{type.desc}</Text>
              </View>
            </View>
          ))}

          {/* Scoring */}
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, marginTop: 16, marginBottom: 12 }}>Scoring</Text>

          <View className="bg-[#1d1d37] rounded-xl p-4 mb-3">
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 13, lineHeight: 20 }}>
              War scores are calculated from four components:{'\n\n'}
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>Output (30%)</Text> — Raw workout performance{'\n'}
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>Participation (30%)</Text> — Members who show up{'\n'}
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>Consistency (20%)</Text> — Spread across the war period{'\n'}
              <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>Diversity (20%)</Text> — Variety of exercises{'\n\n'}
              Each member has a daily cap of 500 points and a weekly cap of 20,000 points to prevent one person from carrying the entire clan.
            </Text>
          </View>

          {/* Duration */}
          <View className="bg-[#1d1d37] rounded-xl p-4 mb-3">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 14, marginBottom: 4 }}>War Duration</Text>
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
              Wars can last 1, 2, 3, 5, or 7 days. Shorter wars reward burst effort. Longer wars reward consistency.
            </Text>
          </View>

          {/* Anti-Cheat */}
          <View className="bg-[#23233f] rounded-xl p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <FontAwesome name="shield" size={14} color="#22c55e" />
              <Text style={{ color: '#22c55e', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>Fair Play</Text>
            </View>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, lineHeight: 18 }}>
              All workouts are validated by our anti-cheat system. Suspicious activity is flagged and may result in voided war contributions. Play fair — your clan is counting on you.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
