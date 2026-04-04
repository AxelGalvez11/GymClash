import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

interface BodyFigureBackProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureBack({ muscleColors, width = 180, height = 324 }: BodyFigureBackProps) {
  const outline = '#74738b26'; // Very dim outline
  const contour = '#74738b1a'; // Even subtler contour lines
  const defaultFill = '#23233f';

  const upperBack = muscleColors.upper_back || defaultFill;
  const shoulders = muscleColors.shoulders || defaultFill;
  const triceps = muscleColors.triceps || defaultFill;
  const lats = muscleColors.lats || defaultFill;
  const lowerBack = muscleColors.lower_back || defaultFill;
  const glutes = muscleColors.glutes || defaultFill;
  const hamstrings = muscleColors.hamstrings || defaultFill;
  const calves = muscleColors.calves || defaultFill;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 200 360">
        <Defs>
          {/* Subtle gradient for depth on back muscles */}
          <LinearGradient id="backTrapsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={upperBack} stopOpacity="1" />
            <Stop offset="1" stopColor={upperBack} stopOpacity="0.75" />
          </LinearGradient>
          <LinearGradient id="backLatsGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={lats} stopOpacity="0.85" />
            <Stop offset="1" stopColor={lats} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <G>
          {/* ─── Head ─── */}
          <Path d="M88 8 Q100 0 112 8 Q118 18 118 30 Q118 44 100 50 Q82 44 82 30 Q82 18 88 8Z"
            fill={outline} stroke={outline} strokeWidth={0.8} />
          {/* Neck */}
          <Path d="M92 50 L108 50 L108 62 L92 62Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* ─── Traps (upper back) ─── */}
          <Path d="M80 62 Q92 58 100 58 Q108 58 120 62 L120 80 Q100 82 80 80Z"
            fill="url(#backTrapsGrad)" stroke={contour} strokeWidth={0.5} />
          {/* Trap contour — spine line */}
          <Path d="M100 60 L100 82" stroke={contour} strokeWidth={0.8} />

          {/* ─── Rear Delts (shoulders) ─── */}
          <Path d="M52 68 Q65 60 80 62 L80 88 Q68 86 52 78Z"
            fill={shoulders} stroke={contour} strokeWidth={0.5} />
          <Path d="M148 68 Q135 60 120 62 L120 88 Q132 86 148 78Z"
            fill={shoulders} stroke={contour} strokeWidth={0.5} />

          {/* ─── Triceps ─── */}
          <Path d="M52 78 Q48 90 46 112 Q48 124 55 118 Q60 105 58 88Z"
            fill={triceps} stroke={contour} strokeWidth={0.5} />
          <Path d="M148 78 Q152 90 154 112 Q152 124 145 118 Q140 105 142 88Z"
            fill={triceps} stroke={contour} strokeWidth={0.5} />

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

          {/* ─── Lats ─── */}
          <Path d="M68 82 L80 80 L80 120 Q72 128 64 118 Q62 105 66 88Z"
            fill="url(#backLatsGrad)" stroke={contour} strokeWidth={0.5} />
          <Path d="M132 82 L120 80 L120 120 Q128 128 136 118 Q138 105 134 88Z"
            fill="url(#backLatsGrad)" stroke={contour} strokeWidth={0.5} />

          {/* ─── Mid Back (upper_back) ─── */}
          <Path d="M80 80 L120 80 L120 120 Q100 124 80 120Z"
            fill={upperBack} stroke={contour} strokeWidth={0.5} opacity={0.7} />
          {/* Spine contour line */}
          <Path d="M100 82 L100 148" stroke={contour} strokeWidth={0.8} />

          {/* ─── Lower Back / Erectors ─── */}
          <Path d="M80 120 Q100 124 120 120 L118 155 Q100 160 82 155Z"
            fill={lowerBack} stroke={contour} strokeWidth={0.5} />
          {/* Erector contour lines */}
          <Path d="M92 122 L90 155" stroke={contour} strokeWidth={0.5} />
          <Path d="M108 122 L110 155" stroke={contour} strokeWidth={0.5} />

          {/* ─── Glutes ─── */}
          <Path d="M76 155 L100 160 L124 155 L124 190 Q100 198 76 190Z"
            fill={glutes} stroke={contour} strokeWidth={0.5} />
          {/* Glute divider */}
          <Path d="M100 160 L100 195" stroke={contour} strokeWidth={0.8} />

          {/* ─── Hamstrings ─── */}
          <Path d="M76 190 L96 195 L94 278 Q88 284 78 275Z"
            fill={hamstrings} stroke={contour} strokeWidth={0.5} />
          <Path d="M124 190 L104 195 L106 278 Q112 284 122 275Z"
            fill={hamstrings} stroke={contour} strokeWidth={0.5} />

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
