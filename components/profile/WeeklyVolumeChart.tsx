import React, { useMemo } from 'react';
import { View, Text } from 'react-native';

const KM_TO_MILES = 0.621371;
const KG_TO_LBS = 2.20462;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface WorkoutData {
  created_at: string;
  type: string;
  sets?: Array<{ exercise: string; sets: number; reps: number; weight_kg: number }> | null;
  route_data?: { distance_km: number } | null;
  final_score?: number;
  raw_score?: number;
}

interface Props {
  workouts: WorkoutData[];
  useMetric?: boolean;
}

interface DayBucket {
  cardioDistance: number;
  liftingVolume: number;
}

function getStartOfWeekSunday(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function computeNiceScale(maxValue: number, tickCount: number): number[] {
  if (maxValue <= 0) {
    return [0];
  }
  const rawStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceStep: number;
  if (residual <= 1.5) {
    niceStep = 1 * magnitude;
  } else if (residual <= 3) {
    niceStep = 2 * magnitude;
  } else if (residual <= 7) {
    niceStep = 5 * magnitude;
  } else {
    niceStep = 10 * magnitude;
  }
  const ticks: number[] = [];
  for (let v = 0; v <= maxValue + niceStep * 0.01; v += niceStep) {
    ticks.push(Math.round(v * 100) / 100);
  }
  if (ticks.length < 2) {
    ticks.push(niceStep);
  }
  return ticks;
}

function formatLabel(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

interface ChartSectionProps {
  title: string;
  unit: string;
  color: string;
  dayValues: number[];
  chartHeight: number;
}

const ChartSection: React.FC<ChartSectionProps> = ({
  title,
  unit,
  color,
  dayValues,
  chartHeight,
}) => {
  const maxValue = Math.max(...dayValues, 0);
  const ticks = computeNiceScale(maxValue, 3);
  const scaleMax = ticks[ticks.length - 1] || 1;
  const yAxisWidth = 36;

  return (
    <View style={{ marginBottom: 8 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: color,
            marginRight: 6,
            alignSelf: 'center',
          }}
        />
        <Text
          style={{
            fontFamily: 'Lexend-SemiBold',
            fontSize: 13,
            color: '#e5e3ff',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 10,
            color: '#74738b',
            marginLeft: 6,
          }}
        >
          ({unit})
        </Text>
      </View>

      {/* Chart area */}
      <View style={{ flexDirection: 'row' }}>
        {/* Y-axis labels */}
        <View
          style={{
            width: yAxisWidth,
            height: chartHeight,
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingRight: 6,
          }}
        >
          {[...ticks].reverse().map((tick) => (
            <Text
              key={`y-${tick}`}
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 9,
                color: '#74738b',
                lineHeight: 10,
              }}
            >
              {formatLabel(tick)}
            </Text>
          ))}
        </View>

        {/* Bars */}
        <View
          style={{
            flex: 1,
            height: chartHeight,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
          }}
        >
          {dayValues.map((value, idx) => {
            const barHeight =
              scaleMax > 0 ? (value / scaleMax) * chartHeight : 0;
            return (
              <View
                key={DAY_LABELS[idx]}
                style={{ flex: 1, alignItems: 'center', height: chartHeight, justifyContent: 'flex-end' }}
              >
                {barHeight > 0 ? (
                  <View
                    style={{
                      width: '55%',
                      height: Math.max(barHeight, 2),
                      backgroundColor: color,
                      borderRadius: 3,
                      opacity: 0.9,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: '55%',
                      height: 2,
                      backgroundColor: '#2a2a44',
                      borderRadius: 1,
                    }}
                  />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', marginLeft: yAxisWidth }}>
        {DAY_LABELS.map((label) => (
          <View key={label} style={{ flex: 1, alignItems: 'center', paddingTop: 4 }}>
            <Text
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 9,
                color: '#aaa8c3',
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const WeeklyVolumeChart: React.FC<Props> = ({ workouts, useMetric = false }) => {
  const { cardioDays, liftingDays } = useMemo(() => {
    const buckets: DayBucket[] = Array.from({ length: 7 }, () => ({
      cardioDistance: 0,
      liftingVolume: 0,
    }));

    if (!workouts || workouts.length === 0) {
      return { cardioDays: buckets.map((b) => b.cardioDistance), liftingDays: buckets.map((b) => b.liftingVolume) };
    }

    const now = new Date();
    const weekStart = getStartOfWeekSunday(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    workouts.forEach((workout) => {
      const date = new Date(workout.created_at);
      if (isNaN(date.getTime())) {
        return;
      }
      if (date < weekStart || date >= weekEnd) {
        return;
      }

      const dayIndex = date.getDay(); // 0=Sun, 6=Sat

      if (workout.type === 'scout' || workout.type === 'active_recovery' || workout.type === 'hiit') {
        const distanceKm = workout.route_data?.distance_km ?? 0;
        const displayDistance = useMetric ? distanceKm : distanceKm * KM_TO_MILES;
        buckets[dayIndex] = {
          ...buckets[dayIndex],
          cardioDistance: buckets[dayIndex].cardioDistance + displayDistance,
        };
      } else if (workout.type === 'strength') {
        let volume = 0;
        if (workout.sets && workout.sets.length > 0) {
          workout.sets.forEach((s) => {
            volume += s.sets * s.reps * s.weight_kg;
          });
        }
        const displayVolume = useMetric ? volume : volume * KG_TO_LBS;
        buckets[dayIndex] = {
          ...buckets[dayIndex],
          liftingVolume: buckets[dayIndex].liftingVolume + displayVolume,
        };
      }
    });

    return {
      cardioDays: buckets.map((b) => Math.round(b.cardioDistance * 100) / 100),
      liftingDays: buckets.map((b) => Math.round(b.liftingVolume)),
    };
  }, [workouts, useMetric]);

  const hasCardio = cardioDays.some((v) => v > 0);
  const hasLifting = liftingDays.some((v) => v > 0);
  const hasData = hasCardio || hasLifting;

  const chartHeight = 90;

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
        Weekly Volume
      </Text>
      <Text
        style={{
          fontFamily: 'Lexend-SemiBold',
          fontSize: 11,
          color: '#74738b',
          marginBottom: 16,
        }}
      >
        This week
      </Text>

      {!hasData ? (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          <Text
            style={{
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 14,
              color: '#74738b',
            }}
          >
            No workouts this week
          </Text>
        </View>
      ) : (
        <>
          {/* Cardio chart */}
          <ChartSection
            title="Cardio"
            unit={useMetric ? 'km' : 'mi'}
            color="#81ecff"
            dayValues={cardioDays}
            chartHeight={chartHeight}
          />

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: '#2a2a44',
              marginVertical: 12,
            }}
          />

          {/* Lifting chart */}
          <ChartSection
            title="Lifting"
            unit={useMetric ? 'kg' : 'lbs'}
            color="#ce96ff"
            dayValues={liftingDays}
            chartHeight={chartHeight}
          />
        </>
      )}
    </View>
  );
};

export default WeeklyVolumeChart;
