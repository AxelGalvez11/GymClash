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

interface BodyFigureFrontProps {
  readonly muscleColors: Record<MuscleGroup, string>;
  readonly width?: number;
  readonly height?: number;
}

export function BodyFigureFront({
  muscleColors,
  width = 188,
  height = 338,
}: BodyFigureFrontProps) {
  const defaultFill = '#23233f';
  const bodyStroke = '#5f607c55';
  const contour = '#b8b5d911';
  const contourStrong = '#c8c5ea1f';
  const neutralFill = '#16172c';
  const neutralRaised = '#1b1d34';

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
          <LinearGradient id="frontBodyBase" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#20233d" />
            <Stop offset="0.45" stopColor="#17182d" />
            <Stop offset="1" stopColor="#111221" />
          </LinearGradient>

          <LinearGradient id="frontBodySheen" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.08" />
            <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0.02" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id="frontChestGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chest} stopOpacity="0.96" />
            <Stop offset="1" stopColor={chest} stopOpacity="0.74" />
          </LinearGradient>

          <LinearGradient id="frontShoulderGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={shoulders} stopOpacity="0.96" />
            <Stop offset="1" stopColor={shoulders} stopOpacity="0.7" />
          </LinearGradient>

          <LinearGradient id="frontBicepsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={biceps} stopOpacity="0.95" />
            <Stop offset="1" stopColor={biceps} stopOpacity="0.68" />
          </LinearGradient>

          <LinearGradient id="frontAbsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={abs} stopOpacity="0.82" />
            <Stop offset="0.55" stopColor={abs} stopOpacity="0.98" />
            <Stop offset="1" stopColor={abs} stopOpacity="0.75" />
          </LinearGradient>

          <LinearGradient id="frontQuadsGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={quads} stopOpacity="0.96" />
            <Stop offset="1" stopColor={quads} stopOpacity="0.7" />
          </LinearGradient>

          <LinearGradient id="frontCalvesGrad" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#frontBodyBase)"
            stroke={bodyStroke}
            strokeWidth={1.1}
          />

          <Path
            d="M88 11 Q95 6 100 6 Q105 6 112 11 Q116 18 115 30 Q114 40 108 46 Q106 51 106 58 L116 59
               Q128 60 136 69 Q143 77 145 88 Q136 76 126 74 Q113 72 100 72 Q87 72 74 74 Q64 76 55 88
               Q57 77 64 69 Q72 60 84 59 L94 58 Q94 51 92 46 Q86 40 85 30 Q84 18 88 11Z"
            fill="url(#frontBodySheen)"
          />

          <Path
            d="M82 60 Q92 56 100 56 Q108 56 118 60 L114 72 Q107 70 100 70 Q93 70 86 72Z"
            fill={neutralRaised}
            opacity={0.9}
          />

          <Path
            d="M59 74 Q69 63 85 64 Q87 76 85 93 Q72 92 59 84 Q55 80 59 74Z"
            fill="url(#frontShoulderGrad)"
            stroke={contourStrong}
            strokeWidth={0.75}
          />
          <Path
            d="M141 74 Q131 63 115 64 Q113 76 115 93 Q128 92 141 84 Q145 80 141 74Z"
            fill="url(#frontShoulderGrad)"
            stroke={contourStrong}
            strokeWidth={0.75}
          />

          <Path
            d="M87 72 Q94 68 100 68 Q106 68 113 72 L111 89 Q100 93 89 89Z"
            fill="#2a2c46"
            opacity={0.95}
          />
          <Path
            d="M71 77 Q79 73 88 76 L89 108 Q81 112 73 106 Q67 99 68 88 Q68 81 71 77Z"
            fill="url(#frontChestGrad)"
            stroke={contour}
            strokeWidth={0.6}
          />
          <Path
            d="M129 77 Q121 73 112 76 L111 108 Q119 112 127 106 Q133 99 132 88 Q132 81 129 77Z"
            fill="url(#frontChestGrad)"
            stroke={contour}
            strokeWidth={0.6}
          />
          <Path
            d="M88 76 Q94 74 100 74 Q106 74 112 76"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M100 74 L100 112"
            stroke={contour}
            strokeWidth={0.65}
            strokeLinecap="round"
          />
          <Path
            d="M74 107 Q87 116 100 116 Q113 116 126 107"
            stroke={contourStrong}
            strokeWidth={0.65}
          />

          <Path
            d="M56 87 Q63 86 67 92 Q69 99 68 109 Q66 122 61 128 Q56 131 52 127 Q49 117 50 105 Q51 94 56 87Z"
            fill="url(#frontBicepsGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M144 87 Q137 86 133 92 Q131 99 132 109 Q134 122 139 128 Q144 131 148 127 Q151 117 150 105 Q149 94 144 87Z"
            fill="url(#frontBicepsGrad)"
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
            d="M80 112 Q89 119 100 119 Q111 119 120 112 L121 146 Q111 150 100 150 Q89 150 79 146Z"
            fill="url(#frontAbsGrad)"
            stroke={contour}
            strokeWidth={0.6}
          />
          <Path
            d="M78 113 Q73 130 74 151 L81 152 L81 113Z"
            fill={abs}
            opacity={0.5}
            stroke={contour}
            strokeWidth={0.45}
          />
          <Path
            d="M122 113 Q127 130 126 151 L119 152 L119 113Z"
            fill={abs}
            opacity={0.5}
            stroke={contour}
            strokeWidth={0.45}
          />
          <Path d="M100 118 L100 176" stroke={contourStrong} strokeWidth={0.7} strokeLinecap="round" />
          <Path d="M84 126 Q92 124 100 124 Q108 124 116 126" stroke={contourStrong} strokeWidth={0.55} />
          <Path d="M84 138 Q92 136 100 136 Q108 136 116 138" stroke={contourStrong} strokeWidth={0.55} />
          <Path d="M84 150 Q92 148 100 148 Q108 148 116 150" stroke={contourStrong} strokeWidth={0.55} />
          <Path
            d="M82 149 Q90 154 100 154 Q110 154 118 149 L116 176 Q109 182 100 184 Q91 182 84 176Z"
            fill={abs}
            opacity={0.72}
            stroke={contour}
            strokeWidth={0.55}
          />
          <Path d="M75 120 Q69 127 69 137" stroke={contour} strokeWidth={0.55} />
          <Path d="M125 120 Q131 127 131 137" stroke={contour} strokeWidth={0.55} />
          <Path d="M73 140 Q71 151 75 162" stroke={contour} strokeWidth={0.55} />
          <Path d="M127 140 Q129 151 125 162" stroke={contour} strokeWidth={0.55} />

          <Path
            d="M80 176 Q88 181 100 181 Q112 181 120 176 L118 194 Q109 199 100 199 Q91 199 82 194Z"
            fill="#17182a"
            opacity={0.92}
          />

          <Path
            d="M77 194 Q85 192 90 196 Q92 206 91 220 Q90 242 88 270 Q84 278 78 274 Q75 244 75 214 Q75 201 77 194Z"
            fill="url(#frontQuadsGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M123 194 Q115 192 110 196 Q108 206 109 220 Q110 242 112 270 Q116 278 122 274 Q125 244 125 214 Q125 201 123 194Z"
            fill="url(#frontQuadsGrad)"
            stroke={contourStrong}
            strokeWidth={0.65}
          />
          <Path
            d="M90 196 Q97 194 100 194 Q103 194 110 196 Q110 217 107 244 Q104 259 100 260 Q96 259 93 244 Q90 217 90 196Z"
            fill={quads}
            opacity={0.46}
            stroke={contour}
            strokeWidth={0.5}
          />
          <Path d="M83 214 Q87 208 92 206" stroke={contour} strokeWidth={0.55} />
          <Path d="M117 214 Q113 208 108 206" stroke={contour} strokeWidth={0.55} />
          <Path d="M85 241 Q90 246 95 248" stroke={contourStrong} strokeWidth={0.55} />
          <Path d="M115 241 Q110 246 105 248" stroke={contourStrong} strokeWidth={0.55} />

          <Circle cx="87" cy="281" r="6" fill="#151629" stroke={bodyStroke} strokeWidth={0.5} />
          <Circle cx="113" cy="281" r="6" fill="#151629" stroke={bodyStroke} strokeWidth={0.5} />

          <Path
            d="M78 288 Q84 294 85 308 Q85 324 79 330 Q74 328 74 315 Q74 300 78 288Z"
            fill="url(#frontCalvesGrad)"
            stroke={contourStrong}
            strokeWidth={0.6}
          />
          <Path
            d="M122 288 Q116 294 115 308 Q115 324 121 330 Q126 328 126 315 Q126 300 122 288Z"
            fill="url(#frontCalvesGrad)"
            stroke={contourStrong}
            strokeWidth={0.6}
          />
          <Path
            d="M83 291 Q88 300 88 312"
            stroke={contour}
            strokeWidth={0.5}
          />
          <Path
            d="M117 291 Q112 300 112 312"
            stroke={contour}
            strokeWidth={0.5}
          />

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

          <Path d="M100 58 L100 71" stroke={contourStrong} strokeWidth={0.65} strokeLinecap="round" />
          <Path d="M67 93 Q60 106 59 121" stroke={contour} strokeWidth={0.55} />
          <Path d="M133 93 Q140 106 141 121" stroke={contour} strokeWidth={0.55} />
          <Path d="M76 177 Q70 183 67 194" stroke={contour} strokeWidth={0.55} />
          <Path d="M124 177 Q130 183 133 194" stroke={contour} strokeWidth={0.55} />
        </G>
      </Svg>
    </View>
  );
}
