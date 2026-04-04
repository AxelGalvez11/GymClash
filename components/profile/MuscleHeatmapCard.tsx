import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BodyFigureFront } from './BodyFigureFront';
import { BodyFigureBack } from './BodyFigureBack';
import {
  calculateMuscleHeatmap,
  getMuscleColor,
  HEAT_COLORS,
  type TimeWindow,
  type HeatmapData,
} from '@/lib/analytics/muscle-heatmap';
import {
  type MuscleGroup,
  ALL_MUSCLES,
  MUSCLE_LABELS,
  FRONT_MUSCLES,
  BACK_MUSCLES,
} from '@/lib/analytics/muscle-mapping';
import type { StrengthSet } from '@/types';

// VP palette (match profile.tsx)
const VP = {
  textPri: '#e5e3ff',
  textSec: '#aaa8c3',
  textMuted: '#74738b',
  primary: '#ce96ff',
  surface: '#0c0c1f',
  raised: '#1d1d37',
  highest: '#23233f',
} as const;

interface MuscleHeatmapCardProps {
  readonly workouts: readonly {
    readonly type: string;
    readonly started_at: string;
    readonly sets: readonly StrengthSet[] | null;
  }[];
  readonly bodyWeightKg: number | null;
}

const TIME_WINDOWS: TimeWindow[] = ['7D', '14D', '30D'];

const HEAT_LEGEND: { level: string; color: string }[] = [
  { level: 'Cold', color: HEAT_COLORS.cold },
  { level: 'Warm', color: HEAT_COLORS.warm },
  { level: 'Hot', color: HEAT_COLORS.hot },
  { level: 'Max', color: HEAT_COLORS.maxed },
];

export function MuscleHeatmapCard({ workouts, bodyWeightKg }: MuscleHeatmapCardProps) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('14D');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  const heatmapData = useMemo(
    () => calculateMuscleHeatmap({ workouts, timeWindow, bodyWeightKg }),
    [workouts, timeWindow, bodyWeightKg],
  );

  // Build color map for SVG figures
  const muscleColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const muscle of ALL_MUSCLES) {
      colors[muscle] = getMuscleColor(heatmapData, muscle);
    }
    return colors as Record<MuscleGroup, string>;
  }, [heatmapData]);

  const visibleMuscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const selectedData = selectedMuscle ? heatmapData.muscles.get(selectedMuscle) : null;

  // Empty state
  if (heatmapData.workoutCount === 0) {
    return (
      <View className="items-center py-6">
        <FontAwesome name="fire" size={28} color={VP.textMuted} />
        <Text style={{ color: VP.textMuted, fontFamily: 'Epilogue-Bold', fontSize: 14, marginTop: 8 }}>
          No Strength Data
        </Text>
        <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
          Complete strength workouts to see your muscle heatmap
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Timeframe selector */}
      <View className="flex-row gap-2 mb-4">
        {TIME_WINDOWS.map((tw) => (
          <Pressable
            key={tw}
            className="flex-1 py-1.5 rounded-lg items-center active:scale-[0.98]"
            style={{ backgroundColor: timeWindow === tw ? '#a434ff' : VP.highest }}
            onPress={() => setTimeWindow(tw)}
          >
            <Text style={{
              color: timeWindow === tw ? '#fff' : VP.textMuted,
              fontFamily: 'Lexend-SemiBold',
              fontSize: 11,
            }}>
              {tw}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Front / Back toggle */}
      <View className="flex-row gap-2 mb-4">
        <Pressable
          className="flex-1 py-2 rounded-lg items-center active:scale-[0.98]"
          style={{ backgroundColor: view === 'front' ? VP.highest : 'transparent', borderWidth: 1, borderColor: view === 'front' ? VP.primary : 'transparent' }}
          onPress={() => { setView('front'); setSelectedMuscle(null); }}
        >
          <Text style={{ color: view === 'front' ? VP.textPri : VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Front</Text>
        </Pressable>
        <Pressable
          className="flex-1 py-2 rounded-lg items-center active:scale-[0.98]"
          style={{ backgroundColor: view === 'back' ? VP.highest : 'transparent', borderWidth: 1, borderColor: view === 'back' ? VP.primary : 'transparent' }}
          onPress={() => { setView('back'); setSelectedMuscle(null); }}
        >
          <Text style={{ color: view === 'back' ? VP.textPri : VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Back</Text>
        </Pressable>
      </View>

      {/* Body figure */}
      <View className="items-center mb-4">
        {view === 'front' ? (
          <BodyFigureFront muscleColors={muscleColors} />
        ) : (
          <BodyFigureBack muscleColors={muscleColors} />
        )}
      </View>

      {/* Muscle list for current view */}
      <View className="gap-1.5 mb-3">
        {visibleMuscles.map((muscle) => {
          const data = heatmapData.muscles.get(muscle);
          const intensity = data?.normalizedIntensity ?? 0;
          const isSelected = selectedMuscle === muscle;
          return (
            <Pressable
              key={muscle}
              className="flex-row items-center gap-2 rounded-lg px-2 py-1.5 active:scale-[0.98]"
              style={{ backgroundColor: isSelected ? VP.highest : 'transparent' }}
              onPress={() => setSelectedMuscle(isSelected ? null : muscle)}
            >
              <View className="w-3 h-3 rounded-sm" style={{ backgroundColor: getMuscleColor(heatmapData, muscle) }} />
              <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 11, flex: 1 }}>
                {MUSCLE_LABELS[muscle]}
              </Text>
              <View className="flex-1 h-2 rounded-full bg-[#0c0c1f] overflow-hidden">
                <View
                  className="h-2 rounded-full"
                  style={{ width: `${Math.max(intensity * 100, 1)}%`, backgroundColor: getMuscleColor(heatmapData, muscle) }}
                />
              </View>
              <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 9, width: 30, textAlign: 'right' }}>
                {data?.setCount ?? 0}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Selected muscle detail */}
      {selectedData && (
        <View className="bg-[#0c0c1f] rounded-lg p-3 mb-3">
          <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 13, marginBottom: 4 }}>
            {MUSCLE_LABELS[selectedData.muscle]}
          </Text>
          <View className="flex-row gap-4">
            <View>
              <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>Volume</Text>
              <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{selectedData.rawLoad.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>Sets</Text>
              <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{selectedData.setCount}</Text>
            </View>
            <View>
              <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>Intensity</Text>
              <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>{Math.round(selectedData.normalizedIntensity * 100)}%</Text>
            </View>
          </View>
        </View>
      )}

      {/* Legend */}
      <View className="flex-row justify-center gap-3">
        {HEAT_LEGEND.map((h) => (
          <View key={h.level} className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: h.color }} />
            <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>{h.level}</Text>
          </View>
        ))}
      </View>

      {/* Stats footer */}
      <Text className="text-center mt-2" style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>
        {heatmapData.workoutCount} workout{heatmapData.workoutCount !== 1 ? 's' : ''} · {heatmapData.totalVolume.toLocaleString()} total volume
      </Text>
    </View>
  );
}
