import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useShimmer } from '@/hooks/use-shimmer';
import type { ValidationStatus, WorkoutType } from '@/types';

type Filter = 'all' | 'strength' | 'scout';

const STATUS_COLORS: Record<string, string> = {
  accepted: Colors.success,
  accepted_with_low_confidence: Colors.warning,
  held_for_review: Colors.warning,
  excluded_from_clan_score: Colors.danger,
  rejected: Colors.danger,
  validated: Colors.success,
  submitted: Colors.info,
  draft: '#74738b',
};

function SkeletonCard({ index }: { readonly index: number }) {
  const { animatedStyle } = useEntrance(index * 80, 'fade-slide');
  const { shimmerStyle } = useShimmer(300);

  return (
    <Animated.View
      style={[animatedStyle, { overflow: 'hidden' }]}
      className="bg-[#1d1d37] rounded-xl p-4 mb-2 h-24"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="bg-[#23233f] rounded-full w-24 h-4" />
        <View className="bg-[#23233f] rounded-full w-16 h-3" />
      </View>
      <View className="flex-row items-center justify-between">
        <View className="bg-[#23233f] rounded-full w-32 h-3" />
        <View className="bg-[#23233f] rounded-full w-12 h-6" />
      </View>
      <Animated.View
        style={[
          shimmerStyle,
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(206,150,255,0.06)',
          },
        ]}
      />
    </Animated.View>
  );
}

function WorkoutCard({ item, onPress }: { readonly item: any; readonly onPress: () => void }) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  const status = item.validation_status ?? item.status;
  const statusColor = STATUS_COLORS[status] ?? '#74738b';
  const isFlagged = ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(status);
  const rawDate = item.created_at ? new Date(item.created_at) : null;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className="bg-[#1d1d37] rounded-xl p-4 mb-2"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <FontAwesome
              name={item.type === 'strength' ? 'heartbeat' : item.type === 'scout' ? 'road' : 'leaf'}
              size={16}
              color={item.type === 'strength' ? Colors.danger : item.type === 'scout' ? '#81ecff' : Colors.success}
            />
            <Text className="capitalize" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}>
              {item.type === 'active_recovery' ? 'Recovery' : item.type}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
            <Text className="text-xs capitalize" style={{ color: statusColor, fontFamily: 'BeVietnamPro-Regular' }}>
              {status?.replace(/_/g, ' ') ?? 'pending'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
            {rawDate ? rawDate.toLocaleDateString() : 'Unknown date'} -- {Math.round((item.duration_seconds ?? 0) / 60)} min
          </Text>
          <View className="items-end">
            {item.final_score != null ? (
              <Text className="text-lg" style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontWeight: '700' }}>
                {Math.round(item.final_score)}
              </Text>
            ) : item.raw_score != null ? (
              <Text className="text-lg" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>
                ~{Math.round(item.raw_score)}
              </Text>
            ) : (
              <Text className="text-lg" style={{ color: '#74738b' }}>--</Text>
            )}
          </View>
        </View>

        {isFlagged && (
          <View className="mt-2 flex-row items-center gap-1">
            <FontAwesome name="exclamation-triangle" size={12} color={Colors.warning} />
            <Text className="text-warning text-xs" style={{ fontFamily: 'BeVietnamPro-Regular' }}>Tap to review or appeal</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const { data: workouts, isLoading, refetch } = useMyWorkouts(50);

  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: tabsStyle } = useEntrance(60, 'spring-up');
  const { animatedStyle: listStyle } = useEntrance(120, 'fade-slide');

  const filtered = (workouts ?? []).filter((w: any) => {
    if (filter === 'all') return true;
    return w.type === filter;
  });

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      {/* Header */}
      <Animated.View style={headerStyle} className="px-4 pt-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => router.replace('/(app)/profile' as any)}>
            <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} Back</Text>
          </Pressable>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>Workout History</Text>
          <View className="w-12" />
        </View>

        {/* Filter tabs */}
        <Animated.View style={tabsStyle} className="flex-row gap-2">
          {([
            { key: 'all' as Filter, label: 'All' },
            { key: 'strength' as Filter, label: 'Strength' },
            { key: 'scout' as Filter, label: 'Running' },
          ]).map(({ key, label }) => (
            <Pressable
              key={key}
              className="px-4 py-2 rounded-full"
              style={
                filter === key
                  ? { backgroundColor: '#ce96ff' }
                  : { backgroundColor: '#1d1d37' }
              }
              onPress={() => setFilter(key)}
            >
              <Text
                style={{
                  color: filter === key ? '#0c0c1f' : '#aaa8c3',
                  fontFamily: 'Lexend-SemiBold',
                  fontWeight: '700',
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </Animated.View>

      {/* List */}
      <Animated.View style={listStyle} className="flex-1">
      {isLoading ? (
        <View className="px-4 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
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
              <Text className="text-lg" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>No workouts yet</Text>
              <Text className="text-sm mt-1" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>Start training to see your history</Text>
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
