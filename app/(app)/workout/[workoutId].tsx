import { View, Text, ScrollView, Pressable, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { REASON_CODE_LABELS, REASON_CODE_SEVERITY } from '@/lib/validation';
import { useWorkoutDetail } from '@/hooks/use-workouts';
import { useFadeSlide } from '@/hooks/use-fade-slide';
import type { ReasonCode, ValidationStatus, StrengthSet, RouteData } from '@/types';

const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string; bgColor: string }
> = {
  accepted: { label: 'Accepted', color: Colors.success, bgColor: 'rgba(34,197,94,0.12)' },
  accepted_with_low_confidence: { label: 'Low Confidence', color: Colors.warning, bgColor: 'rgba(234,179,8,0.12)' },
  held_for_review: { label: 'Under Review', color: Colors.warning, bgColor: 'rgba(234,179,8,0.12)' },
  excluded_from_clan_score: { label: 'Excluded from Clan', color: Colors.danger, bgColor: 'rgba(239,68,68,0.12)' },
  rejected: { label: 'Rejected', color: Colors.danger, bgColor: 'rgba(239,68,68,0.12)' },
};

const TYPE_ICONS: Record<string, { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }> = {
  strength: { name: 'heartbeat', color: Colors.danger },
  scout: { name: 'road', color: '#81ecff' },
  active_recovery: { name: 'leaf', color: Colors.success },
};

function SectionHeader({ title }: { readonly title: string }) {
  return (
    <Text className="text-lg mb-3" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>{title}</Text>
  );
}

function ScoreRow({ label, value, muted }: { readonly label: string; readonly value: string; readonly muted?: boolean }) {
  return (
    <View className="flex-row justify-between py-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(70,70,92,0.3)' }}>
      <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>{label}</Text>
      <Text style={{ color: muted ? '#74738b' : '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>{value}</Text>
    </View>
  );
}

function StrengthBreakdown({ sets }: { readonly sets: readonly StrengthSet[] }) {
  return (
    <View className="bg-[#1d1d37] rounded-xl p-3 mb-6">
      <View className="flex-row pb-2 mb-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(70,70,92,0.3)' }}>
        <Text className="text-xs uppercase flex-1" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}>Exercise</Text>
        <Text className="text-xs uppercase w-16 text-center" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}>Sets</Text>
        <Text className="text-xs uppercase w-16 text-center" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}>Reps</Text>
        <Text className="text-xs uppercase w-16 text-right" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}>Weight</Text>
      </View>
      {sets.map((set, i) => (
        <View key={`${set.exercise}-${i}`} className="flex-row py-1.5">
          <Text className="flex-1" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>{set.exercise}</Text>
          <Text className="w-16 text-center" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{set.sets}</Text>
          <Text className="w-16 text-center" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{set.reps}</Text>
          <Text className="w-16 text-right" style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}>{set.weight_kg}kg</Text>
        </View>
      ))}
    </View>
  );
}

function ScoutBreakdown({ route }: { readonly route: RouteData }) {
  return (
    <View className="bg-[#1d1d37] rounded-xl p-3 mb-6">
      <ScoreRow label="Distance" value={`${route.distance_km.toFixed(2)} km`} />
      <ScoreRow label="Avg Pace" value={`${route.avg_pace_min_per_km.toFixed(1)} min/km`} />
      <View className="flex-row justify-between py-2">
        <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Elevation Gain</Text>
        <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>{route.elevation_gain_m}m</Text>
      </View>
    </View>
  );
}

