import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import type { MuscleGroup } from '@/lib/analytics/muscle-mapping';

interface BodyFigureBackProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureBack({
  muscleColors,
  width = 188,
  height = 338,
}: BodyFigureBackProps) {
  const defaultFill = '#23233f';
  const bodyStroke = '#5f607c55';
  const contour = '#b8b5d911';
  const contourStrong = '#c8c5ea1f';
  const neutralFill = '#16172c';
  const neutralRaised = '#1b1d34';

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
          <LinearGradient id="backBodyBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1f213b" />
            <Stop offset="0.45" stopColor="#17182d" />
            <Stop offset="1" stopColor="#10111f" />
          </LinearGradient>

          <LinearGradient id="backBodySheen" x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
            <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0.015" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id="backTrapGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={upperBack} stopOpacity="0.95" />
            <Stop offset="1" stopColor={upperBack} stopOpacity="0.74" />
          </LinearGradient>

          <LinearGradient id="backShoulderGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shoulders} stopOpacity="0.95" />
            <Stop offset="1" stopColor={shoulders} stopOpacity="0.72" />
          </LinearGradient>

          <LinearGradient id="backTricepsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={triceps} stopOpacity="0.95" />
            <Stop offset="1" stopColor={triceps} stopOpacity="0.7" />
          </LinearGradient>

          <LinearGradient id="backLatGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lats} stopOpacity="0.9" />
            <Stop offset="1" stopColor={lats} stopOpacity="0.72" />
          </LinearGradient>

          <LinearGradient id="backLowerGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lowerBack} stopOpacity="0.88" />
            <Stop offset="1" stopColor={lowerBack} stopOpacity="0.72" />
          </LinearGradient>

          <LinearGradient id="backGluteGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={glutes} stopOpacity="0.95" />
            <Stop offset="1" stopColor={glutes} stopOpacity="0.74" />
          </LinearGradient>

          <LinearGradient id="backHamGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hamstrings} stopOpacity="0.95" />
            <Stop offset="1" stopColor={hamstrings} stopOpacity="0.7" />
          </LinearGradient>

          <LinearGradient id="backCalfGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={calves} stopOpacity="0.9" />
            <Stop offset="1" stopColor={calves} stopOpacity="0.68" />
          </LinearGradient>
        </Defs>

        <G>
          <Path
            d="M86 10 Q94 3 100 3 Q106 3 114 10 Q119 18 118 30 Q117 43 109 50 Q106 55 106 62 L118 62
               Q131 63 141 72 Q150 83 151 97 L155 124 Q157 142 157 162 Q154 168 147 167 L143 138 Q141 124 138 113
               L134 158 Q131 176 124 191 L126 278 Q123 286 116 286 Q111 285 109 278 L104 198 L96 198 L91 278
               Q89 285 84 286 Q77 286 74 278 L76 191 Q69 176 66 158 L62 113 Q59 124 57 138 L53 167 Q46 168 43 162
               Q43 142 45 124 L49 97 Q50 83 59 72 Q69 63 82 62 L94 62 Q94 55 91 50 Q83 43 82 30 Q81 18 86 10Z"
            fill="url(#backBodyBase)"
            stroke={bodyStroke}
            strokeWidth={1.1}
          />

          <Path
            d="M88 11 Q95 6 100 6 Q105 6 112 11 Q116 18 115 30 Q114 40 108 46 Q106 51 106 58 L116 59
               Q128 60 136 69 Q143 77 145 88 Q136 77 126 75 Q111 72 100 72 Q89 72 74 75 Q64 77 55 88
               Q57 77 64 69 Q72 60 84 59 L94 58 Q94 51 92 46 Q86 40 85 30 Q84 18 88 11Z"
            fill="url(#backBodySheen)"
          />

          <Path
            d="M82 60 Q92 56 100 56 Q108 56 118 60 L114 72 Q107 70 100 70 Q93 70 86 72Z"
            fill={neutralRaised}
            opacity={0.94}
          />

          <Path
            d="M77 61 Q88 56 100 56 Q112 56 123 61 L118 78 Q109 74 100 74 Q91 74 82 78Z"
            fill="url(#backTrapGrad)"
            stroke={contourStrong}
            strokeWidth={0.7}
          />
          <Path d="M100 58 L100 84" stroke={contourStrong} strokeWidth={0.7} strokeLinecap="round" />

          <Path
            d="M58 74 Q68 64 82 66 Q84 79 82 93 Q69 93 58 84 Q54 79 58 74Z"
            fill="url(#backShoulderGrad)"
            stroke={contourStrong}
            strokeWidth={0.75}
          />
          <Path
            d="M142 74 Q132 64 118 66 Q116 79 118 93 Q131 93 142 84 Q146 79 142 74Z"
            fill="url(#backShoulderGrad)"
            stroke={contourStrong}
            strokeWidth={0.75}
          />

          <Path
            d="M54 88 Q60 86 65 91 Q69 101 68 113 Q66 123 61 129 Q56 132 51 127 Q48 118 49 104 Q50 94 54 88Z"
            fill="url(#backTricepsGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M146 88 Q140 86 135 91 Q131 101 132 113 Q134 123 139 129 Q144 132 149 127 Q152 118 151 104 Q150 94 146 88Z"
            fill="url(#backTricepsGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />

          <Path
            d="M50 127 Q47 138 45 152 Q47 161 53 158 Q58 145 60 129 Q55 127 50 127Z"
            fill={neutralFill}
            stroke={bodyStroke}
            strokeWidth={0.55}
          />
          <Path
            d="M150 127 Q153 138 155 152 Q153 161 147 158 Q142 145 140 129 Q145 127 150 127Z"
            fill={neutralFill}
            stroke={bodyStroke}
            strokeWidth={0.55}
          />
          <Path
            d="M45 152 Q43 164 45 172 Q49 176 54 169 Q55 160 53 158Z"
            fill="#1b1d30"
            stroke={bodyStroke}
            strokeWidth={0.45}
          />
          <Path
            d="M155 152 Q157 164 155 172 Q151 176 146 169 Q145 160 147 158Z"
            fill="#1b1d30"
            stroke={bodyStroke}
            strokeWidth={0.45}
          />

          <Path
            d="M82 77 Q92 74 100 74 Q108 74 118 77 L116 97 Q108 100 100 100 Q92 100 84 97Z"
            fill={upperBack}
            opacity={0.56}
            stroke={contour}
            strokeWidth={0.55}
          />
          <Path
            d="M69 80 Q76 78 82 82 Q84 101 81 123 Q74 129 66 119 Q63 102 65 90 Q66 84 69 80Z"
            fill="url(#backLatGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M131 80 Q124 78 118 82 Q116 101 119 123 Q126 129 134 119 Q137 102 135 90 Q134 84 131 80Z"
            fill="url(#backLatGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M84 93 Q92 99 100 99 Q108 99 116 93 L116 121 Q108 127 100 127 Q92 127 84 121Z"
            fill={upperBack}
            opacity={0.76}
            stroke={contour}
            strokeWidth={0.55}
          />

          <Path
            d="M86 121 Q93 126 100 126 Q107 126 114 121 L116 154 Q109 159 100 160 Q91 159 84 154Z"
            fill="url(#backLowerGrad)"
            stroke={contourStrong}
            strokeWidth={0.6}
          />
          <Path d="M100 83 L100 194" stroke={contourStrong} strokeWidth={0.7} strokeLinecap="round" />
          <Path d="M92 123 Q90 136 90 155" stroke={contourStrong} strokeWidth={0.5} />
          <Path d="M108 123 Q110 136 110 155" stroke={contourStrong} strokeWidth={0.5} />
          <Path d="M79 111 Q84 115 89 116" stroke={contour} strokeWidth={0.55} />
          <Path d="M121 111 Q116 115 111 116" stroke={contour} strokeWidth={0.55} />

          <Path
            d="M78 156 Q89 153 100 153 Q111 153 122 156 L120 188 Q110 195 100 196 Q90 195 80 188Z"
            fill="url(#backGluteGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path d="M100 154 L100 195" stroke={contourStrong} strokeWidth={0.7} strokeLinecap="round" />
          <Path d="M85 164 Q91 172 92 182" stroke={contour} strokeWidth={0.55} />
          <Path d="M115 164 Q109 172 108 182" stroke={contour} strokeWidth={0.55} />

          <Path
            d="M77 191 Q84 189 89 194 Q92 207 91 221 Q90 243 88 271 Q84 278 78 274 Q75 246 75 216 Q75 200 77 191Z"
            fill="url(#backHamGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M123 191 Q116 189 111 194 Q108 207 109 221 Q110 243 112 271 Q116 278 122 274 Q125 246 125 216 Q125 200 123 191Z"
            fill="url(#backHamGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M89 194 Q96 192 100 192 Q104 192 111 194 Q110 218 107 246 Q104 260 100 261 Q96 260 93 246 Q90 218 89 194Z"
            fill={hamstrings}
            opacity={0.38}
            stroke={contour}
            strokeWidth={0.5}
          />
          <Path d="M84 219 Q87 212 93 209" stroke={contour} strokeWidth={0.55} />
          <Path d="M116 219 Q113 212 107 209" stroke={contour} strokeWidth={0.55} />

          <Circle cx="87" cy="281" r="6" fill="#151629" stroke={bodyStroke} strokeWidth={0.5} />
          <Circle cx="113" cy="281" r="6" fill="#151629" stroke={bodyStroke} strokeWidth={0.5} />

          <Path
            d="M78 288 Q84 294 85 308 Q85 324 79 330 Q74 328 74 315 Q74 300 78 288Z"
            fill="url(#backCalfGrad)"
            stroke={contourStrong}
            strokeWidth={0.6}
          />
          <Path
            d="M122 288 Q116 294 115 308 Q115 324 121 330 Q126 328 126 315 Q126 300 122 288Z"
            fill="url(#backCalfGrad)"
            stroke={contourStrong}
            strokeWidth={0.6}
          />
          <Path d="M83 291 Q88 300 88 312" stroke={contour} strokeWidth={0.5} />
          <Path d="M117 291 Q112 300 112 312" stroke={contour} strokeWidth={0.5} />

          <Path
            d="M75 331 Q79 338 85 341 Q91 341 92 337 Q86 331 80 327Z"
            fill="#18192d"
            stroke={bodyStroke}
            strokeWidth={0.45}
          />
          <Path
            d="M125 331 Q121 338 115 341 Q109 341 108 337 Q114 331 120 327Z"
            fill="#18192d"
            stroke={bodyStroke}
            strokeWidth={0.45}
          />

          <Path d="M67 93 Q60 105 59 121" stroke={contour} strokeWidth={0.55} />
          <Path d="M133 93 Q140 105 141 121" stroke={contour} strokeWidth={0.55} />
          <Path d="M76 177 Q70 184 67 194" stroke={contour} strokeWidth={0.55} />
          <Path d="M124 177 Q130 184 133 194" stroke={contour} strokeWidth={0.55} />
        </G>
      </Svg>
    </View>
  );
}
