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
                  shadowColor: crate.color,
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 6,
                },
              ]}
            >
              <FontAwesome name="cube" size={28} color={crate.color} />
              <Text style={[styles.crateName, { color: crate.color }]}>
                {crate.name}
              </Text>
              <Text style={styles.cost}>{crate.cost}</Text>

              <View style={styles.overlay}>
                <Text style={styles.overlayText}>COMING SOON</Text>
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
    gap: 12,
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
  cost: {
    fontFamily: "BeVietnamPro-Regular",
    color: "#74738b",
    fontSize: 11,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(12,12,31,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    fontFamily: "Lexend-SemiBold",
    color: "#74738b",
    fontSize: 9,
    letterSpacing: 1,
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
