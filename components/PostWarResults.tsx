import { useEffect } from 'react';
import { View, Text, Modal, Pressable, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePressScale } from '@/hooks/use-press-scale';

// Animated TextInput for count-up display driven on the UI thread
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface PostWarResultsProps {
  readonly visible: boolean;
  readonly onDismiss: () => void;
  readonly warData: {
    readonly weekNumber: number;
    readonly myScore: number;
    readonly opponentScore: number;
    readonly won: boolean;
    readonly draw: boolean;
    readonly trophyChange: number;
    readonly topContributors: ReadonlyArray<{
      readonly display_name: string;
      readonly contribution_points: number;
    }>;
  } | null;
}

function getResultConfig(won: boolean, draw: boolean) {
  if (draw) {
    return { label: 'DRAW', color: '#74738b', icon: 'minus-circle' as const };
  }
  if (won) {
    return { label: 'VICTORY', color: '#10B981', icon: 'trophy' as const };
  }
  return { label: 'DEFEAT', color: '#ff6e84', icon: 'times-circle' as const };
}

// ─── Count-up score counter ───────────────────────────────────────────────────
// Uses useAnimatedProps to drive the TextInput value on the UI thread,
// avoiding JS-thread addListener bridging.

function CountUpScore({
  target,
  color,
  delay: delayMs,
  visible,
}: {
  readonly target: number;
  readonly color: string;
  readonly delay: number;
  readonly visible: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withDelay(
        delayMs,
        withTiming(target, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [visible, target, delayMs, progress]);

  const animatedProps = useAnimatedProps(() => {
    const rounded = String(Math.round(progress.value));
    return { text: rounded, defaultValue: rounded };
  });

  return (
    <AnimatedTextInput
      animatedProps={animatedProps}
      editable={false}
      style={{ color, fontFamily: 'Lexend-SemiBold', fontSize: 30, fontWeight: 'bold', padding: 0 }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PostWarResults({
  visible,
  onDismiss,
  warData,
}: PostWarResultsProps) {
  // ── Backdrop + card entrance ────────────────────────────────────────────────
  const backdropOpacity = useSharedValue(0);
  const cardScale      = useSharedValue(0.7);
  const cardOpacity    = useSharedValue(0);

  // ── Result label entrance ───────────────────────────────────────────────────
  const labelScale   = useSharedValue(0.4);
  const labelOpacity = useSharedValue(0);

  // ── Staggered stat rows ─────────────────────────────────────────────────────
  const weekProgress         = useSharedValue(0);
  const scoreProgress        = useSharedValue(0);
  const trophyProgress       = useSharedValue(0);
  const contributorsProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset all values
      backdropOpacity.value = 0;
      cardScale.value       = 0.7;
      cardOpacity.value     = 0;
      labelScale.value      = 0.4;
      labelOpacity.value    = 0;
      weekProgress.value         = 0;
      scoreProgress.value        = 0;
      trophyProgress.value       = 0;
      contributorsProgress.value = 0;

      // Backdrop + card
      backdropOpacity.value = withTiming(1, { duration: 200 });
      cardOpacity.value     = withTiming(1, { duration: 220 });
      cardScale.value       = withSpring(1, { damping: 10, stiffness: 110 });

      // Result label (delayed 200ms)
      labelOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
      labelScale.value   = withDelay(200, withSpring(1, { damping: 8, stiffness: 130 }));

      // Stagger stat rows starting at 400ms, 120ms apart
      const makeStat = (sv: typeof weekProgress, offset: number) => {
        sv.value = withDelay(
          400 + offset,
          withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.2)) }),
        );
      };
      makeStat(weekProgress,         0);
      makeStat(scoreProgress,        120);
      makeStat(trophyProgress,       240);
      makeStat(contributorsProgress, 360);
    }
  }, [
    visible,
    backdropOpacity, cardScale, cardOpacity,
    labelScale, labelOpacity,
    weekProgress, scoreProgress, trophyProgress, contributorsProgress,
  ]);

  // ── Animated styles ─────────────────────────────────────────────────────────

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const weekStyle = useAnimatedStyle(() => ({
    opacity: weekProgress.value,
    transform: [{ translateY: (1 - weekProgress.value) * 16 }],
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    opacity: scoreProgress.value,
    transform: [{ translateY: (1 - scoreProgress.value) * 16 }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    opacity: trophyProgress.value,
    transform: [{ translateY: (1 - trophyProgress.value) * 16 }],
  }));

  const contributorsStyle = useAnimatedStyle(() => ({
    opacity: contributorsProgress.value,
    transform: [{ translateY: (1 - contributorsProgress.value) * 16 }],
  }));

  // ── Dismiss button press-scale ──────────────────────────────────────────────
  const dismissPress = usePressScale(0.97);

  if (!warData) return null;

  const result        = getResultConfig(warData.won, warData.draw);
  const trophyPositive = warData.trophyChange >= 0;
  const top3          = warData.topContributors.slice(0, 3);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View
        className="flex-1 items-center justify-center"
        style={[{ backgroundColor: 'rgba(0,0,0,0.85)' }, backdropStyle]}
      >
        <Animated.View
          className="bg-[#17172f] rounded-2xl p-6 mx-6 w-[320px] items-center"
          style={cardStyle}
        >
          {/* Result icon — spring entrance */}
          <Animated.View style={labelStyle}>
            <FontAwesome name={result.icon} size={48} color={result.color} />
          </Animated.View>

          {/* Result label — spring burst */}
          <Animated.View style={labelStyle}>
            <Text
              style={{ color: result.color, fontFamily: 'Epilogue-Bold' }}
              className="text-3xl font-bold mt-3"
            >
              {result.label}
            </Text>
          </Animated.View>

          {/* Week — stagger in */}
          <Animated.View style={weekStyle}>
            <Text
              style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
              className="text-sm mt-1"
            >
              Week {warData.weekNumber}
            </Text>
          </Animated.View>

          {/* Score — count-up + stagger */}
          <Animated.View style={[scoreStyle, { marginTop: 16 }]}>
            <View className="flex-row items-center">
              <CountUpScore
                target={warData.myScore}
                color="#ce96ff"
                delay={520}
                visible={visible}
              />
              <Text
                style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
                className="text-2xl mx-3"
              >
                -
              </Text>
              <CountUpScore
                target={warData.opponentScore}
                color="#ff6e84"
                delay={520}
                visible={visible}
              />
            </View>
          </Animated.View>

          {/* Trophy change — stagger in */}
          <Animated.View style={trophyStyle}>
            <View
              className="rounded-full px-4 py-1.5 mt-3"
              style={{
                backgroundColor: trophyPositive ? '#10B981' + '25' : '#ff6e84' + '25',
              }}
            >
              <Text
                style={{
                  color: trophyPositive ? '#10B981' : '#ff6e84',
                  fontFamily: 'Lexend-SemiBold',
                }}
                className="font-bold text-lg"
              >
                {trophyPositive ? '+' : ''}{warData.trophyChange} Trophies
              </Text>
            </View>
          </Animated.View>

          {/* Top contributors — stagger in */}
          {top3.length > 0 && (
            <Animated.View style={[contributorsStyle, { width: '100%' }]}>
              <View className="w-full mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: '#23233f' }}>
                <Text
                  style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
                  className="text-xs uppercase mb-2"
                >
                  Top Contributors
                </Text>
                {top3.map((c, i) => (
                  <View key={`${c.display_name}-${i}`} className="flex-row justify-between py-1.5">
                    <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}>
                      {i + 1}. {c.display_name || 'Warrior'}
                    </Text>
                    <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }} className="font-bold">
                      {Math.round(c.contribution_points)} pts
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Dismiss button — press-scale (reanimated) */}
          <Animated.View style={[dismissPress.animatedStyle, { width: '100%' }]}>
            <Pressable
              className="w-full py-3 items-center rounded-xl mt-5"
              style={{ backgroundColor: '#a434ff' }}
              onPress={onDismiss}
              onPressIn={dismissPress.onPressIn}
              onPressOut={dismissPress.onPressOut}
            >
              <Text
                style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
                className="font-bold text-base"
              >
                Return to Clan
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
