import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const CRATE_TIERS = [
  { name: "Common Crate", color: "#aaa8c3", cost: "80 Diamonds" },
  { name: "Rare Crate", color: "#81ecff", cost: "200 Diamonds" },
  { name: "Epic Crate", color: "#ce96ff", cost: "500 Diamonds" },
  { name: "Legendary Crate", color: "#ffd709", cost: "1,500 Diamonds" },
] as const;

export default function CratePreview() {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {CRATE_TIERS.map((crate) => (
          <View key={crate.name} style={styles.cardWrapper}>
            <View
              style={[
                styles.card,
                {
                  borderWidth: 1.5,
                  borderColor: crate.color,
                  shadowColor: crate.color,
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                },
              ]}
            >
              <FontAwesome name="cube" size={38} color={crate.color} />
              <Text style={[styles.crateName, { color: crate.color }]}>
                {crate.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.diamondIcon, { color: crate.color }]}>
                  💎
                </Text>
                <Text style={[styles.cost, { color: '#e5e3ff' }]}>
                  {crate.cost}
                </Text>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>SOON</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Open crates to discover cosmetics from Common to Legendary rarity.
        </Text>
        <Text style={styles.infoText}>
          Duplicate items convert to Iron Chips for the Forge exchange.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  cardWrapper: {
    width: "47%",
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#1d1d37",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    position: "relative",
    overflow: "hidden",
  },
  crateName: {
    fontFamily: "Lexend-SemiBold",
    fontSize: 13,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  diamondIcon: {
    fontSize: 11,
  },
  cost: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#e5e3ff",
    fontSize: 11,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(12,12,31,0.75)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: "Lexend-SemiBold",
    color: "#74738b",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  infoContainer: {
    gap: 6,
  },
  infoText: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#74738b",
    fontSize: 12,
    textAlign: "center",
  },
});
