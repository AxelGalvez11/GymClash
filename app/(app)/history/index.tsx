import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import type { ValidationStatus, WorkoutType } from '@/types';

type Filter = 'all' | 'strength' | 'scout' | 'active_recovery';

const STATUS_COLORS: Record<string, string> = {
  accepted: Colors.success,
  accepted_with_low_confidence: Colors.warning,
  held_for_review: Colors.warning,
  excluded_from_clan_score: Colors.danger,
  rejected: Colors.danger,
  validated: Colors.success,
  submitted: Colors.info,
  draft: Colors.text.muted,
};

function WorkoutCard({ item, onPress }: { item: any; onPress: () => void }) {
  const status = item.validation_status ?? item.status;
  const statusColor = STATUS_COLORS[status] ?? Colors.text.muted;
  const isFlagged = ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(status);
  const date = new Date(item.created_at);

  return (
    <Pressable
      className="bg-surface-raised border border-surface-border rounded-xl p-4 mb-2"
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <FontAwesome
            name={item.type === 'strength' ? 'heartbeat' : item.type === 'scout' ? 'road' : 'leaf'}
            size={16}
            color={item.type === 'strength' ? Colors.danger : item.type === 'scout' ? Colors.info : Colors.success}
          />
          <Text className="text-white font-bold capitalize">
            {item.type === 'active_recovery' ? 'Recovery' : item.type}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="text-xs capitalize" style={{ color: statusColor }}>
            {status?.replace(/_/g, ' ') ?? 'pending'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-text-muted text-sm">
          {date.toLocaleDateString()} · {Math.round((item.duration_seconds ?? 0) / 60)} min
        </Text>
        <View className="items-end">
          {item.final_score != null ? (
            <Text className="text-white text-lg font-bold">
              {Math.round(item.final_score)}
            </Text>
          ) : item.raw_score != null ? (
            <Text className="text-white/50 text-lg">
              ~{Math.round(item.raw_score)}
            </Text>
          ) : (
            <Text className="text-text-muted text-lg">—</Text>
          )}
        </View>
      </View>

      {isFlagged && (
        <View className="mt-2 flex-row items-center gap-1">
          <FontAwesome name="exclamation-triangle" size={12} color={Colors.warning} />
          <Text className="text-warning text-xs">Tap to review or appeal</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const { data: workouts, isLoading, refetch } = useMyWorkouts(50);

  // Entrance animations
  const fadeHeader = useFadeSlide(0);
  const fadeList = useFadeSlide(100);

  const filtered = (workouts ?? []).filter((w: any) => {
    if (filter === 'all') return true;
    return w.type === filter;
  });

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Header */}
      <Animated.View style={fadeHeader.style} className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.back()}>
            <Text className="text-white/60 text-base">← Back</Text>
          </Pressable>
          <Text className="text-white text-lg font-bold">Workout History</Text>
          <View className="w-12" />
        </View>

        {/* Filter tabs */}
        <View className="flex-row gap-2">
          {([
            { key: 'all' as Filter, label: 'All' },
            { key: 'strength' as Filter, label: 'Strength' },
            { key: 'scout' as Filter, label: 'Running' },
            { key: 'active_recovery' as Filter, label: 'Recovery' },
          ]).map(({ key, label }) => (
            <Pressable
              key={key}
              className={`px-4 py-2 rounded-full ${
                filter === key ? 'bg-white' : 'bg-surface-raised border border-surface-border'
              }`}
              onPress={() => setFilter(key)}
            >
              <Text className={filter === key ? 'text-black font-bold' : 'text-white/50'}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* List */}
      <Animated.View style={fadeList.style} className="flex-1">
      {isLoading ? (
        <ActivityIndicator color={Colors.text.primary} className="mt-8" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerClassName="px-4 pb-8"
          renderItem={({ item }) => (
            <WorkoutCard
              item={item}
              onPress={() => {
                const status = item.validation_status ?? item.status;
                const isFlagged = ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(status);
                if (isFlagged) {
                  router.push(`/(app)/review/${item.id}`);
                } else {
                  router.push(`/(app)/workout/${item.id}`);
                }
              }}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-text-muted text-lg">No workouts yet</Text>
              <Text className="text-text-muted text-sm mt-1">Start training to see your history</Text>
            </View>
          }
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
      </Animated.View>
    </SafeAreaView>
  );
}
