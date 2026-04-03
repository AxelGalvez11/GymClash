import { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import CratePreview from '@/components/shop/CratePreview';
import PowerUpPreview from '@/components/shop/PowerUpPreview';
import type { CosmeticRarity } from '@/types';

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: '#aaa8c3',
  rare: '#81ecff',
  epic: '#ce96ff',
  legendary: '#ffd709',
};

const RARITY_GLOW: Record<CosmeticRarity, { shadowColor: string; shadowOpacity: number }> = {
  common: { shadowColor: '#aaa8c3', shadowOpacity: 0.15 },
  rare: { shadowColor: '#81ecff', shadowOpacity: 0.3 },
  epic: { shadowColor: '#ce96ff', shadowOpacity: 0.4 },
  legendary: { shadowColor: '#ffd709', shadowOpacity: 0.5 },
};

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
      const { data, error } = await supabase.rpc('purchase_cosmetic', { p_catalog_id: catalogId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

type ShopTab = 'cosmetics' | 'emotes' | 'powerups' | 'crates';

const SHOP_TABS: { key: ShopTab; label: string }[] = [
  { key: 'cosmetics', label: 'Cosmetics' },
  { key: 'emotes', label: 'Emotes' },
  { key: 'powerups', label: 'Power-Ups' },
  { key: 'crates', label: 'Crates' },
];

export default function ShopScreen() {
  const accent = useAccent();
  const { data: profile } = useProfile();
  const { data: catalog, isLoading } = useCatalog();
  const { data: inventory } = useMyInventory();
  const purchaseMutation = usePurchase();
  const [activeTab, setActiveTab] = useState<ShopTab>('cosmetics');

  // Entrance animations
  const fadeHeader = useFadeSlide(0);
  const fadeGrid = useFadeSlide(100);

  const ownedIds = new Set((inventory ?? []).map((i: any) => i.cosmetic_id));

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
              onError: (err: any) => Alert.alert('Error', err.message ?? 'Purchase failed'),
              onSuccess: () => Alert.alert('Purchased!', `${item.name} added to your inventory.`),
            });
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <Animated.View style={fadeHeader.style} className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>Shop</Text>
          <View className="flex-row items-center gap-4">
            {/* Lifting Coins */}
            <View className="flex-row items-center gap-1">
              <FontAwesome name="bolt" size={12} color="#eab308" />
              <Text style={{ color: '#eab308', fontFamily: 'Lexend-Bold', fontWeight: '700', fontSize: 12 }}>
                {profile?.gym_coins ?? 0}
              </Text>
            </View>
            {/* Running Coins */}
            <View className="flex-row items-center gap-1">
              <FontAwesome name="road" size={12} color="#81ecff" />
              <Text style={{ color: '#81ecff', fontFamily: 'Lexend-Bold', fontWeight: '700', fontSize: 12 }}>
                {profile?.gym_coins ?? 0}
              </Text>
            </View>
            {/* Diamonds */}
            <Pressable
              className="flex-row items-center gap-1 bg-[#23233f] rounded-full px-2 py-1 active:scale-[0.98]"
              onPress={() => Alert.alert('Coming Soon', 'Diamond purchases will be available in a future update.')}
            >
              <FontAwesome name="diamond" size={10} color="#ce96ff" />
              <Text style={{ color: '#ce96ff', fontFamily: 'Lexend-Bold', fontWeight: '700', fontSize: 12 }}>0</Text>
              <Text style={{ color: '#74738b', fontSize: 14 }}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {SHOP_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  className={`rounded-full px-4 py-1.5 ${isActive ? 'bg-[#a434ff]' : 'bg-[#23233f]'}`}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={{
                      color: isActive ? '#ffffff' : '#74738b',
                      fontFamily: 'Lexend-Bold',
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      <Animated.View style={fadeGrid.style} className="flex-1">
      {activeTab === 'crates' ? (
        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8 pt-4">
          <CratePreview />
        </ScrollView>
      ) : activeTab === 'powerups' ? (
        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8 pt-4">
          <PowerUpPreview />
        </ScrollView>
      ) : activeTab === 'emotes' ? (
        <View className="flex-1 items-center justify-center px-4">
          <FontAwesome name="comment" size={32} color="#74738b" />
          <Text className="text-lg mt-3" style={{ color: '#74738b', fontFamily: 'Epilogue-Bold' }}>
            Emotes Coming Soon
          </Text>
          <Text className="text-sm mt-1 text-center" style={{ color: '#74738b' }}>
            Text emotes for clan chat and war chat
          </Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={accent.DEFAULT} className="mt-8" />
      ) : (
        <FlatList
          data={catalog ?? []}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          columnWrapperClassName="gap-2 px-4"
          contentContainerClassName="pb-8 gap-2"
          renderItem={({ item }) => {
            const owned = ownedIds.has(item.id);
            const rarityColor = RARITY_COLORS[item.rarity as CosmeticRarity] ?? '#74738b';
            const glow = RARITY_GLOW[item.rarity as CosmeticRarity] ?? RARITY_GLOW.common;

            return (
              <Pressable
                className="flex-1 bg-[#1d1d37] rounded-xl p-3 active:scale-[0.98]"
                style={{
                  shadowColor: glow.shadowColor,
                  shadowOpacity: glow.shadowOpacity,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                }}
                onPress={() => !owned && item.price_coins && handlePurchase(item)}
                disabled={!profile || owned || !item.price_coins}
              >
                <View className="items-center mb-2">
                  <View className="w-16 h-16 bg-[#23233f] rounded-lg items-center justify-center">
                    <FontAwesome name="gift" size={24} color={rarityColor} />
                  </View>
                </View>
                <Text
                  className="text-sm text-center"
                  style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}
                >
                  {item.name}
                </Text>
                <Text className="text-xs text-center capitalize mt-0.5" style={{ color: rarityColor }}>
                  {item.rarity}
                </Text>
                {owned ? (
                  <View className="bg-success/20 rounded-full px-2 py-0.5 mt-2 items-center">
                    <Text className="text-success text-xs font-bold">Owned</Text>
                  </View>
                ) : item.price_coins ? (
                  <View className="flex-row items-center justify-center gap-1 mt-2">
                    <FontAwesome name="circle" size={8} color="#ffd709" />
                    <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-Bold', fontWeight: '700', fontSize: 12 }}>
                      {item.price_coins}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-xs text-center mt-2" style={{ color: '#74738b' }}>Crate only</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-12 px-4">
              <FontAwesome name="shopping-bag" size={32} color="#74738b" />
              <Text className="text-lg mt-3" style={{ color: '#74738b' }}>Shop coming soon</Text>
              <Text className="text-sm mt-1 text-center" style={{ color: '#74738b' }}>
                Cosmetic items will appear here as they are released
              </Text>
            </View>
          }
        />
      )}
      </Animated.View>
    </SafeAreaView>
  );
}
