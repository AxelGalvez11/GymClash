import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { useProfile } from '@/hooks/use-profile';

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

type CurrencyType = 'diamonds' | 'lifting' | 'cardio';

const CURRENCY_CONFIG: Record<CurrencyType, {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  desc: string;
  gradient: [string, string];
}> = {
  diamonds: {
    label: 'Diamonds',
    icon: 'diamond',
    color: '#ce96ff',
    desc: 'Used for Power-Ups, exclusive cosmetics, and premium crates',
    gradient: ['#2a0a4a', '#0c0c1f'],
  },
  lifting: {
    label: 'Lifting Points',
    icon: 'bolt',
    color: '#eab308',
    desc: 'Earn faster by completing strength workouts. Used in the Shop for lifting gear cosmetics',
    gradient: ['#2a1f00', '#0c0c1f'],
  },
  cardio: {
    label: 'Cardio Points',
    icon: 'road',
    color: '#81ecff',
    desc: 'Earn by completing Scout runs. Used for cardio-themed cosmetics and upgrades',
    gradient: ['#002a2a', '#0c0c1f'],
  },
};

const PACKS: Record<CurrencyType, Array<{ amount: number; bonus: number; price: string; popular?: boolean; best?: boolean }>> = {
  diamonds: [
    { amount: 100, bonus: 0, price: '$0.99' },
    { amount: 500, bonus: 50, price: '$3.99', popular: true },
    { amount: 1200, bonus: 200, price: '$7.99' },
    { amount: 2600, bonus: 600, price: '$14.99', best: true },
    { amount: 7200, bonus: 2000, price: '$34.99' },
  ],
  lifting: [
    { amount: 50, bonus: 0, price: '$0.99' },
    { amount: 200, bonus: 25, price: '$2.99', popular: true },
    { amount: 500, bonus: 100, price: '$5.99', best: true },
  ],
  cardio: [
    { amount: 50, bonus: 0, price: '$0.99' },
    { amount: 200, bonus: 25, price: '$2.99', popular: true },
    { amount: 500, bonus: 100, price: '$5.99', best: true },
  ],
};

function CurrencyTab({
  type,
  active,
  onPress,
}: {
  type: CurrencyType;
  active: boolean;
  onPress: () => void;
}) {
  const cfg = CURRENCY_CONFIG[type];
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: active ? VP.active : 'transparent',
        borderWidth: active ? 1 : 0,
        borderColor: active ? cfg.color + '40' : 'transparent',
        shadowColor: active ? cfg.color : 'transparent',
        shadowOpacity: active ? 0.3 : 0,
        shadowRadius: 8,
        elevation: active ? 4 : 0,
      }}
    >
      <FontAwesome name={cfg.icon} size={18} color={active ? cfg.color : VP.textMuted} />
      <Text style={{ color: active ? cfg.color : VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, marginTop: 4, textAlign: 'center' }}>
        {cfg.label}
      </Text>
    </Pressable>
  );
}

function PackCard({
  pack,
  currency,
  onPress,
}: {
  pack: typeof PACKS.diamonds[0];
  currency: CurrencyType;
  onPress: () => void;
}) {
  const cfg = CURRENCY_CONFIG[currency];
  const total = pack.amount + pack.bonus;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: VP.raised,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: pack.best ? cfg.color + '50' : pack.popular ? cfg.color + '25' : 'rgba(206,150,255,0.08)',
        shadowColor: cfg.color,
        shadowOpacity: pack.best ? 0.35 : pack.popular ? 0.2 : 0.1,
        shadowRadius: pack.best ? 16 : 10,
        elevation: pack.best ? 8 : 4,
      }}
    >
      {pack.best && (
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingVertical: 4, paddingHorizontal: 16, alignItems: 'center' }}
        >
          <Text style={{ color: cfg.color, fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            ⭐ Best Value
          </Text>
        </LinearGradient>
      )}
      {pack.popular && !pack.best && (
        <View style={{ backgroundColor: cfg.color + '20', paddingVertical: 4, paddingHorizontal: 16, alignItems: 'center' }}>
          <Text style={{ color: cfg.color, fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            🔥 Most Popular
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
        {/* Icon + amount */}
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: cfg.color + '18', alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name={cfg.icon} size={24} color={cfg.color} />
        </View>

        {/* Amount + bonus */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 24 }}>{pack.amount.toLocaleString()}</Text>
            <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>{cfg.label.split(' ')[0].toLowerCase()}</Text>
          </View>
          {pack.bonus > 0 && (
            <Text style={{ color: '#22c55e', fontFamily: 'Lexend-SemiBold', fontSize: 11, marginTop: 2 }}>
              + {pack.bonus.toLocaleString()} bonus · {total.toLocaleString()} total
            </Text>
          )}
        </View>

        {/* Price button */}
        <View style={{
          backgroundColor: cfg.color,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}>
          <Text style={{ color: '#000000', fontFamily: 'Epilogue-Bold', fontSize: 14 }}>{pack.price}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [selected, setSelected] = useState<CurrencyType>('diamonds');

  const cfg = CURRENCY_CONFIG[selected];
  const packs = PACKS[selected];

  function handlePurchase(pack: typeof packs[0]) {
    Alert.alert(
      'Coming Soon',
      `In-app purchases will be available in a future update. You'll be able to buy ${pack.amount + pack.bonus} ${cfg.label} for ${pack.price}.`,
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VP.surface }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, backgroundColor: VP.raised, borderBottomWidth: 1, borderBottomColor: 'rgba(206,150,255,0.12)' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FontAwesome name="arrow-left" size={18} color={VP.textSec} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 18 }}>Get Currency</Text>
          <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>Top up your balance</Text>
        </View>
        {/* Balance pills */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(206,150,255,0.12)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
            <FontAwesome name="diamond" size={10} color={VP.primary} />
            <Text style={{ color: VP.primary, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>{profile?.gym_coins ?? 0}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Currency type selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, backgroundColor: VP.raised, borderRadius: 18, padding: 6 }}>
          <CurrencyTab type="diamonds" active={selected === 'diamonds'} onPress={() => setSelected('diamonds')} />
          <CurrencyTab type="lifting" active={selected === 'lifting'} onPress={() => setSelected('lifting')} />
          <CurrencyTab type="cardio" active={selected === 'cardio'} onPress={() => setSelected('cardio')} />
        </View>

        {/* Currency description */}
        <View style={{ backgroundColor: VP.raised, borderRadius: 16, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: cfg.color + '20' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cfg.color + '18', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name={cfg.icon} size={18} color={cfg.color} />
          </View>
          <Text style={{ color: VP.textSec, fontFamily: 'BeVietnamPro-Regular', fontSize: 12, flex: 1, lineHeight: 18 }}>
            {cfg.desc}
          </Text>
        </View>

        {/* Packs */}
        <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Select a Pack
        </Text>
        {packs.map((pack, i) => (
          <PackCard key={i} pack={pack} currency={selected} onPress={() => handlePurchase(pack)} />
        ))}

        {/* Disclaimer */}
        <View style={{ marginTop: 16, padding: 12, backgroundColor: VP.raised, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(206,150,255,0.06)' }}>
          <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
            💎 Purchased currency is non-refundable. Diamonds are cosmetic-only and do not affect trophy rankings or leaderboard standings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
