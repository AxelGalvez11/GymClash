import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useProfile } from '@/hooks/use-profile';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { useMy1RMRecords } from '@/hooks/use-1rm';
import { MuscleHeatmapCard } from '@/components/profile/MuscleHeatmapCard';
import WeeklyVolumeChart from '@/components/profile/WeeklyVolumeChart';
import { OneRMBenchmarkBars } from '@/components/profile/OneRMBenchmarkBars';

import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { Colors, Spacing, Radius } from '@/constants/theme';

// ─── Victory Peak palette — pulls from theme ────────────
const VP = {
  surface:    Colors.surface.DEFAULT,
  raised:     Colors.surface.container,
  active:     Colors.surface.containerHigh,
  highest:    Colors.surface.containerHighest,
  textPri:    Colors.text.primary,
  textSec:    Colors.text.secondary,
  textMuted:  Colors.text.muted,
  primary:    Colors.primary.DEFAULT,
  primaryDim: Colors.primary.dim,
  gold:       Colors.secondary.DEFAULT,
  cyan:       Colors.tertiary.DEFAULT,
} as const;

const chromaticShadow = {
  shadowColor: VP.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  shadowOpacity: 0.15,
  elevation: 8,
} as const;

type StatsTab = 'lifts' | 'cardio';

