import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { FontAwesome } from "@expo/vector-icons";
import { useEntrance } from "@/hooks/use-entrance";
import { useStaggerEntrance } from "@/hooks/use-stagger-entrance";
import { usePressScale } from "@/hooks/use-press-scale";

const POWER_UPS = [
  {
    name: "2x Session Points",
    icon: "star" as const,
    color: "#ffd709",
    description: "Double your point output for one session",
    cost: "100",
  },
  {
    name: "XP Boost Token",
    icon: "rocket" as const,
    color: "#ce96ff",
    description: "1.5x XP earned for 3 sessions",
    cost: "150",
  },
  {
    name: "Score Shield",
    icon: "shield" as const,
    color: "#81ecff",
    description: "Block score reduction for your next flagged workout",
    cost: "200",
  },
] as const;

function PowerUpCard({
  powerUp,
  index,
}: {
  powerUp: typeof POWER_UPS[number];
  index: number;
}) {
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 80, 280);
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          shadowColor: powerUp.color,
          shadowOpacity: 0.25,
          shadowRadius: 14,
          borderColor: `${powerUp.color}25`,
        },
        staggerStyle,
        pressStyle,
      ]}
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${powerUp.color}26` },
        ]}
      >
        <FontAwesome
          name={powerUp.icon}
          size={20}
          color={powerUp.color}
        />
      </View>

      <View style={styles.middle}>
        <Text style={styles.name}>{powerUp.name}</Text>
        <Text style={styles.description}>{powerUp.description}</Text>
      </View>

      <View style={styles.costPill}>
        <FontAwesome name="diamond" size={10} color="#ce96ff" />
        <Text style={styles.costText}>{powerUp.cost}</Text>
      </View>

      <View
        style={[
          styles.badge,
          { backgroundColor: `${powerUp.color}18` },
        ]}
      >
        <Text style={[styles.badgeText, { color: powerUp.color }]}>
          SOON
        </Text>
      </View>
    </Animated.View>
  );
}

export default function PowerUpPreview() {
  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide', 280);

  return (
    <Animated.View style={[styles.container, headerStyle]}>
      <Text style={styles.sectionHeader}>Power-Ups</Text>
      <Text style={styles.sectionSubtitle}>Boost your performance with temporary enhancements</Text>
      <View style={styles.list}>
        {POWER_UPS.map((powerUp, index) => (
          <PowerUpCard key={powerUp.name} powerUp={powerUp} index={index} />
        ))}
      </View>

      <Text style={styles.infoText}>
        Power-Ups are purchased with Diamonds and do not affect leaderboard
        trophy counts.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionHeader: {
    color: "#e5e3ff",
    fontFamily: "Epilogue-Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: "#74738b",
    fontFamily: "BeVietnamPro-Regular",
    fontSize: 12,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#1a1a32",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    elevation: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  middle: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  name: {
    fontFamily: "Lexend-SemiBold",
    color: "#e5e3ff",
    fontSize: 14,
  },
  description: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#74738b",
    fontSize: 12,
  },
  costPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  costText: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#ce96ff",
    fontSize: 13,
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#23233f",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "Lexend-SemiBold",
    color: "#74738b",
    fontSize: 8,
  },
  infoText: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#74738b",
    fontSize: 12,
    textAlign: "center",
  },
});
