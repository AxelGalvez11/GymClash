import React from 'react';
import { View } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

interface BodyFigureFrontProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureFront({ muscleColors, width = 160, height = 280 }: BodyFigureFrontProps) {
  const outline = '#74738b33'; // Dim outline
  const defaultFill = '#23233f'; // Surface dark (cold)

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 160 280">
        {/* Body outline */}
        <G>
          {/* Head */}
          <Path d="M70 10 Q80 0 90 10 Q95 20 95 30 Q95 40 80 45 Q65 40 65 30 Q65 20 70 10Z" fill={outline} stroke={outline} strokeWidth={0.5} />
          {/* Neck */}
          <Path d="M73 45 L87 45 L87 55 L73 55Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* Shoulders */}
          <Path d="M45 60 Q55 55 73 58 L73 78 Q55 75 45 70Z" fill={muscleColors.shoulders || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M115 60 Q105 55 87 58 L87 78 Q105 75 115 70Z" fill={muscleColors.shoulders || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Chest */}
          <Path d="M73 58 L87 58 L87 95 Q80 100 73 95Z" fill={muscleColors.chest || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Biceps */}
          <Path d="M45 70 Q42 80 40 100 Q42 110 48 105 Q52 95 50 78Z" fill={muscleColors.biceps || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M115 70 Q118 80 120 100 Q118 110 112 105 Q108 95 110 78Z" fill={muscleColors.biceps || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Forearms */}
          <Path d="M40 105 Q38 120 35 140 Q40 142 43 138 Q46 120 48 105Z" fill={outline} stroke={outline} strokeWidth={0.5} />
          <Path d="M120 105 Q122 120 125 140 Q120 142 117 138 Q114 120 112 105Z" fill={outline} stroke={outline} strokeWidth={0.5} />

          {/* Abs */}
          <Path d="M73 95 Q80 100 87 95 L87 150 Q80 155 73 150Z" fill={muscleColors.abs || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Quads */}
          <Path d="M63 155 L77 155 L75 220 Q70 225 63 218Z" fill={muscleColors.quads || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M97 155 L83 155 L85 220 Q90 225 97 218Z" fill={muscleColors.quads || defaultFill} stroke={outline} strokeWidth={0.5} />

          {/* Calves */}
          <Path d="M63 222 Q67 230 68 250 Q65 260 62 255 Q60 240 62 225Z" fill={muscleColors.calves || defaultFill} stroke={outline} strokeWidth={0.5} />
          <Path d="M97 222 Q93 230 92 250 Q95 260 98 255 Q100 240 98 225Z" fill={muscleColors.calves || defaultFill} stroke={outline} strokeWidth={0.5} />
        </G>
      </Svg>
    </View>
  );
}
