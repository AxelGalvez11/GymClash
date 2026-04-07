import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAccent } from '@/stores/accent-store';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useEntrance } from '@/hooks/use-entrance';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import FeaturedBanner from '@/components/shop/FeaturedBanner';
import CratePreview from '@/components/shop/CratePreview';
import PowerUpPreview from '@/components/shop/PowerUpPreview';
import type { CosmeticRarity } from '@/types';

// ─── Design tokens ────────────────────────────────────────────────────────────
const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: '#aaa8c3',
  rare: '#81ecff',
  epic: '#ce96ff',
  legendary: '#ffd709',
};

const RARITY_GLOW: Record<CosmeticRarity, { shadowColor: string; shadowOpacity: number }> = {
  common: { shadowColor: '#aaa8c3', shadowOpacity: 0.15 },
  rare: { shadowColor: '#81ecff', shadowOpacity: 0.30 },
  epic: { shadowColor: '#ce96ff', shadowOpacity: 0.40 },
  legendary: { shadowColor: '#ffd709', shadowOpacity: 0.50 },
};

// Rarity badge label map
const RARITY_BADGE: Record<CosmeticRarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

// ─── Shop tab types ───────────────────────────────────────────────────────────
type ShopTab = 'featured' | 'cosmetics' | 'powerups' | 'crates';

const SHOP_TABS: { key: ShopTab; label: string }[] = [
  { key: 'featured',  label: 'Featured'  },
  { key: 'cosmetics', label: 'Costumes'  },
  { key: 'powerups',  label: 'Power Ups' },
  { key: 'crates',    label: 'Crates'    },
];

// ─── Daily deal items (static, matches reference image feel) ─────────────────
const DAILY_DEALS = [
  {
    id: 'daily-1',
    icon: 'bolt' as const,
    iconColor: '#81ecff',
    title: 'X1 Rocket Booster',
    description: '2× Arena XP for 24 h. Stack with active buffs.',
    price: 50,
    currency: 'diamonds' as const,
    accentColor: '#81ecff',
  },
  {
    id: 'daily-2',
    icon: 'star' as const,
    iconColor: '#ffd709',
    title: 'Volt Runner Bundle',
    description: 'Limited yellow-chrome cosmetics drop. Today only.',
    price: 300,
    currency: 'diamonds' as const,
    accentColor: '#ffd709',
  },
  {
    id: 'daily-3',
    icon: 'shield' as const,
    iconColor: '#ce96ff',
    title: 'Laser Helm Mk-II',
    description: 'Blue-spectrum tactical helmet skin. Epic rarity.',
    price: 800,
    currency: 'diamonds' as const,
    accentColor: '#ce96ff',
  },
] as const;

