import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

interface BodyFigureFrontProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureFront({ muscleColors, width = 180, height = 324 }: BodyFigureFrontProps) {
  const outline = '#74738b26'; // Very dim outline
  const contour = '#74738b1a'; // Even subtler contour lines
  const defaultFill = '#23233f';

  const chest = muscleColors.chest || defaultFill;
  const shoulders = muscleColors.shoulders || defaultFill;
  const biceps = muscleColors.biceps || defaultFill;
  const abs = muscleColors.abs || defaultFill;
  const quads = muscleColors.quads || defaultFill;
  const calves = muscleColors.calves || defaultFill;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 200 360">
        <Defs>
          {/* Subtle gradient for depth on each muscle */}
          <LinearGradient id="chestGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chest} stopOpacity="1" />
            <Stop offset="1" stopColor={chest} stopOpacity="0.7" />
          </LinearGradient>
          <LinearGradient id="absGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={abs} stopOpacity="0.85" />
            <Stop offset="1" stopColor={abs} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <G>
          {/* ─── Head ─── */}
          <Path d="M88 8 Q100 0 112 8 Q118 18 118 30 Q118 44 100 50 Q82 44 82 30 Q82 18 88 8Z"
            fill={outline} stroke={outline} strokeWidth={0.8} />
          {/* Neck */}
          <Path d="M92 50 L108 50 L108 62 L92 62Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* ─── Front Delts (shoulders) ─── */}
          <Path d="M52 68 Q65 60 92 65 L92 88 Q70 85 52 78Z"
            fill={shoulders} stroke={contour} strokeWidth={0.5} />
          <Path d="M148 68 Q135 60 108 65 L108 88 Q130 85 148 78Z"
            fill={shoulders} stroke={contour} strokeWidth={0.5} />

          {/* ─── Upper Chest ─── */}
          <Path d="M92 65 L108 65 L110 85 Q100 88 90 85Z"
            fill="url(#chestGrad)" stroke={contour} strokeWidth={0.5} />

          {/* ─── Lower/Mid Chest ─── */}
          <Path d="M90 85 Q100 88 110 85 L112 118 Q100 124 88 118Z"
            fill={chest} stroke={contour} strokeWidth={0.5} />

          {/* ─── Biceps ─── */}
          <Path d="M52 78 Q48 90 46 112 Q48 124 55 118 Q60 105 58 88Z"
            fill={biceps} stroke={contour} strokeWidth={0.5} />
          <Path d="M148 78 Q152 90 154 112 Q152 124 145 118 Q140 105 142 88Z"
            fill={biceps} stroke={contour} strokeWidth={0.5} />

          {/* ─── Forearms ─── */}
          <Path d="M46 118 Q43 135 40 160 Q45 163 49 158 Q53 138 55 118Z"
            fill={outline} stroke={outline} strokeWidth={0.5} />
          <Path d="M154 118 Q157 135 160 160 Q155 163 151 158 Q147 138 145 118Z"
            fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* ─── Hands ─── */}
          <Path d="M38 160 Q36 168 38 175 Q42 178 46 172 Q48 165 47 158Z"
            fill={outline} stroke={outline} strokeWidth={0.3} />
          <Path d="M162 160 Q164 168 162 175 Q158 178 154 172 Q152 165 153 158Z"
            fill={outline} stroke={outline} strokeWidth={0.3} />

          {/* ─── Upper Abs ─── */}
          <Path d="M88 118 Q100 124 112 118 L112 148 Q100 150 88 148Z"
            fill="url(#absGrad)" stroke={contour} strokeWidth={0.5} />

          {/* ─── Ab line details (contour) ─── */}
          <Path d="M100 120 L100 148" stroke={contour} strokeWidth={0.8} />
          <Path d="M88 128 L112 128" stroke={contour} strokeWidth={0.5} />
          <Path d="M89 138 L111 138" stroke={contour} strokeWidth={0.5} />

          {/* ─── Lower Abs ─── */}
          <Path d="M88 148 Q100 150 112 148 L112 170 Q100 175 88 170Z"
            fill={abs} stroke={contour} strokeWidth={0.5} />

          {/* ─── Obliques ─── */}
          <Path d="M78 118 L88 118 L88 170 L78 165Z"
            fill={abs} stroke={contour} strokeWidth={0.5} opacity={0.6} />
          <Path d="M122 118 L112 118 L112 170 L122 165Z"
            fill={abs} stroke={contour} strokeWidth={0.5} opacity={0.6} />

          {/* ─── Quads ─── */}
          <Path d="M78 175 L96 175 L94 278 Q88 284 78 275Z"
            fill={quads} stroke={contour} strokeWidth={0.5} />
          <Path d="M122 175 L104 175 L106 278 Q112 284 122 275Z"
            fill={quads} stroke={contour} strokeWidth={0.5} />

          {/* ─── Knees (neutral) ─── */}
          <Circle cx="86" cy="282" r="6" fill={outline} stroke={outline} strokeWidth={0.3} />
          <Circle cx="114" cy="282" r="6" fill={outline} stroke={outline} strokeWidth={0.3} />

          {/* ─── Calves ─── */}
          <Path d="M78 288 Q84 298 85 320 Q82 332 78 326 Q75 310 77 292Z"
            fill={calves} stroke={contour} strokeWidth={0.5} />
          <Path d="M122 288 Q116 298 115 320 Q118 332 122 326 Q125 310 123 292Z"
            fill={calves} stroke={contour} strokeWidth={0.5} />

          {/* ─── Feet ─── */}
          <Path d="M76 328 Q78 336 82 340 Q86 342 90 338 Q88 332 85 326Z"
            fill={outline} stroke={outline} strokeWidth={0.3} />
          <Path d="M124 328 Q122 336 118 340 Q114 342 110 338 Q112 332 115 326Z"
            fill={outline} stroke={outline} strokeWidth={0.3} />
        </G>
      </Svg>
    </View>
  );
}
