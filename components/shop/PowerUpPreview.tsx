import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

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
] as const;

export default function PowerUpPreview() {
  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {POWER_UPS.map((powerUp) => (
          <View key={powerUp.name} style={styles.card}>
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

            <View style={styles.badge}>
              <Text style={styles.badgeText}>SOON</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.infoText}>
        Power-Ups are purchased with Diamonds and do not affect leaderboard
        trophy counts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: "#1d1d37",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
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