// ─── Data hooks (preserved exactly from original) ─────────────────────────────
function useCatalog() {
  return useQuery({
    queryKey: ['cosmetic-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cosmetic_catalog')
        .select('*')
        .order('rarity', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

function useMyInventory() {
  return useQuery({
    queryKey: ['my-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cosmetic_inventory')
        .select('*')
        .order('acquired_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function usePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (catalogId: string) => {
      const { data, error } = await supabase.rpc('purchase_cosmetic', {
        p_catalog_id: catalogId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ─── Tab bounce spring ────────────────────────────────────────────────────────
const TAB_SPRING_IN     = { damping: 8,  stiffness: 400, mass: 0.6 } as const;
const TAB_SPRING_SETTLE = { damping: 14, stiffness: 280, mass: 0.7 } as const;

function useTabBounce(isActive: boolean) {
  const scale    = useSharedValue(1);
  const prevRef  = useRef(false);

  useEffect(() => {
    if (isActive && !prevRef.current) {
      scale.value = 0.95;
      scale.value = withSpring(1.05, TAB_SPRING_IN, () => {
        'worklet';
        scale.value = withSpring(1, TAB_SPRING_SETTLE);
      });
    }
    prevRef.current = isActive;
  }, [isActive]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

// ─── Tab fade transition ──────────────────────────────────────────────────────
function TabContentFade({ children }: { children: React.ReactNode }) {
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value    = 0;
    translateY.value = 10;
    const ease       = Easing.out(Easing.cubic);
    opacity.value    = withTiming(1, { duration: 260, easing: ease });
    translateY.value = withTiming(0, { duration: 260, easing: ease });
  }, []);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Animated count-up currency value ────────────────────────────────────────
function CurrencyValue({ value, color }: { value: number; color: string }) {
  return (
    <Text
      numberOfLines={1}
      style={{
        color,
        fontFamily: 'Lexend-Bold',
        fontWeight: '700',
        fontSize: 12,
        minWidth: 20,
      }}
    >
      {value.toLocaleString()}
    </Text>
  );
}

// ─── Header currency pill ─────────────────────────────────────────────────────
function CurrencyPill({
  value,
  icon,
  color,
  onPress,
}: {
  value: number;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  onPress?: () => void;
}) {
  const inner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#23233f',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: `${color}33`,
      }}
    >
      <FontAwesome name={icon} size={10} color={color} />
      <CurrencyValue value={value} color={color} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        {inner}
      </Pressable>
    );
  }
  return inner;
}

// ─── Shop tab pill ────────────────────────────────────────────────────────────
function TabPill({
  tab,
  isActive,
  onPress,
}: {
  tab: { key: ShopTab; label: string };
  isActive: boolean;
  onPress: () => void;
}) {
  const bounceStyle = useTabBounce(isActive);

  return (
    <Animated.View style={bounceStyle}>
      <Pressable
        onPress={onPress}
        style={[
          {
            borderRadius: 99,
            paddingHorizontal: 18,
            paddingVertical: 8,
            backgroundColor: isActive ? '#a434ff' : '#1d1d37',
            borderWidth: 1,
            borderColor: isActive ? 'transparent' : 'rgba(206,150,255,0.15)',
          },
          isActive && Platform.OS === 'ios'
            ? {
                shadowColor: '#a434ff',
                shadowOpacity: 0.45,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              }
            : {},
        ]}
      >
        <Text
          style={{
            color: isActive ? '#ffffff' : '#74738b',
            fontFamily: 'Lexend-Bold',
            fontWeight: '700',
            fontSize: 12,
            letterSpacing: 0.5,
          }}
        >
          {tab.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Hero banner: "ZENITH PROTOCOL" with shimmer ──────────────────────────────
function HeroBanner({ onBuy }: { onBuy?: () => void }) {
  const { animatedStyle } = useEntrance(0, 'fade-scale', 340);

  // Shimmer sweep
  const shimmerX = useSharedValue(-200);
  useEffect(() => {
    shimmerX.value = withDelay(
      500,
      withRepeat(
        withTiming(400, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={['#2a0d4a', '#0c0c1f', '#1a0630']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: 'rgba(206,150,255,0.45)',
          marginBottom: 24,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#ce96ff',
                shadowOpacity: 0.30,
                shadowRadius: 32,
                shadowOffset: { width: 0, height: 0 },
              }
            : { elevation: 12 }),
        }}
      >
        {/* Shimmer sweep overlay */}
        <View style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} pointerEvents="none">
          <Animated.View
            style={[
              { position: 'absolute', top: 0, bottom: 0, width: 120 },
              shimmerStyle,
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(206,150,255,0.10)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1, width: 120 }}
            />
          </Animated.View>
        </View>

        <View style={{ padding: 24, gap: 10 }}>
          {/* Season badge */}
          <View style={{ alignSelf: 'flex-start' }}>
            <View
              style={{
                backgroundColor: '#ffd709',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 99,
              }}
            >
              <Text
                style={{
                  color: '#5b4b00',
                  fontFamily: 'Lexend-Bold',
                  fontWeight: '700',
                  fontSize: 10,
                  letterSpacing: 1.4,
                }}
              >
                SEASONAL EXCLUSIVE
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontFamily: 'Epilogue-Bold',
              fontWeight: '900',
              fontSize: 32,
              color: '#e5e3ff',
              textTransform: 'uppercase',
              letterSpacing: -0.5,
              lineHeight: 34,
            }}
          >
            Zenith{'\n'}Protocol
          </Text>

          {/* Description */}
          <Text
            style={{
              color: '#aaa8c3',
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 12,
              maxWidth: 240,
              lineHeight: 18,
            }}
          >
            Unlock the legendary neon-mesh tactical gear. Boost your XP gain by 15% for the
            remainder of the season.
          </Text>

          {/* CTA */}
          <View style={{ marginTop: 4 }}>
            <Button variant="primary" size="md" glowing onPress={onBuy}>
              Buy Now — 2,500 Diamonds
            </Button>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Featured item card (tall, image-style) ───────────────────────────────────
function FeaturedItemCard({
  item,
  index,
  owned,
  onPress,
  disabled,
}: {
  item: any;
  index: number;
  owned: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const rarityColor = RARITY_COLORS[(item.rarity as CosmeticRarity) ?? 'common'] ?? '#aaa8c3';
  const glow        = RARITY_GLOW[(item.rarity as CosmeticRarity) ?? 'common'] ?? RARITY_GLOW.common;
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 70, 280);

  return (
    <Animated.View style={[{ flex: 1, minWidth: 155 }, staggerStyle]}>
      <Card
        variant="elevated"
        accentBorder={rarityColor}
        onPress={disabled ? undefined : onPress}
        style={{
          padding: 0,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: glow.shadowColor,
                shadowOpacity: glow.shadowOpacity,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 0 },
              }
            : { elevation: 8 }),
        }}
      >
        {/* Rarity badge */}
        <View
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            backgroundColor: rarityColor,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <Text
            style={{
              color: '#000',
              fontFamily: 'Lexend-Bold',
              fontWeight: '900',
              fontSize: 9,
              letterSpacing: 0.5,
            }}
          >
            {RARITY_BADGE[(item.rarity as CosmeticRarity) ?? 'common']}
          </Text>
        </View>

        {/* Art area */}
        <View
          style={{
            height: 130,
            backgroundColor: '#000',
            borderTopLeftRadius: 13,
            borderTopRightRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Inner glow bloom */}
          <View
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: rarityColor,
              opacity: 0.08,
            }}
          />
          <FontAwesome name="gift" size={44} color={rarityColor} />
        </View>

        {/* Content */}
        <View style={{ padding: 14, gap: 4 }}>
          <Text
            style={{
              color: '#e5e3ff',
              fontFamily: 'Epilogue-Bold',
              fontWeight: '700',
              fontSize: 14,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {item.description ? (
            <Text
              style={{
                color: '#aaa8c3',
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
                lineHeight: 15,
              }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          {/* Price row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
            }}
          >
            {owned ? (
              <View
                style={{
                  backgroundColor: 'rgba(129,236,255,0.15)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 99,
                }}
              >
                <Text
                  style={{
                    color: '#81ecff',
                    fontFamily: 'Lexend-Bold',
                    fontWeight: '700',
                    fontSize: 11,
                  }}
                >
                  Owned
                </Text>
              </View>
            ) : item.price_coins ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="circle" size={8} color="#ffd709" />
                <Text
                  style={{
                    color: '#e5e3ff',
                    fontFamily: 'Lexend-Bold',
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {item.price_coins}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: '#74738b',
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 11,
                }}
              >
                Crate only
              </Text>
            )}

            {!owned && item.price_coins ? (
              <Pressable
                onPress={disabled ? undefined : onPress}
                disabled={disabled}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? rarityColor : '#23233f',
                  borderRadius: 10,
                  padding: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(70,70,92,0.3)',
                  opacity: disabled ? 0.5 : 1,
                })}
              >
                <FontAwesome name="shopping-cart" size={14} color={rarityColor} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

// ─── Daily deal card with gold breathing glow ─────────────────────────────────
function DailyDealCard({
  deal,
  index,
}: {
  deal: typeof DAILY_DEALS[number];
  index: number;
}) {
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 80, 300);
  const { glowStyle } = useGlowPulse(deal.accentColor, 0.20, 0.55, 2600, true);

  return (
    <Animated.View style={[staggerStyle, { marginBottom: 12 }]}>
      <Animated.View
        style={[
          {
            borderRadius: 16,
            backgroundColor: '#17172f',
            borderWidth: 1.5,
            borderColor: deal.accentColor,
            overflow: 'hidden',
            ...(Platform.OS === 'ios' ? {} : { elevation: 6 }),
          },
          Platform.OS === 'ios' ? glowStyle : {},
        ]}
      >
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}
        >
          {/* Icon orb */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: '#000',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: deal.accentColor,
                opacity: 0.15,
              }}
            />
            <FontAwesome name={deal.icon} size={22} color={deal.accentColor} />
          </View>

          {/* Info */}
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                color: '#e5e3ff',
                fontFamily: 'Epilogue-Bold',
                fontWeight: '700',
                fontSize: 14,
              }}
            >
              {deal.title}
            </Text>
            <Text
              style={{
                color: '#aaa8c3',
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
                lineHeight: 15,
              }}
              numberOfLines={2}
            >
              {deal.description}
            </Text>
          </View>

          {/* Price + buy */}
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FontAwesome name="diamond" size={10} color="#ce96ff" />
              <Text
                style={{
                  color: '#e5e3ff',
                  fontFamily: 'Lexend-Bold',
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {deal.price}
              </Text>
            </View>
            <Button variant="primary" size="sm">
              Buy
            </Button>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Daily Streak bonus card (reference HTML section) ────────────────────────
function StreakBonusCard() {
  const { glowStyle } = useGlowPulse('#ffd709', 0.10, 0.30, 3000, true);

  return (
    <Animated.View
      style={[
        {
          borderRadius: 16,
          backgroundColor: '#111127',
          borderWidth: 1,
          borderColor: 'rgba(70,70,92,0.15)',
          overflow: 'hidden',
          marginTop: 8,
          ...(Platform.OS === 'ios' ? {} : { elevation: 4 }),
        },
        Platform.OS === 'ios' ? glowStyle : {},
      ]}
    >
      <LinearGradient
        colors={['#111127', '#0c0c1f']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}
      >
        {/* Progress pips */}
        <View style={{ flex: 1, gap: 8 }}>
          <Text
            style={{
              color: '#e5e3ff',
              fontFamily: 'Epilogue-Bold',
              fontWeight: '900',
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: -0.3,
            }}
          >
            Daily Streak Bonus
          </Text>
          <Text
            style={{
              color: '#aaa8c3',
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            Return tomorrow to unlock a free{' '}
            <Text style={{ color: '#ffd709', fontFamily: 'BeVietnamPro-Medium', fontWeight: '600' }}>
              Mystery Shard
            </Text>{' '}
            for your next crate.
          </Text>
          {/* Pip indicators */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            {[true, true, true, false, false].map((filled, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: filled ? '#ffd709' : '#23233f',
                }}
              />
            ))}
          </View>
        </View>

        {/* Decorative icon */}
        <FontAwesome name="calendar" size={48} color="rgba(255,215,9,0.15)" />
      </LinearGradient>
    </Animated.View>
  );
}

// ─── XP Weekend card ──────────────────────────────────────────────────────────
function XPWeekendCard() {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: '#111127',
        borderWidth: 1,
        borderColor: 'rgba(129,236,255,0.20)',
        padding: 20,
        marginTop: 12,
        gap: 6,
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: '#81ecff',
              shadowOpacity: 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 0 },
            }
          : { elevation: 4 }),
      }}
    >
      <Text
        style={{
          color: '#81ecff',
          fontFamily: 'Lexend-Bold',
          fontWeight: '900',
          fontSize: 28,
          letterSpacing: -0.5,
        }}
      >
        +50%
      </Text>
      <Text
        style={{
          color: '#e5e3ff',
          fontFamily: 'Epilogue-Bold',
          fontWeight: '900',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: -0.3,
        }}
      >
        XP Weekend
      </Text>
      <Text
        style={{
          color: '#aaa8c3',
          fontFamily: 'BeVietnamPro-Regular',
          fontStyle: 'italic',
          fontSize: 12,
        }}
      >
        Ends in 14h 22m
      </Text>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <Text
          style={{
            color: '#81ecff',
            fontFamily: 'Lexend-Bold',
            fontWeight: '700',
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          View Details
        </Text>
        <FontAwesome name="arrow-right" size={10} color="#81ecff" />
      </Pressable>
    </View>
  );
}

// ─── "Get More Currency" banner ───────────────────────────────────────────────
function GetCurrencyBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 16,
        marginHorizontal: 16,
        backgroundColor: '#17172f',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(206,150,255,0.20)',
        opacity: pressed ? 0.85 : 1,
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: '#ce96ff',
              shadowOpacity: 0.20,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
            }
          : { elevation: 6 }),
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: 'rgba(206,150,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <FontAwesome name="diamond" size={16} color="#ce96ff" />
      </View>
      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <Text
          numberOfLines={1}
          style={{
            color: '#e5e3ff',
            fontFamily: 'Epilogue-Bold',
            fontWeight: '700',
            fontSize: 14,
            marginBottom: 2,
          }}
        >
          Get More Currency
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: '#74738b',
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 11,
            lineHeight: 14,
          }}
        >
          Buy diamonds, lifting &amp; cardio points
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={12} color="#74738b" />
    </Pressable>
  );
}

// ─── Featured tab content ─────────────────────────────────────────────────────
function FeaturedTabContent({
  catalog,
  ownedIds,
  onPurchase,
  purchaseLoading,
  onGetCurrency,
}: {
  catalog: any[];
  ownedIds: Set<string>;
  onPurchase: (item: any) => void;
  purchaseLoading: boolean;
  onGetCurrency: () => void;
}) {
  const featured = catalog.slice(0, 4);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4 }}
    >
      {/* Hero banner */}
      <HeroBanner />

      {/* Item grid */}
      {featured.length > 0 ? (
        <View style={{ gap: 8, marginBottom: 24 }}>
          <Text
            style={{
              color: '#aaa8c3',
              fontFamily: 'Lexend-Bold',
              fontWeight: '700',
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Featured Items
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {featured.map((item, i) => (
              <FeaturedItemCard
                key={item.id}
                item={item}
                index={i}
                owned={ownedIds.has(item.id)}
                onPress={() => onPurchase(item)}
                disabled={purchaseLoading || ownedIds.has(item.id) || !item.price_coins}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Daily Xtreme section */}
      <Text
        style={{
          color: '#aaa8c3',
          fontFamily: 'Lexend-Bold',
          fontWeight: '700',
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Daily Xtreme Boxes
      </Text>
      {DAILY_DEALS.map((deal, i) => (
        <DailyDealCard key={deal.id} deal={deal} index={i} />
      ))}

      {/* Streak + XP weekend */}
      <StreakBonusCard />
      <XPWeekendCard />

      <GetCurrencyBanner onPress={onGetCurrency} />
    </ScrollView>
  );
}

// ─── Cosmetics grid tab ───────────────────────────────────────────────────────
function CosmeticsTabContent({
  catalog,
  isLoading,
  ownedIds,
  onPurchase,
  purchaseLoading,
  accentColor,
}: {
  catalog: any[];
  isLoading: boolean;
  ownedIds: Set<string>;
  onPurchase: (item: any) => void;
  purchaseLoading: boolean;
  accentColor: string;
}) {
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={accentColor} />
      </View>
    );
  }

  return (
    <FlatList
      data={catalog}
      keyExtractor={(item: any) => item.id}
      numColumns={2}
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
      contentContainerStyle={{ paddingBottom: 32, paddingTop: 8, gap: 10 }}
      renderItem={({ item, index }) => (
        <FeaturedItemCard
          item={item}
          index={index}
          owned={ownedIds.has(item.id)}
          onPress={() => onPurchase(item)}
          disabled={purchaseLoading || ownedIds.has(item.id) || !item.price_coins}
        />
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 }}>
          <FontAwesome name="shopping-bag" size={32} color="#46465c" />
          <Text
            style={{
              color: '#74738b',
              fontFamily: 'Epilogue-Bold',
              fontWeight: '700',
              fontSize: 16,
              marginTop: 12,
            }}
          >
            Shop Coming Soon
          </Text>
          <Text
            style={{
              color: '#46465c',
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 12,
              marginTop: 6,
              textAlign: 'center',
            }}
          >
            Cosmetic items will appear here as they are released.
          </Text>
        </View>
      }
    />
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────
export default function ShopScreen() {
  const router    = useRouter();
  const accent    = useAccent();
  const { data: profile }   = useProfile();
  const { data: catalog = [], isLoading } = useCatalog();
  const { data: inventory }  = useMyInventory();
  const purchaseMutation     = usePurchase();

  const [activeTab, setActiveTab] = useState<ShopTab>('featured');
  const [tabKey, setTabKey]       = useState(0);

  // Header entrance
  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide', 280);

  const ownedIds = new Set((inventory ?? []).map((i: any) => i.cosmetic_id));

  function handleTabChange(tab: ShopTab) {
    setActiveTab(tab);
    setTabKey((k) => k + 1);
  }

  function handlePurchase(item: any) {
    if (ownedIds.has(item.id)) {
      Alert.alert('Already Owned', 'You already own this item.');
      return;
    }
    Alert.alert(
      'Buy Item',
      `Purchase "${item.name}" for ${item.price_coins} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => {
            purchaseMutation.mutate(item.id, {
              onError: (err: any) =>
                Alert.alert('Error', err.message ?? 'Purchase failed'),
              onSuccess: () =>
                Alert.alert('Purchased!', `${item.name} added to your inventory.`),
            });
          },
        },
      ]
    );
  }

  function handleGetCurrency() {
    router.push('/(app)/shop/transactions' as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0c1f' }} edges={['top']}>
      {/* ── Header ── */}
      <Animated.View
        style={[
          headerStyle,
          {
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 0,
            backgroundColor: '#0c0c1f',
            // Subtle bottom gradient shadow
            ...(Platform.OS === 'ios'
              ? {
                  shadowColor: '#ce96ff',
                  shadowOpacity: 0.08,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                }
              : {}),
          },
        ]}
      >
        {/* Title row + currencies */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          {/* Screen title */}
          <Text
            style={{
              color: '#e5e3ff',
              fontFamily: 'Epilogue-Bold',
              fontWeight: '900',
              fontSize: 22,
              letterSpacing: -0.5,
              textTransform: 'uppercase',
            }}
          >
            Arena Shop
          </Text>

          {/* Currency pills */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CurrencyPill
              value={profile?.gym_coins ?? 0}
              icon="bolt"
              color="#ffd709"
            />
            <CurrencyPill
              value={profile?.gym_diamonds ?? 0}
              icon="diamond"
              color="#ce96ff"
              onPress={handleGetCurrency}
            />
          </View>
        </View>

        {/* Tab row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
        >
          {SHOP_TABS.map((tab) => (
            <TabPill
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={() => handleTabChange(tab.key)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Tab body ── */}
      <TabContentFade key={tabKey}>
        {activeTab === 'featured' ? (
          <FeaturedTabContent
            catalog={catalog}
            ownedIds={ownedIds}
            onPurchase={handlePurchase}
            purchaseLoading={purchaseMutation.isPending}
            onGetCurrency={handleGetCurrency}
          />
        ) : activeTab === 'cosmetics' ? (
          <CosmeticsTabContent
            catalog={catalog}
            isLoading={isLoading}
            ownedIds={ownedIds}
            onPurchase={handlePurchase}
            purchaseLoading={purchaseMutation.isPending}
            accentColor={accent.DEFAULT}
          />
        ) : activeTab === 'powerups' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          >
            <PowerUpPreview />
          </ScrollView>
        ) : activeTab === 'crates' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          >
            <FeaturedBanner
              itemName="Zenith Protocol"
              rarity="legendary"
              label="SEASONAL EXCLUSIVE"
              price={1500}
              currency="diamonds"
            />
            <CratePreview />
            <GetCurrencyBanner onPress={handleGetCurrency} />
          </ScrollView>
        ) : null}
      </TabContentFade>
    </SafeAreaView>
  );
}
