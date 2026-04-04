import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';

import { Colors, Rank, Arena, getArenaTier } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useMy1RMRecords } from '@/hooks/use-1rm';
import { CharacterDisplay } from '@/components/ui/CharacterDisplay';
import { useAccent } from '@/stores/accent-store';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import { usePlayerType } from '@/hooks/use-player-type';
import { PlayerTypeBadge } from '@/components/PlayerTypeBadge';
import { MuscleHeatmapCard } from '@/components/profile/MuscleHeatmapCard';
import type { Rank as RankType, ArenaTier } from '@/types';

// ─── Victory Peak palette ───────────────────────────────
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

const chromaticShadow = {
  shadowColor: VP.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  shadowOpacity: 0.15,
  elevation: 8,
} as const;

type AccountTier = 'unverified' | 'verified' | 'ranked_eligible';

function computeAccountTier(profile: any, workoutCount: number): AccountTier {
  const hasBiodata = profile?.body_weight_kg && profile?.height_cm && profile?.birth_date && profile?.biological_sex;
  if (!hasBiodata) return 'unverified';

  // Ranked-eligible: verified + 10 workouts + account age >= 14 days
  const accountAge = profile?.created_at
    ? (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  if (workoutCount >= 10 && accountAge >= 14) return 'ranked_eligible';

  return 'verified';
}

const TIER_CONFIG: Record<AccountTier, { label: string; color: string; icon: React.ComponentProps<typeof FontAwesome>['name'] }> = {
  unverified: { label: 'Unverified', color: VP.textMuted, icon: 'circle-o' },
  verified: { label: 'Verified', color: Colors.success, icon: 'check-circle' },
  ranked_eligible: { label: 'Ranked', color: VP.gold, icon: 'star' },
};

function useActiveSeason() {
  return useQuery({
    queryKey: ['active-season'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('status', 'active')
        .single();
      return data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: season } = useActiveSeason();
  const { data: records } = useMy1RMRecords();
  const { data: workouts } = useMyWorkouts(100);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const accent = useAccent();
  const { playerType } = usePlayerType();
  const accountTier = computeAccountTier(profile, workouts?.length ?? 0);
  const tierConfig = TIER_CONFIG[accountTier];

  const rankKey = (profile?.rank ?? 'rookie') as RankType;
  const rankConfig = Rank[rankKey] ?? Rank.rookie;
  const nextRank = Object.values(Rank).find((r) => r.minXp > (profile?.xp ?? 0));
  const trophies = profile?.trophy_rating ?? 0;
  const arenaTier: ArenaTier = (profile?.arena_tier as ArenaTier) ?? getArenaTier(trophies);
  const arenaConfig = Arena[arenaTier] ?? Arena.rustyard;

  // Entrance animations
  const fadeHeader = useFadeSlide(0);
  const fadeStats = useFadeSlide(100);
  const fadeDiagrams = useFadeSlide(200);
  const fadeRecords = useFadeSlide(300);
  const fadeLinks = useFadeSlide(400);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color={accent.DEFAULT} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-8">
        {/* Settings gear */}
        <Pressable
          className="absolute right-4 top-4 z-10"
          onPress={() => router.push('/(app)/settings' as any)}
          hitSlop={10}
        >
          <FontAwesome name="cog" size={18} color={VP.textMuted} />
        </Pressable>

        {/* Profile Header */}
        <Animated.View style={fadeHeader.style} className="items-center mb-6">
          {/* Character avatar with glow ring */}
          <View
            className="mb-3"
            style={{
              borderWidth: 2.5,
              borderColor: '#a434ff',
              borderRadius: 999,
              padding: 4,
              shadowColor: '#a434ff',
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 25,
              shadowOpacity: 0.6,
              elevation: 15,
            }}
          >
            <CharacterDisplay
              level={profile?.level ?? 1}
              strengthCount={profile?.strength_workout_count ?? 0}
              scoutCount={profile?.scout_workout_count ?? 0}
              playerType={playerType}
              size="lg"
            />
          </View>
          <Text className="text-2xl font-bold" style={{ color: VP.textPri }}>
            {profile?.display_name || 'Warrior'}
          </Text>
          {/* Rank display — Victory Gold with text shadow */}
          <Text
            className="text-lg font-bold mt-1"
            style={{
              color: VP.gold,
              textShadowColor: 'rgba(255, 215, 9, 0.4)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 8,
              fontFamily: 'Epilogue-Bold',
            }}
          >
            {rankConfig.label} — Level {profile?.level ?? 1}
          </Text>
          {/* Player type */}
          <View className="mt-2">
            <PlayerTypeBadge playerType={playerType} size="md" />
          </View>
          {/* Arena badge */}
          <View className="flex-row items-center gap-2 mt-2">
            <Text className="text-lg">{arenaConfig.badge}</Text>
            <Text className="font-bold" style={{ color: arenaConfig.accent, fontFamily: 'Lexend-SemiBold' }}>
              {arenaConfig.label}
            </Text>
            <Text style={{ color: VP.textSec }}>· {trophies} 🏆</Text>
          </View>
          {/* Account tier badge */}
          <Pressable
            className="flex-row items-center gap-1.5 mt-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: tierConfig.color + '15' }}
            onPress={accountTier === 'unverified'
              ? () => router.push('/(app)/settings/biodata')
              : undefined}
          >
            <FontAwesome name={tierConfig.icon} size={12} color={tierConfig.color} />
            <Text className="text-xs font-bold" style={{ color: tierConfig.color, fontFamily: 'Lexend-SemiBold' }}>
              {tierConfig.label}
            </Text>
            {accountTier === 'unverified' && (
              <Text className="text-xs" style={{ color: VP.textMuted }}> — Complete biodata</Text>
            )}
          </Pressable>
        </Animated.View>

        {/* XP Progress */}
        <Animated.View style={fadeStats.style}>
        {/* XP Progress */}
        <View className="w-full px-4 mt-4 mb-4">
          <View className="flex-row justify-between mb-1">
            <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>XP Progress</Text>
            <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
              {profile?.xp ?? 0} / {nextRank?.minXp ?? 1000}
            </Text>
          </View>
          <View className="h-3 rounded-full bg-[#23233f] overflow-hidden">
            <View className="h-3 rounded-full" style={{
              width: `${Math.min(((profile?.xp ?? 0) / (nextRank?.minXp ?? 1000)) * 100, 100)}%`,
              backgroundColor: '#f97316',
            }} />
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View className="bg-[#1d1d37] rounded-2xl p-4 flex-1 items-center" style={{ borderWidth: 1, borderColor: 'rgba(164,52,255,0.3)' }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: VP.textSec, textTransform: 'uppercase', marginBottom: 4 }}>Streak</Text>
            <Text className="text-2xl font-bold" style={{ color: '#ffffff' }}>{profile?.current_streak ?? 0}</Text>
          </View>
          <View className="bg-[#1d1d37] rounded-2xl p-4 flex-1 items-center" style={{ borderWidth: 1, borderColor: 'rgba(164,52,255,0.3)' }}>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: VP.textSec, textTransform: 'uppercase', marginBottom: 4 }}>Best</Text>
            <Text className="text-2xl font-bold" style={{ color: '#ffffff' }}>{profile?.longest_streak ?? 0}</Text>
          </View>
        </View>
        </Animated.View>

        {/* Performance Radar + Muscle Heatmap */}
        <Animated.View style={fadeDiagrams.style}>
          {/* Performance Radar */}
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 12 }}>Performance Profile</Text>
            <View className="items-center">
              {(() => {
                const dims = [
                  { label: 'Strength', value: Math.min((profile?.strength_workout_count ?? 0) / 50, 1) },
                  { label: 'Cardio', value: Math.min((profile?.scout_workout_count ?? 0) / 50, 1) },
                  { label: 'Consistency', value: Math.min((profile?.current_streak ?? 0) / 30, 1) },
                  { label: 'Volume', value: Math.min((profile?.xp ?? 0) / 5000, 1) },
                  { label: 'Trophy', value: Math.min((profile?.trophy_rating ?? 0) / 1200, 1) },
                  { label: 'Level', value: Math.min((profile?.level ?? 1) / 50, 1) },
                ];
                const size = 140;
                const center = size;
                const levels = [0.25, 0.5, 0.75, 1.0];
                const angleStep = (2 * Math.PI) / dims.length;

                function polarToXY(angle: number, radius: number) {
                  return {
                    x: center + radius * Math.cos(angle - Math.PI / 2),
                    y: center + radius * Math.sin(angle - Math.PI / 2),
                  };
                }

                return (
                  <View style={{ width: size * 2, height: size * 2 }}>
                    {/* Background rings */}
                    {levels.map((level) => (
                      <View
                        key={level}
                        style={{
                          position: 'absolute',
                          left: center - size * level,
                          top: center - size * level,
                          width: size * level * 2,
                          height: size * level * 2,
                          borderRadius: size * level,
                          borderWidth: 1,
                          borderColor: 'rgba(206,150,255,0.1)',
                        }}
                      />
                    ))}
                    {/* Axis lines + labels */}
                    {dims.map((dim, i) => {
                      const angle = i * angleStep;
                      const labelPos = polarToXY(angle, size + 20);
                      return (
                        <View key={dim.label}>
                          <View
                            style={{
                              position: 'absolute',
                              left: center,
                              top: center,
                              width: 1,
                              height: size,
                              backgroundColor: 'rgba(206,150,255,0.1)',
                              transformOrigin: 'top',
                              transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
                            }}
                          />
                          <Text
                            style={{
                              position: 'absolute',
                              left: labelPos.x - 30,
                              top: labelPos.y - 8,
                              width: 60,
                              textAlign: 'center',
                              color: VP.textMuted,
                              fontFamily: 'Lexend-SemiBold',
                              fontSize: 8,
                            }}
                          >
                            {dim.label}
                          </Text>
                        </View>
                      );
                    })}
                    {/* Data points */}
                    {dims.map((dim, i) => {
                      const angle = i * angleStep;
                      const pos = polarToXY(angle, size * dim.value);
                      return (
                        <View
                          key={`dot-${dim.label}`}
                          style={{
                            position: 'absolute',
                            left: pos.x - 4,
                            top: pos.y - 4,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#ce96ff',
                            shadowColor: '#ce96ff',
                            shadowOpacity: 0.6,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 0 },
                          }}
                        />
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Muscle Heatmap */}
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 12 }}>Muscle Heatmap</Text>
            <MuscleHeatmapCard
              workouts={workouts ?? []}
              bodyWeightKg={profile?.body_weight_kg ?? null}
            />
          </View>
        </Animated.View>

        {/* 1RM Records */}
        <Animated.View style={fadeRecords.style}>
        {records && records.length > 0 && (
          <View className="mb-4">
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 18, color: VP.textPri, fontWeight: 'bold', marginBottom: 12 }}>Personal Records</Text>
            <View className="gap-2">
              {records.slice(0, 5).map((r: any) => (
                <View
                  key={r.id}
                  className="bg-[#1d1d37] rounded-2xl p-3 flex-row items-center"
                  style={chromaticShadow}
                >
                  <FontAwesome name="trophy" size={14} color={VP.gold} />
                  <Text className="font-bold ml-3 flex-1" style={{ color: VP.textPri }}>{r.exercise}</Text>
                  <Text className="font-bold" style={{ color: '#ffffff' }}>{Math.round(r.best_estimated_1rm)} kg</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        </Animated.View>

        {/* Season */}
        {season && (
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-bold" style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold' }}>{season.name}</Text>
              <Text className="text-sm font-bold" style={{ color: VP.textPri }}>Season {season.number}</Text>
            </View>
            <Text className="text-xs" style={{ color: VP.textMuted }}>
              {Math.max(0, Math.ceil((new Date(season.ended_at).getTime() - Date.now()) / 86400000))} days left
            </Text>
          </View>
        )}

        {/* Cardio Stats */}
        {(profile?.max_heart_rate || profile?.estimated_vo2max) && (
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <Text className="font-bold mb-2" style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold' }}>Cardio Profile</Text>
            {profile?.max_heart_rate && (
              <View className="flex-row justify-between py-1">
                <Text style={{ color: VP.textSec }}>Max Heart Rate</Text>
                <Text className="font-bold" style={{ color: '#ffffff' }}>{profile.max_heart_rate} bpm</Text>
              </View>
            )}
            {profile?.estimated_vo2max && (
              <View className="flex-row justify-between py-1">
                <Text style={{ color: VP.textSec }}>Est. VO2max</Text>
                <Text className="font-bold" style={{ color: '#ffffff' }}>{Math.round(profile.estimated_vo2max * 10) / 10} ml/kg/min</Text>
              </View>
            )}
          </View>
        )}

        {/* Workout Calendar */}
        <Animated.View style={fadeRecords.style}>
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <Text className="font-bold mb-3" style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <View className="flex-row flex-wrap">
              {/* Day headers */}
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <View key={`h-${i}`} className="items-center justify-center" style={{ width: '14.28%', paddingVertical: 4 }}>
                  <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>{d}</Text>
                </View>
              ))}
              {/* Calendar days */}
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDay = new Date(year, month, 1).getDay();
                const workoutDates = new Set(
                  (workouts ?? []).map((w: any) => {
                    const d = new Date(w.started_at);
                    if (d.getMonth() === month && d.getFullYear() === year) return d.getDate();
                    return -1;
                  }).filter((d: number) => d > 0)
                );
                const today = now.getDate();
                const cells = [];
                // Empty cells for padding
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<View key={`e-${i}`} style={{ width: '14.28%', paddingVertical: 4 }} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const hasWorkout = workoutDates.has(day);
                  const isToday = day === today;
                  const isSelected = day === selectedDay;
                  const dayContent = (
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={[
                        isToday ? { borderWidth: 1.5, borderColor: VP.primary } : undefined,
                        isSelected ? { backgroundColor: VP.primary + '30' } : undefined,
                      ].filter(Boolean).reduce((acc, s) => ({ ...acc, ...s }), {})}
                    >
                      <Text style={{
                        color: hasWorkout ? '#fff' : VP.textMuted,
                        fontFamily: 'Lexend-SemiBold',
                        fontSize: 12,
                      }}>{day}</Text>
                      {hasWorkout && (
                        <View className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: VP.primary }} />
                      )}
                    </View>
                  );
                  cells.push(
                    hasWorkout ? (
                      <Pressable
                        key={day}
                        className="items-center justify-center"
                        style={{ width: '14.28%', paddingVertical: 3 }}
                        onPress={() => setSelectedDay(day)}
                      >
                        {dayContent}
                      </Pressable>
                    ) : (
                      <View key={day} className="items-center justify-center" style={{ width: '14.28%', paddingVertical: 3 }}>
                        {dayContent}
                      </View>
                    )
                  );
                }
                return cells;
              })()}
            </View>
          </View>
          {selectedDay !== null && (
            <View className="bg-[#23233f] rounded-xl p-4 mt-3 mb-2">
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14 }}>
                  {new Date().toLocaleDateString('en-US', { month: 'short' })} {selectedDay}
                </Text>
                <Pressable onPress={() => setSelectedDay(null)}>
                  <FontAwesome name="times" size={14} color="#74738b" />
                </Pressable>
              </View>
              {(workouts ?? [])
                .filter((w: any) => {
                  const d = new Date(w.started_at);
                  return d.getDate() === selectedDay && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                })
                .map((w: any) => (
                  <Pressable
                    key={w.id}
                    className="bg-[#1d1d37] rounded-lg p-3 mb-1 flex-row items-center active:scale-[0.98]"
                    onPress={() => {
                      setSelectedDay(null);
                      router.push(`/(app)/workout/${w.id}` as any);
                    }}
                  >
                    <FontAwesome
                      name={w.type === 'strength' ? 'heartbeat' : 'road'}
                      size={14}
                      color={w.type === 'strength' ? '#ef4444' : '#81ecff'}
                    />
                    <Text className="ml-2 flex-1" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 13 }}>
                      {w.type === 'strength' ? 'Strength' : 'Cardio'} — {Math.round(w.final_score ?? w.raw_score ?? 0)} pts
                    </Text>
                    <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>
                      {new Date(w.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Pressable>
                ))}
              {(workouts ?? []).filter((w: any) => {
                const d = new Date(w.started_at);
                return d.getDate() === selectedDay && d.getMonth() === new Date().getMonth();
              }).length === 0 && (
                <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>No workouts found for this day</Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* Quick Links */}
        <Animated.View style={fadeLinks.style} className="gap-2 mb-6">
          <Pressable
            className="bg-[#1d1d37] rounded-2xl p-4 flex-row items-center active:scale-[0.98]"
            style={chromaticShadow}
            onPress={() => router.push('/(app)/history')}
          >
            <FontAwesome name="history" size={18} color={VP.textSec} />
            <Text className="font-bold ml-3 flex-1" style={{ color: VP.textPri }}>Workout History</Text>
            <FontAwesome name="chevron-right" size={14} color={VP.textMuted} />
          </Pressable>
          <Pressable
            className="bg-[#1d1d37] rounded-2xl p-4 flex-row items-center active:scale-[0.98]"
            style={chromaticShadow}
            onPress={() => router.push('/(app)/shop' as any)}
          >
            <FontAwesome name="shopping-bag" size={18} color={VP.gold} />
            <Text className="font-bold ml-3 flex-1" style={{ color: VP.textPri }}>Shop</Text>
            <View className="flex-row items-center gap-1 mr-2">
              <FontAwesome name="circle" size={8} color={VP.gold} />
              <Text className="text-xs font-bold" style={{ color: '#ffffff' }}>{profile?.gym_coins ?? 0}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={VP.textMuted} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
