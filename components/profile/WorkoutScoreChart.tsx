import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import Svg, {
  Polyline,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Text as SvgText,
  Path,
} from 'react-native-svg';

import { Colors } from '@/constants/theme';

// Design palette — pulls from theme
const VP = {
  surface:   Colors.surface.DEFAULT,
  raised:    Colors.surface.container,
  active:    Colors.surface.containerHigh,
  textPri:   Colors.text.primary,
  textSec:   Colors.text.secondary,
  textMuted: Colors.text.muted,
  primary:   Colors.primary.DEFAULT,
  gold:      Colors.secondary.DEFAULT,
  cyan:      Colors.tertiary.DEFAULT,
} as const;

interface Props {
  workouts: Array<{
    created_at: string;
    type: string;
    final_score?: number;
    raw_score?: number;
  }>;
}

const WorkoutScoreChart: React.FC<Props> = ({ workouts }) => {
  const { width: screenWidth } = useWindowDimensions();

  // Prepare data
  const chartData = useMemo(() => {
    if (!workouts || workouts.length < 1) {
      return { dataPoints: [], avgScore: 0, hasData: false, types: new Set() };
    }

    // Take last 20 workouts and reverse (oldest to newest for left→right)
    const last20 = workouts.slice(0, 20).reverse();

    // Calculate score for each workout
    const dataPoints = last20.map((w) => ({
      score: w.final_score ?? w.raw_score ?? 0,
      type: w.type,
    }));

    // Calculate average
    const totalScore = dataPoints.reduce((sum, dp) => sum + dp.score, 0);
    const avgScore = dataPoints.length > 0 ? totalScore / dataPoints.length : 0;

    // Determine types
    const types = new Set(dataPoints.map((dp) => dp.type));

    return {
      dataPoints,
      avgScore,
      hasData: dataPoints.length >= 2,
      types,
    };
  }, [workouts]);

  // Determine line colors based on workout types
  const getLineColor = () => {
    const hasStrength = chartData.types.has('strength');
    const hasCardio =
      chartData.types.has('scout') ||
      chartData.types.has('active_recovery') ||
      chartData.types.has('hiit');

    if (hasStrength && hasCardio) {
      return 'gradient'; // gradient from purple to cyan
    } else if (hasCardio) {
      return VP.cyan;
    } else {
      return VP.primary; // default to purple
    }
  };

  const lineColor = getLineColor();

  // Empty state
  if (chartData.dataPoints.length < 2) {
    return (
      <View
        style={{
          backgroundColor: VP.active,
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: VP.textPri,
            fontFamily: 'Epilogue-Bold',
            fontSize: 16,
            marginBottom: 4,
          }}
        >
          Score Trend
        </Text>
        <Text
          style={{
            color: VP.textMuted,
            fontFamily: 'Lexend-SemiBold',
            fontSize: 11,
            marginBottom: 16,
          }}
        >
          Last 20 workouts
        </Text>
        <Text
          style={{
            color: VP.textMuted,
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 14,
            textAlign: 'center',
            paddingVertical: 40,
          }}
        >
          Complete more workouts to see your score trend
        </Text>
      </View>
    );
  }

  // Chart dimensions
  const chartWidth = screenWidth - 32; // 16px padding on each side
  const chartHeight = 100;
  const dataLength = chartData.dataPoints.length;

  // Calculate Y scale (find min and max scores)
  const scores = chartData.dataPoints.map((dp) => dp.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreRange = maxScore === minScore ? 1 : maxScore - minScore;

  // Spacing between points
  const pointSpacing = dataLength > 1 ? chartWidth / (dataLength - 1) : chartWidth / 2;

  // Calculate coordinates for polyline
  const points = chartData.dataPoints.map((dp, idx) => {
    const x = idx * pointSpacing;
    // Normalize score to chart height (0 = bottom, chartHeight = top)
    const yNormalized = (dp.score - minScore) / scoreRange;
    const y = chartHeight - yNormalized * chartHeight;
    return { x, y };
  });

  // Build polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Build path for gradient fill (polygon under the line)
  let fillPath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    fillPath += ` L ${points[i].x} ${points[i].y}`;
  }
  // Close the path at the bottom
  fillPath += ` L ${points[points.length - 1].x} ${chartHeight}`;
  fillPath += ` L ${points[0].x} ${chartHeight}`;
  fillPath += ' Z';

  // Compute average score Y position
  const avgYNormalized = (chartData.avgScore - minScore) / scoreRange;
  const avgY = chartHeight - avgYNormalized * chartHeight;

  return (
    <View
      style={{
        backgroundColor: VP.active,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <Text
        style={{
          color: VP.textPri,
          fontFamily: 'Epilogue-Bold',
          fontSize: 16,
          marginBottom: 4,
        }}
      >
        Score Trend
      </Text>
      <Text
        style={{
          color: VP.textMuted,
          fontFamily: 'Lexend-SemiBold',
          fontSize: 11,
          marginBottom: 12,
        }}
      >
        Last 20 workouts
      </Text>

      {/* SVG Chart */}
      <Svg width={chartWidth} height={chartHeight + 20} style={{ marginBottom: 8 }}>
        <Defs>
          {/* Gradient for fill under the line */}
          {lineColor === 'gradient' ? (
            <LinearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={VP.primary} stopOpacity="0.2" />
              <Stop offset="1" stopColor={VP.primary} stopOpacity="0" />
            </LinearGradient>
          ) : (
            <LinearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.2" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          )}

          {/* Gradient for line (if mixed types) */}
          {lineColor === 'gradient' && (
            <LinearGradient id="scoreGradientLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={VP.primary} stopOpacity="1" />
              <Stop offset="1" stopColor={VP.cyan} stopOpacity="1" />
            </LinearGradient>
          )}
        </Defs>

        {/* Fill under the line */}
        <Path
          d={fillPath}
          fill="url(#scoreFill)"
          stroke="none"
        />

        {/* Average line (dashed) */}
        <Line
          x1="0"
          y1={avgY}
          x2={chartWidth}
          y2={avgY}
          stroke={VP.textMuted}
          strokeWidth="1"
          strokeDasharray="4,3"
        />

        {/* Average label */}
        <SvgText
          x={chartWidth - 2}
          y={avgY - 4}
          fontSize="10"
          fill={VP.textMuted}
          fontFamily="Lexend-SemiBold"
          textAnchor="end"
        >
          avg {Math.round(chartData.avgScore)}
        </SvgText>

        {/* Polyline for the score data */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor === 'gradient' ? 'url(#scoreGradientLine)' : lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point circles with glow */}
        {points.map((p, idx) => (
          <React.Fragment key={`point-${idx}`}>
            {/* Glow circle (semi-transparent larger circle) */}
            <Circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill={lineColor === 'gradient' ? VP.primary : lineColor}
              opacity="0.15"
            />
            {/* Main data point circle */}
            <Circle
              cx={p.x}
              cy={p.y}
              r="3"
              fill={lineColor === 'gradient' ? VP.primary : lineColor}
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

export default WorkoutScoreChart;
