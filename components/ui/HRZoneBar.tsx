import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const ZONE_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#94a3b8",
  2: "#22c55e",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const ZONE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Recovery",
  2: "Endurance",
  3: "Tempo",
  4: "Threshold",
  5: "Max",
};

interface ZoneEntry {
  readonly zone: 1 | 2 | 3 | 4 | 5;
  readonly minutes: number;
  readonly points: number;
}

interface HRZoneBarProps {
  readonly breakdown: ReadonlyArray<ZoneEntry>;
  readonly totalMinutes: number;
}

/** Single animated zone segment inside the stacked bar. */
function AnimatedZoneSegment({
  widthPercent,
  color,
  isFirst,
  isLast,
  index,
}: {
  widthPercent: number;
  color: string;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}) {
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    // Stagger each segment slightly so they fan in left-to-right
    animatedWidth.value = withDelay(
      index * 80,
      withTiming(widthPercent, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [widthPercent]);

  const style = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%` as `${number}%`,
    backgroundColor: color,
    borderTopLeftRadius: isFirst ? 9999 : 0,
    borderBottomLeftRadius: isFirst ? 9999 : 0,
    borderTopRightRadius: isLast ? 9999 : 0,
    borderBottomRightRadius: isLast ? 9999 : 0,
  }));

  return <Animated.View style={style} />;
}

export function HRZoneBar({ breakdown, totalMinutes }: HRZoneBarProps) {
  if (totalMinutes === 0 || breakdown.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <Text
          style={{
            fontFamily: "BeVietnamPro-Regular",
            fontSize: 12,
            color: "#74738b",
          }}
        >
          No HR data
        </Text>
      </View>
    );
  }

  const derivedTotal = breakdown.reduce((sum, e) => sum + e.minutes, 0);
  const safeTotal = derivedTotal > 0 ? derivedTotal : totalMinutes;

  const activeZones = breakdown.filter((entry) => entry.minutes > 0);
  const totalPoints = breakdown.reduce((sum, entry) => sum + entry.points, 0);

  return (
    <View style={{ gap: 8 }}>
      {/* Stacked animated bar */}
      <View
        style={{
          height: 12,
          borderRadius: 9999,
          backgroundColor: "#23233f",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {activeZones.map((entry, index) => {
          const widthPercent = (entry.minutes / safeTotal) * 100;
          return (
            <AnimatedZoneSegment
              key={entry.zone}
              widthPercent={widthPercent}
              color={ZONE_COLORS[entry.zone]}
              isFirst={index === 0}
              isLast={index === activeZones.length - 1}
              index={index}
            />
          );
        })}
      </View>

      {/* Legend row */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {activeZones.map((entry) => (
          <View
            key={entry.zone}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                backgroundColor: ZONE_COLORS[entry.zone],
              }}
            />
            <Text
              style={{
                fontFamily: "Lexend-SemiBold",
                fontSize: 10,
                color: "#aaa8c3",
              }}
            >
              {ZONE_LABELS[entry.zone]}: {entry.minutes}m
            </Text>
          </View>
        ))}
      </View>

      {/* Zone score */}
      <Text
        style={{
          fontFamily: "Lexend-SemiBold",
          fontSize: 12,
          color: "#ce96ff",
        }}
      >
        Zone Score: {totalPoints}
      </Text>
    </View>
  );
}
