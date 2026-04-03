import React from "react";
import { View, Text } from "react-native";

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

interface HRZoneBarProps {
  readonly breakdown: ReadonlyArray<{
    readonly zone: 1 | 2 | 3 | 4 | 5;
    readonly minutes: number;
    readonly points: number;
  }>;
  readonly totalMinutes: number;
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
      {/* Stacked bar */}
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
            <View
              key={entry.zone}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: ZONE_COLORS[entry.zone],
                borderTopLeftRadius: index === 0 ? 9999 : 0,
                borderBottomLeftRadius: index === 0 ? 9999 : 0,
                borderTopRightRadius:
                  index === activeZones.length - 1 ? 9999 : 0,
                borderBottomRightRadius:
                  index === activeZones.length - 1 ? 9999 : 0,
              }}
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
