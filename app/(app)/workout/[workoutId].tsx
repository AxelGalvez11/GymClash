import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { REASON_CODE_LABELS, REASON_CODE_SEVERITY } from '@/lib/validation';
import { useWorkoutDetail } from '@/hooks/use-workouts';
import type { ReasonCode, ValidationStatus, StrengthSet, RouteData } from '@/types';

const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string }
> = {
  accepted: { label: 'Accepted', color: Colors.success },
  accepted_with_low_confidence: { label: 'Low Confidence', color: Colors.warning },
  held_for_review: { label: 'Under Review', color: Colors.warning },
  excluded_from_clan_score: { label: 'Excluded from Clan', color: Colors.danger },
  rejected: { label: 'Rejected', color: Colors.danger },
};

const TYPE_ICONS: Record<string, { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }> = {
  strength: { name: 'heartbeat', color: Colors.danger },
  scout: { name: 'road', color: Colors.info },
  active_recovery: { name: 'leaf', color: Colors.success },
};

function SectionHeader({ title }: { readonly title: string }) {
  return (
    <Text className="text-white text-lg font-bold mb-3">{title}</Text>
  );
}

function ScoreRow({ label, value, muted }: { readonly label: string; readonly value: string; readonly muted?: boolean }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-surface-border">
      <Text className="text-text-secondary">{label}</Text>
      <Text className={muted ? 'text-text-muted font-bold' : 'text-white font-bold'}>{value}</Text>
    </View>
  );
}

function StrengthBreakdown({ sets }: { readonly sets: readonly StrengthSet[] }) {
  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-3 mb-6">
      <View className="flex-row border-b border-surface-border pb-2 mb-2">
        <Text className="text-text-muted text-xs uppercase flex-1">Exercise</Text>
        <Text className="text-text-muted text-xs uppercase w-16 text-center">Sets</Text>
        <Text className="text-text-muted text-xs uppercase w-16 text-center">Reps</Text>
        <Text className="text-text-muted text-xs uppercase w-16 text-right">Weight</Text>
      </View>
      {sets.map((set, i) => (
        <View key={`${set.exercise}-${i}`} className="flex-row py-1.5">
          <Text className="text-white flex-1">{set.exercise}</Text>
          <Text className="text-text-secondary w-16 text-center">{set.sets}</Text>
          <Text className="text-text-secondary w-16 text-center">{set.reps}</Text>
          <Text className="text-text-secondary w-16 text-right">{set.weight_kg}kg</Text>
        </View>
      ))}
    </View>
  );
}

function ScoutBreakdown({ route }: { readonly route: RouteData }) {
  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-3 mb-6">
      <ScoreRow label="Distance" value={`${route.distance_km.toFixed(2)} km`} />
      <ScoreRow label="Avg Pace" value={`${route.avg_pace_min_per_km.toFixed(1)} min/km`} />
      <View className="flex-row justify-between py-2">
        <Text className="text-text-secondary">Elevation Gain</Text>
        <Text className="text-white font-bold">{route.elevation_gain_m}m</Text>
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
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={Colors.text.primary} size="large" />
      </SafeAreaView>
    );
  }

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
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-8">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="py-4">
          <Text className="text-white/60 text-base">← Back</Text>
        </Pressable>

        {/* Header */}
        <View className="flex-row items-center gap-3 mb-1">
          <FontAwesome name={typeConfig.name} size={20} color={typeConfig.color} />
          <Text className="text-white text-2xl font-bold">{typeLabel}</Text>
        </View>
        <Text className="text-text-secondary text-sm mb-6">
          {date.toLocaleDateString()} · {durationMin} min
        </Text>

        {/* Status Badge */}
        <View
          className="rounded-xl p-3 mb-6 flex-row items-center gap-2 border"
          style={{ borderColor: statusConfig.color + '40' }}
        >
          <FontAwesome
            name={validationStatus === 'accepted' ? 'check-circle' : 'exclamation-triangle'}
            size={16}
            color={statusConfig.color}
          />
          <Text className="font-bold" style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </Text>
          <Text className="text-text-muted text-sm ml-auto">
            {Math.round(confidenceScore * 100)}% confidence
          </Text>
        </View>

        {/* Scores */}
        <SectionHeader title="Scores" />
        <View className="bg-surface-raised border border-surface-border rounded-xl p-3 mb-6">
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
            <Text className="text-text-secondary">Confidence</Text>
            <Text className="text-white font-bold">{Math.round(confidenceScore * 100)}%</Text>
          </View>
        </View>

        {/* Type-specific breakdown */}
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
            <View className="bg-surface-raised border border-surface-border rounded-xl p-3 mb-6">
              <View className="flex-row justify-between py-2">
                <Text className="text-text-secondary">Duration</Text>
                <Text className="text-white font-bold">{durationMin} min</Text>
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
                  className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center gap-2"
                >
                  <FontAwesome name="check-circle" size={14} color={Colors.success} />
                  <Text className="text-text-secondary flex-1">
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

                return (
                  <View
                    key={`fail-${i}`}
                    className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center gap-2"
                  >
                    <FontAwesome name="times-circle" size={14} color={severityColor} />
                    <Text className="text-white flex-1">
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
            className="py-3.5 items-center active:opacity-70" style={{ borderWidth: 1, borderColor: '#ffffff' }}
            onPress={() => router.push(`/(app)/review/${workoutId}`)}
          >
            <Text className="text-white text-lg font-bold">Review & Appeal</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
