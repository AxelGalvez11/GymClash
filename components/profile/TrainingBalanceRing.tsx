import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Props {
  workouts: Array<{ created_at: string; type: string; final_score?: number; raw_score?: number }>;
}

type WorkoutType = 'strength' | 'scout' | 'active_recovery' | 'hiit';

const TYPE_COLORS: Record<WorkoutType, string> = {
  strength: '#ce96ff',
  scout: '#81ecff',
  active_recovery: '#00d4a0',
  hiit: '#ffd709',
};

const TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  scout: 'Cardio',
  active_recovery: 'Recovery',
  hiit: 'HIIT',
};

interface TypeCount {
  type: WorkoutType;
  count: number;
  label: string;
  color: string;
}

interface ArcPath {
  startAngle: number;
  endAngle: number;
  color: string;
  type: WorkoutType;
  label: string;
  count: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function createArcPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const angleDiff = endAngle - startAngle;

  // Handle full circle (360°) with two 180° arcs to avoid degenerate path
  if (Math.abs(angleDiff - 360) < 0.01) {
    const mid = startAngle + 180;
    const midStart = polarToCartesian(cx, cy, outerRadius, mid);
    const midEnd = polarToCartesian(cx, cy, outerRadius, mid);
    const innerMidStart = polarToCartesian(cx, cy, innerRadius, mid);
    const innerMidEnd = polarToCartesian(cx, cy, innerRadius, mid);
    const finalStart = polarToCartesian(cx, cy, outerRadius, endAngle);
    const finalEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
    const innerFinalStart = polarToCartesian(cx, cy, innerRadius, endAngle);
    const innerFinalEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

    return [
      `M ${midStart.x} ${midStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 0 0 ${finalStart.x} ${finalStart.y}`,
      `L ${innerFinalStart.x} ${innerFinalStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 0 1 ${innerMidStart.x} ${innerMidStart.y}`,
      `M ${midEnd.x} ${midEnd.y}`,
      `A ${outerRadius} ${outerRadius} 0 0 0 ${finalEnd.x} ${finalEnd.y}`,
      `L ${innerFinalEnd.x} ${innerFinalEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 0 1 ${innerMidEnd.x} ${innerMidEnd.y}`,
      'Z',
    ].join(' ');
  }

  const start = polarToCartesian(cx, cy, outerRadius, endAngle);
  const end = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArc = angleDiff <= 180 ? '0' : '1';

  return [
    `M ${start.x} ${start.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function TrainingBalanceRing({ workouts }: Props) {
  const { typeCounts, totalWorkouts, arcPaths } = useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const filteredWorkouts = workouts.filter(w => {
      const createdDate = new Date(w.created_at);
      return createdDate >= ninetyDaysAgo;
    });

    const countMap: Record<WorkoutType, number> = {
      strength: 0,
      scout: 0,
      active_recovery: 0,
      hiit: 0,
    };

    filteredWorkouts.forEach(w => {
      const type = w.type as WorkoutType;
      if (type in countMap) {
        countMap[type] += 1;
      }
    });

    const counts: TypeCount[] = Object.entries(countMap)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type: type as WorkoutType,
        count,
        label: TYPE_LABELS[type as WorkoutType],
        color: TYPE_COLORS[type as WorkoutType],
      }));

    const total = counts.reduce((sum, c) => sum + c.count, 0);

    const arcs: ArcPath[] = [];
    let currentAngle = 0;

    counts.forEach(c => {
      const percentage = c.count / total;
      const arcDegrees = percentage * 360;
      arcs.push({
        startAngle: currentAngle,
        endAngle: currentAngle + arcDegrees,
        color: c.color,
        type: c.type,
        label: c.label,
        count: c.count,
      });
      currentAngle += arcDegrees;
    });

    return {
      typeCounts: counts,
      totalWorkouts: total,
      arcPaths: arcs,
    };
  }, [workouts]);

  const isEmpty = totalWorkouts === 0;

  return (
    <View
      style={{
        backgroundColor: '#1d1d37',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontFamily: 'Epilogue-Bold',
          fontSize: 16,
          color: '#e5e3ff',
          marginBottom: 4,
        }}
      >
        Training Mix
      </Text>
      <Text
        style={{
          fontFamily: 'Lexend-SemiBold',
          fontSize: 11,
          color: '#74738b',
          marginBottom: 16,
        }}
      >
        Last 90 days
      </Text>

      {isEmpty ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 160 }}>
          <Text
            style={{
              fontFamily: 'Lexend-SemiBold',
              fontSize: 14,
              color: '#74738b',
            }}
          >
            No workouts in last 90 days
          </Text>
        </View>
      ) : (
        <>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              height: 160,
              marginBottom: 16,
            }}
          >
            <Svg width={140} height={140} viewBox="0 0 140 140">
              {arcPaths.map((arc, idx) => (
                <Path
                  key={idx}
                  d={createArcPath(70, 70, 40, 60, arc.startAngle, arc.endAngle)}
                  fill={arc.color}
                />
              ))}
            </Svg>

            <View
              style={{
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 24,
                  color: '#e5e3ff',
                }}
              >
                {totalWorkouts}
              </Text>
              <Text
                style={{
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 11,
                  color: '#aaa8c3',
                }}
              >
                workouts
              </Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            {typeCounts.map(tc => (
              <View
                key={tc.type}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: tc.color,
                  }}
                />
                <Text
                  style={{
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 12,
                    color: '#aaa8c3',
                    flex: 1,
                  }}
                >
                  {tc.label}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 12,
                    color: '#e5e3ff',
                  }}
                >
                  {tc.count}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
