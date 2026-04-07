import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Body from 'react-native-body-highlighter';
import {
  calculateMuscleHeatmap,
  getMuscleColor,
  HEAT_COLORS,
  type TimeWindow,
} from '@/lib/analytics/muscle-heatmap';
import {
  type MuscleGroup,
  MUSCLE_LABELS,
  FRONT_MUSCLES,
  BACK_MUSCLES,
} from '@/lib/analytics/muscle-mapping';
import type { StrengthSet } from '@/types';
import {
  BODY_HIGHLIGHTER_HIDDEN_PARTS,
  buildBodyHighlighterData,
  resolveBodyHighlighterGender,
  resolveMuscleGroupFromBodyPart,
} from './muscle-body-highlighter-adapter';

import { Colors } from '@/constants/theme';

// VP palette — pulls from theme
const VP = {
  textPri:   Colors.text.primary,
  textSec:   Colors.text.secondary,
  textMuted: Colors.text.muted,
  primary:   Colors.primary.DEFAULT,
  surface:   Colors.surface.DEFAULT,
  raised:    Colors.surface.containerHigh,
  highest:   Colors.surface.containerHighest,
} as const;

interface MuscleHeatmapCardProps {
  readonly workouts: readonly {
    readonly type: string;
    readonly started_at: string;
    readonly sets: readonly StrengthSet[] | null;
  }[];
  readonly bodyWeightKg: number | null;
  readonly biologicalSex?: string | null;
}

const TIME_WINDOWS: TimeWindow[] = ['1D', '7D', '30D'];

const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  '1D': 'Daily',
  '7D': 'Weekly',
  '14D': '14D',
  '30D': 'Monthly',
};

const HEAT_LEGEND: { level: string; color: string }[] = [
  { level: 'Cold', color: HEAT_COLORS.cold },
  { level: 'Warm', color: HEAT_COLORS.warm },
  { level: 'Hot', color: HEAT_COLORS.hot },
  { level: 'Max', color: HEAT_COLORS.maxed },
];

export function MuscleHeatmapCard({
  workouts,
  bodyWeightKg,
  biologicalSex,
}: MuscleHeatmapCardProps) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7D');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  const heatmapData = useMemo(
    () => calculateMuscleHeatmap({ workouts, timeWindow, bodyWeightKg }),
    [workouts, timeWindow, bodyWeightKg],
  );

  const bodyHighlighterData = useMemo(
    () => buildBodyHighlighterData({ heatmapData, selectedMuscle, view }),
    [heatmapData, selectedMuscle, view],
  );

  const bodyHighlighterGender = useMemo(
    () => resolveBodyHighlighterGender(biologicalSex),
    [biologicalSex],
  );

  const visibleMuscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const selectedData = selectedMuscle ? heatmapData.muscles.get(selectedMuscle) : null;

  const isEmpty = heatmapData.workoutCount === 0;

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
              {TIME_WINDOW_LABELS[tw]}
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

      {/* Top Worked Muscles */}
      {!isEmpty && (() => {
        const sorted = Array.from(heatmapData.muscles.entries())
          .filter(([, d]) => d.setCount > 0)
          .sort(([, a], [, b]) => b.setCount - a.setCount)
          .slice(0, 3);
        if (sorted.length === 0) return null;
        return (
          <>
            <Text
              style={{
                color: VP.textMuted,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 9,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Top Worked
            </Text>
            <View className="flex-row gap-2 mb-4">
              {sorted.map(([muscle, data]) => (
                <View
                  key={muscle}
                  className="flex-1 items-center rounded-xl p-2"
                  style={{
                    backgroundColor: VP.raised,
                    borderWidth: 1,
                    borderColor: 'rgba(206,150,255,0.12)',
                  }}
                >
                  <View
                    className="w-2.5 h-2.5 rounded-sm mb-1"
                    style={{ backgroundColor: getMuscleColor(heatmapData, muscle) }}
                  />
                  <Text
                    style={{
                      color: VP.textMuted,
                      fontFamily: 'Lexend-SemiBold',
                      fontSize: 9,
                      textAlign: 'center',
                      marginBottom: 2,
                    }}
                    numberOfLines={1}
                  >
                    {MUSCLE_LABELS[muscle]}
                  </Text>
                  <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 18, lineHeight: 20 }}>
                    {data.setCount}
                  </Text>
                  <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 8 }}>sets</Text>
                </View>
              ))}
            </View>
          </>
        );
      })()}

      {/* Body figure */}
      <View className="items-center mb-4">
        <View
          className="rounded-[28px] px-4 py-3"
          style={{
            backgroundColor: '#101022',
            borderWidth: 1,
            borderColor: 'rgba(206,150,255,0.10)',
          }}
        >
          <Body
            data={bodyHighlighterData}
            side={view}
            gender={bodyHighlighterGender}
            scale={1.12}
            border="none"
            hiddenParts={[...BODY_HIGHLIGHTER_HIDDEN_PARTS]}
            defaultFill="#17172f"
            defaultStroke="rgba(116,115,139,0.32)"
            defaultStrokeWidth={0.9}
            onBodyPartPress={(bodyPart) => {
              const muscle = resolveMuscleGroupFromBodyPart(bodyPart.slug, view);
              if (!muscle) return;
              setSelectedMuscle((current) => (current === muscle ? null : muscle));
            }}
          />
        </View>
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
      {!isEmpty && selectedData && (
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
            <View>
              <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 10 }}>Density</Text>
              <Text style={{ color: VP.textPri, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
                {selectedData.setCount > 0 ? Math.round(selectedData.rawLoad / selectedData.setCount).toLocaleString() : 0}
              </Text>
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
