import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RecordEntry {
  exercise: string;
  best_estimated_1rm: number;
  best_weight_kg: number;
  best_reps: number;
}

interface Props {
  records: Array<RecordEntry>;
  bodyWeightKg?: number | null;
  useMetric?: boolean;
}

type LiftKey = 'Squat' | 'Bench' | 'Deadlift';

const LIFT_CONFIG: ReadonlyArray<{ key: LiftKey; benchmark: number; patterns: ReadonlyArray<string> }> = [
  {
    key: 'Squat',
    benchmark: 140,
    patterns: ['squat', 'back squat', 'barbell squat', 'front squat', 'goblet squat'],
  },
  {
    key: 'Bench',
    benchmark: 100,
    patterns: ['bench press', 'bench', 'flat bench', 'barbell bench', 'barbell bench press'],
  },
  {
    key: 'Deadlift',
    benchmark: 160,
    patterns: ['deadlift', 'conventional deadlift', 'sumo deadlift', 'barbell deadlift'],
  },
] as const;

interface LiftData {
  key: LiftKey;
  benchmark: number;
  estimated1rm: number | null;
  actualMax: number | null;
  bwRatioEstimated: string | null;
  bwRatioActual: string | null;
}

function matchLift(exerciseName: string): LiftKey | null {
  const lower = exerciseName.toLowerCase().trim();
  for (const lift of LIFT_CONFIG) {
    if (lift.patterns.some((p) => lower === p || lower.includes(p))) {
      return lift.key;
    }
  }
  return null;
}

function formatWeight(kg: number, useMetric: boolean): string {
  if (useMetric) {
    return `${Math.round(kg)} kg`;
  }
  return `${Math.round(kg * 2.20462)} lbs`;
}

function formatBenchmark(kg: number, useMetric: boolean): string {
  if (useMetric) {
    return `${kg} kg`;
  }
  return `${Math.round(kg * 2.20462)} lbs`;
}

