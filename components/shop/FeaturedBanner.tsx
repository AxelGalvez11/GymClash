import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { CrateArtByRarity } from './CrateArt';

interface FeaturedBannerProps {
  itemName: string;
  rarity: 'epic' | 'legendary';
  label?: string;
  price?: number;
  currency?: 'diamonds' | 'coins';
  onPress?: () => void;
}

// Shimmer sweep: translates a highlight bar from left-to-right on a loop
function ShimmerOverlay({ borderColor }: { borderColor: string }) {
  const translateX = useSharedValue(-180);

  useEffect(() => {
    translateX.value = -180;
    translateX.value = withDelay(
      400,
      withRepeat(
        withTiming(360, {
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      ),
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

export default function FeaturedBanner({
  itemName,
  rarity,
  label,
  price,
  currency = 'diamonds',
  onPress,
}: FeaturedBannerProps) {
  const isLegendary = rarity === 'legendary';
  const colors = isLegendary
    ? (['#3d2800', '#1f1400'] as const)
    : (['#2a0d4a', '#1a0630'] as const);
  const borderColor = isLegendary ? '#ffd709' : '#ce96ff';

  return (
    <Pressable onPress={onPress} className="mb-6">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl overflow-hidden border-2 p-4"
        style={{
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Shimmer sweep across banner */}
        <ShimmerOverlay borderColor={borderColor} />

        {/* Left: Crate Art + Corner frames */}
        <View className="relative">
          {/* Corner frame decoration - top left */}
          <View
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 12,
              height: 12,
              borderTopWidth: 1.5,
              borderLeftWidth: 1.5,
              borderColor,
            }}
          />
          {/* Corner frame decoration - bottom right */}
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              right: -8,
              width: 12,
              height: 12,
              borderBottomWidth: 1.5,
              borderRightWidth: 1.5,
              borderColor,
            }}
          />

          <CrateArtByRarity rarity={rarity} size={80} />
        </View>

        {/* Right: Text content */}
        <View className="flex-1 gap-2">
          {label && (
            <Text
              style={{
                color: '#81ecff',
                fontFamily: 'Lexend-Bold',
                fontSize: 10,
                letterSpacing: 1.2,
                fontWeight: '700',
              }}
            >
              {label}
            </Text>
          )}

          <Text
            style={{
              color: '#e5e3ff',
              fontFamily: 'Epilogue-Bold',
              fontSize: 18,
              fontWeight: '700',
              marginBottom: 4,
            }}
          >
            {itemName}
          </Text>

          {price !== undefined && (
            <View
              className="flex-row items-center gap-1"
              style={{
                backgroundColor: isLegendary ? 'rgba(255,215,9,0.15)' : 'rgba(206,150,255,0.15)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                alignSelf: 'flex-start',
              }}
            >
              <Text
                style={{
                  color: isLegendary ? '#ffd709' : '#ce96ff',
                  fontFamily: 'Lexend-Bold',
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {isLegendary ? '💎' : '💎'}
              </Text>
              <Text
                style={{
                  color: '#e5e3ff',
                  fontFamily: 'Lexend-Bold',
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {price}
              </Text>
              <Text
                style={{
                  color: isLegendary ? '#ffd709' : '#ce96ff',
                  fontFamily: 'Lexend-Regular',
                  fontSize: 10,
                  marginLeft: 2,
                }}
              >
                {currency === 'diamonds' ? 'Diamonds' : 'Coins'}
              </Text>
            </View>
          )}

          <Text
            style={{
              color: isLegendary ? '#ffd709' : '#ce96ff',
              fontFamily: 'Epilogue-Bold',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Get Now →
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shimmerBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  shimmerGradient: {
    flex: 1,
    width: 120,
  },
});
