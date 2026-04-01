import { View, Text, FlatList, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import type { CosmeticRarity } from '@/types';

const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: Colors.text.secondary,
  rare: Colors.info,
  epic: Colors.brand.DEFAULT,
  legendary: Colors.warning,
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

export default function ShopScreen() {
  const { data: profile } = useProfile();
  const { data: catalog, isLoading } = useCatalog();
  const { data: inventory } = useMyInventory();
  const purchaseMutation = usePurchase();

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
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-bold">Shop</Text>
          <View className="flex-row items-center gap-1">
            <FontAwesome name="circle" size={10} color={Colors.warning} />
            <Text className="text-white font-bold">{profile?.gym_coins ?? 0}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.brand.DEFAULT} className="mt-8" />
      ) : (
        <FlatList
          data={catalog ?? []}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          columnWrapperClassName="gap-2 px-4"
          contentContainerClassName="pb-8 gap-2"
          renderItem={({ item }) => {
            const owned = ownedIds.has(item.id);
            const rarityColor = RARITY_COLORS[item.rarity as CosmeticRarity] ?? Colors.text.muted;

            return (
              <Pressable
                className="flex-1 bg-surface-raised border rounded-xl p-3 active:opacity-80"
                style={{ borderColor: rarityColor + '40' }}
                onPress={() => !owned && item.price_coins && handlePurchase(item)}
                disabled={owned || !item.price_coins}
              >
                <View className="items-center mb-2">
                  <View className="w-16 h-16 bg-surface-overlay rounded-lg items-center justify-center">
                    <FontAwesome name="gift" size={24} color={rarityColor} />
                  </View>
                </View>
                <Text className="text-white font-bold text-sm text-center">{item.name}</Text>
                <Text className="text-xs text-center capitalize mt-0.5" style={{ color: rarityColor }}>
                  {item.rarity}
                </Text>
                {owned ? (
                  <View className="bg-success/20 rounded-full px-2 py-0.5 mt-2 items-center">
                    <Text className="text-success text-xs font-bold">Owned</Text>
                  </View>
                ) : item.price_coins ? (
                  <View className="flex-row items-center justify-center gap-1 mt-2">
                    <FontAwesome name="circle" size={8} color={Colors.warning} />
                    <Text className="text-white text-xs font-bold">{item.price_coins}</Text>
                  </View>
                ) : (
                  <Text className="text-text-muted text-xs text-center mt-2">Crate only</Text>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-12 px-4">
              <FontAwesome name="shopping-bag" size={32} color={Colors.text.muted} />
              <Text className="text-text-muted text-lg mt-3">Shop coming soon</Text>
              <Text className="text-text-muted text-sm mt-1 text-center">
                Cosmetic items will appear here as they are released
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