export function OneRMBenchmarkBars({ records, bodyWeightKg, useMetric = true }: Props) {
  const liftData: ReadonlyArray<LiftData> = useMemo(() => {
    // Build a lookup: for each lift key, find the best matching record
    const matched: Record<LiftKey, RecordEntry | null> = {
      Squat: null,
      Bench: null,
      Deadlift: null,
    };

    if (records && records.length > 0) {
      for (const r of records) {
        const liftKey = matchLift(r.exercise);
        if (liftKey === null) continue;

        const current = matched[liftKey];
        // Keep the record with the higher estimated 1RM
        if (current === null || r.best_estimated_1rm > current.best_estimated_1rm) {
          matched[liftKey] = r;
        }
      }
    }

    return LIFT_CONFIG.map((lift) => {
      const rec = matched[lift.key];
      const estimated = rec ? rec.best_estimated_1rm : null;
      const actual = rec ? rec.best_weight_kg : null;

      return {
        key: lift.key,
        benchmark: lift.benchmark,
        estimated1rm: estimated,
        actualMax: actual,
        bwRatioEstimated:
          estimated !== null && bodyWeightKg
            ? `${(estimated / bodyWeightKg).toFixed(1)}\u00d7 BW`
            : null,
        bwRatioActual:
          actual !== null && bodyWeightKg
            ? `${(actual / bodyWeightKg).toFixed(1)}\u00d7 BW`
            : null,
      };
    });
  }, [records, bodyWeightKg]);

  const hasAnyData = liftData.some((l) => l.estimated1rm !== null || l.actualMax !== null);

  return (
    <View
      style={{
        backgroundColor: '#1d1d37',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontFamily: 'Epilogue-Bold',
          fontSize: 16,
          color: '#e5e3ff',
          marginBottom: 4,
        }}
      >
        Strength Benchmarks
      </Text>
      <Text
        style={{
          fontFamily: 'Lexend-SemiBold',
          fontSize: 11,
          color: '#74738b',
          marginBottom: 12,
        }}
      >
        Estimated 1RM &amp; Actual Max vs standard benchmarks
      </Text>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: '#ce96ff',
            }}
          />
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: '#aaa8c3' }}>
            Estimated 1RM
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: '#81ecff',
            }}
          />
          <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, color: '#aaa8c3' }}>
            Actual Max
          </Text>
        </View>
      </View>

      {!hasAnyData ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <Text
            style={{
              fontFamily: 'Lexend-SemiBold',
              fontSize: 14,
              color: '#74738b',
              textAlign: 'center',
            }}
          >
            Log squat, bench, or deadlift workouts to see PRs here
          </Text>
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          {liftData.map((lift) => {
            const hasData = lift.estimated1rm !== null || lift.actualMax !== null;
            const maxValue = Math.max(lift.benchmark, lift.estimated1rm ?? 0, lift.actualMax ?? 0);
            const estimatedPct =
              lift.estimated1rm !== null ? (lift.estimated1rm / maxValue) * 100 : 0;
            const actualPct =
              lift.actualMax !== null ? (lift.actualMax / maxValue) * 100 : 0;

            return (
              <View key={lift.key} style={{ gap: 6, opacity: hasData ? 1 : 0.4 }}>
                {/* Exercise name row */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Lexend-SemiBold',
                      fontSize: 14,
                      color: hasData ? '#e5e3ff' : '#74738b',
                    }}
                  >
                    {lift.key}
                  </Text>
                  {!hasData && (
                    <Text
                      style={{
                        fontFamily: 'Lexend-SemiBold',
                        fontSize: 11,
                        color: '#74738b',
                      }}
                    >
                      No data
                    </Text>
                  )}
                </View>

                {hasData && (
                  <>
                    {/* Estimated 1RM bar */}
                    <View style={{ gap: 3 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Lexend-SemiBold',
                            fontSize: 11,
                            color: '#aaa8c3',
                          }}
                        >
                          Est. 1RM
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={{
                              fontFamily: 'Epilogue-Bold',
                              fontSize: 13,
                              color: '#ce96ff',
                            }}
                          >
                            {lift.estimated1rm !== null
                              ? formatWeight(lift.estimated1rm, useMetric)
                              : '—'}
                          </Text>
                          {lift.bwRatioEstimated !== null && (
                            <Text
                              style={{
                                fontFamily: 'Lexend-SemiBold',
                                fontSize: 10,
                                color: '#aaa8c3',
                              }}
                            >
                              {lift.bwRatioEstimated}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: '#2a2a44',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        {lift.estimated1rm !== null && (
                          <LinearGradient
                            colors={['#a434ff', '#ce96ff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              height: '100%',
                              width: `${Math.min(estimatedPct, 100)}%`,
                              borderRadius: 4,
                            }}
                          />
                        )}
                      </View>
                    </View>

                    {/* Actual Max bar */}
                    <View style={{ gap: 3 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Lexend-SemiBold',
                            fontSize: 11,
                            color: '#aaa8c3',
                          }}
                        >
                          Actual Max
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text
                            style={{
                              fontFamily: 'Epilogue-Bold',
                              fontSize: 13,
                              color: '#81ecff',
                            }}
                          >
                            {lift.actualMax !== null
                              ? formatWeight(lift.actualMax, useMetric)
                              : '—'}
                          </Text>
                          {lift.bwRatioActual !== null && (
                            <Text
                              style={{
                                fontFamily: 'Lexend-SemiBold',
                                fontSize: 10,
                                color: '#aaa8c3',
                              }}
                            >
                              {lift.bwRatioActual}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: '#2a2a44',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        {lift.actualMax !== null && (
                          <View
                            style={{
                              height: '100%',
                              width: `${Math.min(actualPct, 100)}%`,
                              borderRadius: 4,
                              backgroundColor: '#81ecff',
                            }}
                          />
                        )}
                      </View>
                    </View>

                    {/* Benchmark reference */}
                    <Text
                      style={{
                        fontFamily: 'Lexend-SemiBold',
                        fontSize: 10,
                        color: '#74738b',
                      }}
                    >
                      Benchmark: {formatBenchmark(lift.benchmark, useMetric)}
                    </Text>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
