import { useQuery } from '@tanstack/react-query';
import type { EquippedItem } from '@/lib/character/types';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getBundledEquipmentItemById } from '@/lib/character/equipment-registry';

export function useEquippedCosmetics() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['equipped-cosmetics', session?.user?.id],
    enabled: !!session,
    staleTime: 1000 * 60,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cosmetic_inventory')
        .select('cosmetic_id, equipped')
        .eq('equipped', true);

      if (error) throw error;

      return (data ?? [])
        .map((row: any) => getBundledEquipmentItemById(row.cosmetic_id))
        .filter((item): item is EquippedItem => item !== null);
    },
  });
}
