import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { CrateArtByRarity } from "./CrateArt";
import { useStaggerEntrance } from "@/hooks/use-stagger-entrance";
import { useGlowPulse } from "@/hooks/use-glow-pulse";
import { usePressScale } from "@/hooks/use-press-scale";

const RARITY_GLOW_COLORS = {
  common: "#aaa8c3",
  rare: "#81ecff",
  epic: "#ce96ff",
  legendary: "#ffd709",
} as const;

const CRATE_TIERS = [
  { rarity: "common" as const, name: "Common Crate", color: "#aaa8c3", cost: "80 Diamonds", shadowColor: "#aaa8c3" },
  { rarity: "rare" as const, name: "Rare Crate", color: "#81ecff", cost: "200 Diamonds", shadowColor: "#81ecff" },
  { rarity: "epic" as const, name: "Epic Crate", color: "#ce96ff", cost: "500 Diamonds", shadowColor: "#ce96ff" },
  { rarity: "legendary" as const, name: "Legendary Crate", color: "#ffd709", cost: "1,500 Diamonds", shadowColor: "#ffd709" },
] as const;

function CrateCard({
  crate,
  index,
}: {
  crate: typeof CRATE_TIERS[number];
  index: number;
}) {
  const { animatedStyle: staggerStyle } = useStaggerEntrance(index, 80, 280);
  const { glowStyle } = useGlowPulse(
    RARITY_GLOW_COLORS[crate.rarity],
    0.25,
    0.6,
    2600,
    true,
  );
  const { animatedStyle: pressStyle, onPressIn, onPressOut } = usePressScale(0.97);

  return (
    <Animated.View style={[styles.cardWrapper, staggerStyle]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <Animated.View
          style={[
            styles.card,
            {
              borderWidth: 1.5,
              borderColor: crate.color,
              elevation: 12,
            },
            glowStyle,
            pressStyle,
          ]}
        >
          <View style={styles.crateArtContainer}>
            <CrateArtByRarity rarity={crate.rarity} size={80} />
          </View>
          <Text style={[styles.crateName, { color: crate.color }]}>
            {crate.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.diamondIcon, { color: crate.color }]}>
              💎
            </Text>
            <Text style={[styles.cost, { color: "#e5e3ff" }]}>
              {crate.cost}
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>SOON</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function CratePreview() {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {CRATE_TIERS.map((crate, index) => (
          <CrateCard key={crate.name} crate={crate} index={index} />
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
  crateArtContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