export default function WorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const { data, isLoading } = useWorkoutDetail(workoutId);

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-[#0c0c1f] items-center justify-center">
        <ActivityIndicator color="#ce96ff" size="large" />
      </SafeAreaView>
    );
  }

  // Entrance animations
  const fadeHeaderAnim = useFadeSlide(0);
  const fadeScoreAnim = useFadeSlide(100);
  const fadeSetsAnim = useFadeSlide(200);

  const { workout, validations } = data;
  const validationStatus = (workout.validation_status ?? 'accepted') as ValidationStatus;
  const confidenceScore = workout.confidence_score ?? 1.0;
  const statusConfig = STATUS_CONFIG[validationStatus];
  const typeConfig = TYPE_ICONS[workout.type] ?? TYPE_ICONS.strength;
  const typeLabel = workout.type === 'active_recovery' ? 'Active Recovery' : workout.type === 'scout' ? 'Run' : 'Strength';
  const date = new Date(workout.started_at ?? workout.created_at);
  const durationMin = Math.round((workout.duration_seconds ?? 0) / 60);

  const isFlagged = ['held_for_review', 'excluded_from_clan_score', 'rejected'].includes(validationStatus);

  const failedChecks = validations.filter(
    (v: any) => !v.passed && v.reason_code && v.reason_code !== 'clean'
  );
  const passedChecks = validations.filter(
    (v: any) => v.passed || v.reason_code === 'clean'
  );

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="py-4 active:scale-[0.98]">
          <Text className="text-base" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>← Back</Text>
        </Pressable>

        {/* Header */}
        <Animated.View style={fadeHeaderAnim.style}>
        <View className="flex-row items-center gap-3 mb-1">
          <FontAwesome name={typeConfig.name} size={20} color={typeConfig.color} />
          <Text className="text-2xl" style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>{typeLabel}</Text>
        </View>
        <Text className="text-sm mb-6" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          {date.toLocaleDateString()} · {durationMin} min
        </Text>
        </Animated.View>

        {/* Status Badge */}
        <Animated.View style={fadeScoreAnim.style}>
        <View
          className="rounded-xl p-3 mb-6 flex-row items-center gap-2"
          style={{ backgroundColor: statusConfig.bgColor }}
        >
          <FontAwesome
            name={validationStatus === 'accepted' ? 'check-circle' : 'exclamation-triangle'}
            size={16}
            color={statusConfig.color}
          />
          <Text style={{ color: statusConfig.color, fontFamily: 'Lexend-SemiBold' }}>
            {statusConfig.label}
          </Text>
          <Text className="text-sm ml-auto" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
            {Math.round(confidenceScore * 100)}% confidence
          </Text>
        </View>

        {/* Scores */}
        <SectionHeader title="Scores" />
        <View className="bg-[#1d1d37] rounded-xl p-3 mb-6">
          <ScoreRow
            label="Raw Score"
            value={workout.raw_score != null ? String(Math.round(workout.raw_score)) : '—'}
            muted={workout.raw_score == null}
          />
          <ScoreRow
            label="Final Score"
            value={workout.final_score != null ? String(Math.round(workout.final_score)) : '—'}
            muted={workout.final_score == null}
          />
          <View className="flex-row justify-between py-2">
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Confidence</Text>
            <Text style={{ color: '#81ecff', fontFamily: 'Lexend-SemiBold' }}>{Math.round(confidenceScore * 100)}%</Text>
          </View>
        </View>
        </Animated.View>

        {/* Type-specific breakdown */}
        <Animated.View style={fadeSetsAnim.style}>
        {workout.type === 'strength' && workout.sets && workout.sets.length > 0 && (
          <>
            <SectionHeader title="Set Breakdown" />
            <StrengthBreakdown sets={workout.sets} />
          </>
        )}

        {workout.type === 'scout' && workout.route_data && (
          <>
            <SectionHeader title="Run Details" />
            <ScoutBreakdown route={workout.route_data} />
          </>
        )}

        {workout.type === 'active_recovery' && (
          <>
            <SectionHeader title="Recovery Details" />
            <View className="bg-[#1d1d37] rounded-xl p-3 mb-6">
              <View className="flex-row justify-between py-2">
                <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>Duration</Text>
                <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}>{durationMin} min</Text>
              </View>
            </View>
          </>
        )}

        {/* Validation Checks */}
        {validations.length > 0 && (
          <>
            <SectionHeader title="Validation Checks" />
            <View className="gap-2 mb-6">
              {passedChecks.map((v: any, i: number) => (
                <View
                  key={`pass-${i}`}
                  className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center gap-2"
                  style={{ backgroundColor: 'rgba(34,197,94,0.08)' }}
                >
                  <FontAwesome name="check-circle" size={14} color={Colors.success} />
                  <Text className="flex-1" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
                    {v.validation_type?.replace(/_/g, ' ') ?? 'Check'}
                  </Text>
                </View>
              ))}
              {failedChecks.map((v: any, i: number) => {
                const code = v.reason_code as ReasonCode;
                const severity = REASON_CODE_SEVERITY[code];
                const severityColor =
                  severity === 'critical' ? Colors.danger
                    : severity === 'warning' ? Colors.warning
                    : Colors.info;
                const severityBg =
                  severity === 'critical' ? 'rgba(239,68,68,0.1)'
                    : severity === 'warning' ? 'rgba(234,179,8,0.1)'
                    : 'rgba(129,236,255,0.1)';

                return (
                  <View
                    key={`fail-${i}`}
                    className="rounded-xl p-3 flex-row items-center gap-2"
                    style={{ backgroundColor: severityBg }}
                  >
                    <FontAwesome name="times-circle" size={14} color={severityColor} />
                    <Text className="flex-1" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>
                      {REASON_CODE_LABELS[code] ?? v.validation_type?.replace(/_/g, ' ') ?? 'Failed'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Appeal link for flagged workouts */}
        {isFlagged && (
          <Pressable
            className="py-3.5 items-center rounded-lg active:scale-[0.98]"
            style={{
              backgroundColor: '#ce96ff',
              shadowColor: '#ce96ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
            }}
            onPress={() => router.push(`/(app)/review/${workoutId}`)}
          >
            <Text className="text-lg" style={{ color: '#000000', fontFamily: 'Epilogue-Bold' }}>Review & Appeal</Text>
          </Pressable>
        )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
