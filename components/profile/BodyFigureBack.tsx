import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

interface BodyFigureBackProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureBack({ muscleColors, width = 160, height = 280 }: BodyFigureBackProps) {
  const outline = '#74738b33';
  const defaultFill = '#23233f';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 160 280">
        <G>
          {/* Head */}
          <Path d="M70 10 Q80 0 90 10 Q95 20 95 30 Q95 40 80 45 Q65 40 65 30 Q65 20 70 10Z" fill={outline} stroke={outline} strokeWidth={0.5} />
          {/* Neck */}
          <Path d="M73 45 L87 45 L87 55 L73 55Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* Upper Back / Traps */}
          <Path d="M55 58 L73 55 L87 55 L105 58 L105 80 Q80 82 55 80Z" fill={muscleColors.upper_back || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Triceps */}
          <Path d="M45 70 Q42 80 40 100 Q42 110 48 105 Q52 95 50 78Z" fill={muscleColors.triceps || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M115 70 Q118 80 120 100 Q118 110 112 105 Q108 95 110 78Z" fill={muscleColors.triceps || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Forearms */}
          <Path d="M40 105 Q38 120 35 140 Q40 142 43 138 Q46 120 48 105Z" fill={outline} stroke={outline} strokeWidth={0.5} />
          <Path d="M120 105 Q122 120 125 140 Q120 142 117 138 Q114 120 112 105Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* Lats */}
          <Path d="M55 80 L73 82 L73 110 Q65 115 55 108Z" fill={muscleColors.lats || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M105 80 L87 82 L87 110 Q95 115 105 108Z" fill={muscleColors.lats || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Lower Back */}
          <Path d="M73 110 L87 110 L87 150 Q80 155 73 150Z" fill={muscleColors.lower_back || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Glutes */}
          <Path d="M63 150 L97 150 L97 175 Q80 180 63 175Z" fill={muscleColors.glutes || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Hamstrings */}
          <Path d="M63 175 L77 178 L75 220 Q70 225 63 218Z" fill={muscleColors.hamstrings || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M97 175 L83 178 L85 220 Q90 225 97 218Z" fill={muscleColors.hamstrings || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Calves */}
          <Path d="M63 222 Q67 230 68 250 Q65 260 62 255 Q60 240 62 225Z" fill={muscleColors.calves || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M97 222 Q93 230 92 250 Q95 260 98 255 Q100 240 98 225Z" fill={muscleColors.calves || defaultFill} stroke={outline} strokeWidth={0.5} />
        </G>
      </Svg>
    </View>
  );
}