export default function ProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const { data: records } = useMy1RMRecords();
  const { data: workouts } = useMyWorkouts(100);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [statsTab, setStatsTab] = useState<StatsTab>('lifts');

  // Filter workouts by tab
  const filteredWorkouts = (workouts ?? []).filter((w: any) => {
    if (statsTab === 'lifts') return w.type === 'strength';
    return w.type === 'scout' || w.type === 'hiit';
  });

  // ── Entrance animations ────────────────────────────────────────────────────
  const radarEntrance = useEntrance(0, 'fade-slide', 280);
  const heatmapEntrance = useEntrance(100, 'fade-slide', 280);
  const recordsEntrance = useEntrance(200, 'fade-slide', 280);
  const calendarEntrance = useEntrance(300, 'fade-slide', 280);
  const linksEntrance = useEntrance(400, 'spring-up');

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color={VP.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerClassName="pb-8">

        {/* Stats title + Level/XP bar */}
        <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 22, color: '#e5e3ff', marginBottom: 4 }}>
          {profile?.display_name ?? 'Warrior'}&apos;s Stats
        </Text>
        <View
          style={{
            backgroundColor: VP.raised,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: 'rgba(70,70,92,0.35)',
            ...chromaticShadow,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text
              style={{
                fontFamily: 'Epilogue-Bold',
                fontSize: 16,
                color: VP.primary,
                fontStyle: 'italic',
                letterSpacing: 0.5,
              }}
            >
              LEVEL {profile?.level ?? 1}
            </Text>
            <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 11, color: VP.textMuted }}>
              {profile?.xp ?? 0} / {((profile?.level ?? 1) * 100) + 100} XP
            </Text>
          </View>
          <View style={{ height: 10, backgroundColor: VP.surface, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(70,70,92,0.2)' }}>
            <View
              style={{
                height: '100%',
                width: `${Math.min(((profile?.xp ?? 0) / (((profile?.level ?? 1) * 100) + 100)) * 100, 100)}%`,
                backgroundColor: VP.primary,
                borderRadius: 5,
              }}
            />
          </View>
        </View>

        {/* ─── Lifts / Cardio Segmented Toggle ──────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: VP.raised,
            borderRadius: Radius.pill,
            padding: 4,
            marginBottom: Spacing.lg,
            borderWidth: 1,
            borderColor: 'rgba(206,150,255,0.15)',
          }}
        >
          {(['lifts', 'cardio'] as const).map((tab) => {
            const isActive = statsTab === tab;
            const tabColor = tab === 'lifts' ? VP.primary : VP.cyan;
            return (
              <Pressable
                key={tab}
                onPress={() => setStatsTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: Radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  backgroundColor: isActive ? tabColor : 'transparent',
                  ...(isActive && {
                    shadowColor: tabColor,
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 6,
                  }),
                }}
              >
                <FontAwesome
                  name={tab === 'lifts' ? 'trophy' : 'heartbeat'}
                  size={13}
                  color={isActive ? '#0c0c1f' : VP.textMuted}
                />
                <Text
                  style={{
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 13,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: isActive ? '#0c0c1f' : VP.textMuted,
                  }}
                >
                  {tab === 'lifts' ? 'Lifts' : 'Cardio'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Performance Radar */}
        <Animated.View style={radarEntrance.animatedStyle}>
          <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 12 }}>Performance Profile</Text>
            <View className="items-center">
              {(() => {
                const dims = [
                  { label: 'Legs', value: Math.min((profile?.strength_workout_count ?? 0) * 0.4 / 25, 1) },
                  { label: 'Arms', value: Math.min((profile?.strength_workout_count ?? 0) * 0.3 / 25, 1) },
                  { label: 'Chest', value: Math.min((profile?.strength_workout_count ?? 0) * 0.2 / 20, 1) },
                  { label: 'Back', value: Math.min((profile?.strength_workout_count ?? 0) * 0.25 / 20, 1) },
                  { label: 'Cardio', value: Math.min((profile?.scout_workout_count ?? 0) / 30, 1) },
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
        </Animated.View>

        {/* Muscle Heatmap — only on Lifts tab */}
        {statsTab === 'lifts' && (
          <Animated.View style={heatmapEntrance.animatedStyle}>
            <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 12 }}>Muscle Heatmap</Text>
              <MuscleHeatmapCard
                workouts={filteredWorkouts}
                bodyWeightKg={profile?.body_weight_kg ?? null}
                biologicalSex={profile?.biological_sex ?? null}
              />
            </View>
          </Animated.View>
        )}

        {/* Weekly Volume Chart — both tabs, filtered */}
        <Animated.View style={heatmapEntrance.animatedStyle}>
          <WeeklyVolumeChart workouts={filteredWorkouts} />
        </Animated.View>

        {/* Strength Benchmarks / Personal Records — only on Lifts tab */}
        {statsTab === 'lifts' && (
          <Animated.View style={recordsEntrance.animatedStyle}>
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

            {/* Strength Benchmarks */}
            <OneRMBenchmarkBars records={records ?? []} bodyWeightKg={profile?.body_weight_kg ?? null} />
          </Animated.View>
        )}

        {/* Cardio Stats — only on Cardio tab */}
        {statsTab === 'cardio' && (
          <Animated.View style={recordsEntrance.animatedStyle}>
            <View className="bg-[#1d1d37] rounded-2xl p-4 mb-4" style={chromaticShadow}>
              <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginBottom: 12 }}>Cardio Summary</Text>
              {(() => {
                const cardio = filteredWorkouts;
                const totalKm = cardio.reduce((sum: number, w: any) => sum + (w.route_data?.distance_km ?? 0), 0);
                const totalMin = cardio.reduce((sum: number, w: any) => sum + (w.duration_seconds ?? 0), 0) / 60;
                const avgPace = totalKm > 0 ? totalMin / totalKm : 0;
                const sessions = cardio.length;
                const formatPace = (p: number) => {
                  if (p <= 0) return '--:--';
                  const m = Math.floor(p);
                  const s = Math.round((p - m) * 60);
                  return `${m}:${s.toString().padStart(2, '0')}`;
                };
                return (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {[
                      { label: 'Sessions', value: String(sessions), unit: '' },
                      { label: 'Total Distance', value: totalKm.toFixed(1), unit: 'km' },
                      { label: 'Total Time', value: Math.round(totalMin).toString(), unit: 'min' },
                      { label: 'Avg Pace', value: formatPace(avgPace), unit: 'min/km' },
                    ].map((stat) => (
                      <View
                        key={stat.label}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          backgroundColor: VP.surface,
                          borderRadius: Radius.md,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: 'rgba(129,236,255,0.2)',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Lexend-SemiBold',
                            fontSize: 9,
                            letterSpacing: 1.5,
                            textTransform: 'uppercase',
                            color: VP.textMuted,
                            marginBottom: 6,
                          }}
                        >
                          {stat.label}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                          <Text
                            style={{
                              fontFamily: 'Epilogue-Bold',
                              fontSize: 22,
                              color: VP.cyan,
                              letterSpacing: -0.5,
                            }}
                          >
                            {stat.value}
                          </Text>
                          {stat.unit && (
                            <Text
                              style={{
                                fontFamily: 'Lexend-SemiBold',
                                fontSize: 10,
                                color: VP.textMuted,
                              }}
                            >
                              {stat.unit}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </View>
          </Animated.View>
        )}

        {/* Workout Calendar */}
        <Animated.View style={calendarEntrance.animatedStyle}>
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

        {/* Workout History — quick link */}
        <Animated.View style={linksEntrance.animatedStyle} className="gap-2 mb-6">
          <QuickLinkRow
            icon="history"
            iconColor={VP.textSec}
            label="Workout History"
            onPress={() => router.push('/(app)/history')}
          />
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Quick link row — isolated so usePressScale is unconditional ─────────────

function QuickLinkRow({
  icon,
  iconColor,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconColor: string;
  label: string;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className="bg-[#1d1d37] rounded-2xl p-4 flex-row items-center"
        style={{
          shadowColor: '#ce96ff',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <FontAwesome name={icon} size={18} color={iconColor} />
        <Text className="font-bold ml-3 flex-1" style={{ color: '#e5e3ff' }}>{label}</Text>
        <FontAwesome name="chevron-right" size={14} color="#74738b" />
      </Pressable>
    </Animated.View>
  );
}
