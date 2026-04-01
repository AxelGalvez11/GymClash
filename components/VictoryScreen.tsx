import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Modal, Animated, Easing, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';
import { Button } from '@/components/ui/Button';
import { ConfettiBurst } from '@/components/ConfettiBurst';
import type { StreakTier } from '@/types';

// ─── Types ───────────────────────────────────────────────

interface VictoryScreenProps {
  readonly visible: boolean;
  readonly workoutType: 'strength' | 'scout';
  readonly score: number;
  readonly trophiesEarned: number;
  readonly streakCount: number;
  readonly isPersonalBest?: boolean;
  readonly onDismiss: () => void;
  // Reward cascade additions
  readonly xpEarned?: number;
  readonly xpTotal?: number;
  readonly xpToNextLevel?: number;
  readonly clanContribution?: number | null;
  readonly dailyGoalCompleted?: boolean | null;
  readonly streakTier?: StreakTier;
}

// ─── Confetti-worthy streak tiers ────────────────────────

const CONFETTI_STREAK_TIERS: ReadonlySet<StreakTier> = new Set([
  'bonfire',
  'inferno',
  'supernova',
  'eternal',
]);

// ─── Animated Score Counter ─────────────────────────────

function AnimatedScore({
  targetValue,
  visible,
  accentColor,
}: {
  readonly targetValue: number;
  readonly visible: boolean;
  readonly accentColor: string;
}) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (visible) {
      animValue.setValue(0);
      setDisplayValue(0);
      Animated.timing(animValue, {
        toValue: targetValue,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [visible, targetValue, animValue]);

  useEffect(() => {
    const id = animValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });
    return () => animValue.removeListener(id);
  }, [animValue]);

  return (
    <Text
      className="font-bold"
      style={{ fontSize: 64, fontFamily: 'SpaceMono', color: accentColor }}
    >
      {displayValue}
    </Text>
  );
}

// ─── Slide-In From Right ────────────────────────────────

function useSlideInRight(delay: number, visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(40)).current;

  const skipToEnd = useCallback(() => {
    opacity.stopAnimation();
    translateX.stopAnimation();
    opacity.setValue(1);
    translateX.setValue(0);
  }, [opacity, translateX]);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      translateX.setValue(40);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 400,
          delay,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, delay, opacity, translateX]);

  return { style: { opacity, transform: [{ translateX }] }, skipToEnd };
}

// ─── Fade-In With Scale ─────────────────────────────────

function useFadeScale(delay: number, visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  const skipToEnd = useCallback(() => {
    opacity.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(1);
    scale.setValue(1);
  }, [opacity, scale]);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.8);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          delay,
          useNativeDriver: true,
          damping: 12,
          stiffness: 150,
        }),
      ]).start();
    }
  }, [visible, delay, opacity, scale]);

  return { style: { opacity, transform: [{ scale }] }, skipToEnd };
}

// ─── Flash-In (PB badge) ────────────────────────────────

function useFlashIn(delay: number, visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1.4)).current;

  const skipToEnd = useCallback(() => {
    opacity.stopAnimation();
    scale.stopAnimation();
    opacity.setValue(1);
    scale.setValue(1);
  }, [opacity, scale]);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(1.4);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 8,
            stiffness: 200,
          }),
        ]),
      ]).start();
    }
  }, [visible, delay, opacity, scale]);

  return { style: { opacity, transform: [{ scale }] }, skipToEnd };
}

// ─── Fade-In Only ───────────────────────────────────────

function useFadeIn(delay: number, visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;

  const skipToEnd = useCallback(() => {
    opacity.stopAnimation();
    opacity.setValue(1);
  }, [opacity]);

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, delay, opacity]);

  return { style: { opacity }, skipToEnd };
}

// ─── XP Progress Bar ────────────────────────────────────

function XpBar({
  xpEarned,
  xpTotal,
  xpToNextLevel,
  accentColor,
}: {
  readonly xpEarned: number;
  readonly xpTotal: number;
  readonly xpToNextLevel: number;
  readonly accentColor: string;
}) {
  const progress = xpToNextLevel > 0 ? Math.min(xpTotal / xpToNextLevel, 1) : 1;

  return (
    <View className="items-center w-full px-4">
      <Text className="text-white text-base font-bold mb-1" style={{ fontFamily: 'SpaceMono' }}>
        +{xpEarned} XP
      </Text>
      <View
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: Colors.surface.border }}
      >
        <View
          className="h-full rounded-full"
          style={{
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: accentColor,
          }}
        />
      </View>
      <Text className="text-text-muted text-xs mt-1" style={{ fontFamily: 'SpaceMono' }}>
        {xpTotal} / {xpToNextLevel} XP
      </Text>
    </View>
  );
}

// ─── Component ──────────────────────────────────────────

export function VictoryScreen({
  visible,
  workoutType,
  score,
  trophiesEarned,
  streakCount,
  isPersonalBest = false,
  onDismiss,
  xpEarned,
  xpTotal,
  xpToNextLevel,
  clanContribution,
  dailyGoalCompleted,
  streakTier,
}: VictoryScreenProps) {
  const accent = useAccent();
  const [skipped, setSkipped] = useState(false);

  // Reset skip state when visibility changes
  useEffect(() => {
    if (visible) {
      setSkipped(false);
    }
  }, [visible]);

  // Overlay fade
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, overlayOpacity]);

  // ─── Staggered entry animations ───────────────────────
  // Score counter finishes at ~1500ms, then badges stagger

  const trophyAnim = useSlideInRight(1500 + 200, visible);
  const streakAnim = useFadeScale(1500 + 400, visible);
  const pbAnim = useFlashIn(1500 + 600, visible);

  // New reward cascade items (after PB badge at ~2100ms)
  const xpAnim = useSlideInRight(1700, visible);
  const clanAnim = useSlideInRight(1900, visible);
  const dailyGoalAnim = useFadeIn(2100, visible);

  // Button fade — appears after all badges
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  const buttonDelay = (() => {
    let d = 1500;
    if (isPersonalBest) d += 1000;
    else if (streakCount > 0) d += 800;
    else d += 600;

    // Account for new cascade items
    if (xpEarned != null) d = Math.max(d, 2100);
    if (clanContribution != null) d = Math.max(d, 2300);
    if (dailyGoalCompleted) d = Math.max(d, 2500);

    return d;
  })();

  useEffect(() => {
    if (visible && !skipped) {
      buttonOpacity.setValue(0);
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 400,
        delay: buttonDelay,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, skipped, buttonDelay, buttonOpacity]);

  // ─── Tap-to-skip ──────────────────────────────────────

  const handleSkip = useCallback(() => {
    if (skipped) return;
    setSkipped(true);

    // Jump all animations to final state
    trophyAnim.skipToEnd();
    streakAnim.skipToEnd();
    pbAnim.skipToEnd();
    xpAnim.skipToEnd();
    clanAnim.skipToEnd();
    dailyGoalAnim.skipToEnd();

    // Show button immediately
    buttonOpacity.stopAnimation();
    buttonOpacity.setValue(1);
  }, [
    skipped,
    trophyAnim,
    streakAnim,
    pbAnim,
    xpAnim,
    clanAnim,
    dailyGoalAnim,
    buttonOpacity,
  ]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // ─── Confetti trigger ─────────────────────────────────

  const shouldConfetti =
    visible &&
    (isPersonalBest || (streakTier != null && CONFETTI_STREAK_TIERS.has(streakTier)));

  // ─── Derived values ───────────────────────────────────

  const workoutIcon = workoutType === 'strength' ? 'heartbeat' : 'road';
  const workoutColor = workoutType === 'strength' ? Colors.danger : Colors.info;

  const hasXp =
    xpEarned != null && xpTotal != null && xpToNextLevel != null;
  const hasClan = clanContribution != null && clanContribution > 0;
  const hasDailyGoal = dailyGoalCompleted === true;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: overlayOpacity,
          backgroundColor: 'rgba(0,0,0,0.95)',
        }}
      >
        {/* Tap-to-skip overlay */}
        <Pressable
          style={{ flex: 1 }}
          onPress={handleSkip}
        >
          <View className="flex-1 items-center justify-center px-8" pointerEvents="box-none">
            {/* Top: Workout type icon + title */}
            <View className="items-center mb-10">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: workoutColor + '20' }}
              >
                <FontAwesome name={workoutIcon} size={28} color={workoutColor} />
              </View>
              <Text
                className="text-white text-xl"
                style={{ fontFamily: 'SpaceMono', letterSpacing: 3 }}
              >
                WORKOUT COMPLETE
              </Text>
            </View>

            {/* Center: Animated score counter */}
            <View className="items-center mb-8">
              <Text
                className="text-text-muted text-xs uppercase mb-2"
                style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
              >
                Score
              </Text>
              <AnimatedScore
                targetValue={score}
                visible={visible}
                accentColor={accent.DEFAULT}
              />
            </View>

            {/* Trophy badge — slides in from right */}
            <Animated.View
              style={trophyAnim.style}
              className="flex-row items-center gap-2 mb-4"
            >
              <View
                className="rounded-full px-5 py-2.5 flex-row items-center gap-2"
                style={{
                  backgroundColor: Colors.surface.overlay,
                  borderWidth: 1,
                  borderColor: Colors.surface.border,
                }}
              >
                <Text className="text-white text-lg font-bold">
                  +{trophiesEarned}
                </Text>
                <Text className="text-lg">🏆</Text>
              </View>
            </Animated.View>

            {/* Streak flame — fades in */}
            {streakCount > 0 && (
              <Animated.View
                style={streakAnim.style}
                className="flex-row items-center gap-2 mb-4"
              >
                <Text className="text-2xl">🔥</Text>
                <Text className="text-white text-base font-bold">
                  {streakCount} day streak
                </Text>
              </Animated.View>
            )}

            {/* Personal best badge — flashes in */}
            {isPersonalBest && (
              <Animated.View
                style={pbAnim.style}
                className="flex-row items-center gap-2 mb-4"
              >
                <View
                  className="rounded-full px-5 py-2 flex-row items-center gap-2"
                  style={{
                    backgroundColor: Colors.warning + '15',
                    borderWidth: 1,
                    borderColor: Colors.warning + '40',
                  }}
                >
                  <Text className="text-lg">⭐</Text>
                  <Text
                    className="font-bold text-sm"
                    style={{
                      color: Colors.warning,
                      fontFamily: 'SpaceMono',
                      letterSpacing: 1,
                    }}
                  >
                    NEW PERSONAL BEST
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* ─── Reward Cascade ──────────────────────── */}

            {/* XP bar — slides in at 1700ms */}
            {hasXp && (
              <Animated.View style={xpAnim.style} className="w-full mb-4">
                <XpBar
                  xpEarned={xpEarned}
                  xpTotal={xpTotal}
                  xpToNextLevel={xpToNextLevel}
                  accentColor={accent.DEFAULT}
                />
              </Animated.View>
            )}

            {/* Clan contribution — slides in at 1900ms */}
            {hasClan && (
              <Animated.View
                style={clanAnim.style}
                className="flex-row items-center gap-2 mb-4"
              >
                <View
                  className="rounded-full px-5 py-2 flex-row items-center gap-2"
                  style={{
                    backgroundColor: Colors.surface.overlay,
                    borderWidth: 1,
                    borderColor: Colors.surface.border,
                  }}
                >
                  <Text className="text-lg">⚔️</Text>
                  <Text className="text-white text-base font-bold" style={{ fontFamily: 'SpaceMono' }}>
                    +{clanContribution} war pts
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Daily goal complete — fades in at 2100ms */}
            {hasDailyGoal && (
              <Animated.View
                style={dailyGoalAnim.style}
                className="flex-row items-center gap-2 mb-4"
              >
                <View
                  className="rounded-full px-5 py-2 flex-row items-center gap-2"
                  style={{
                    backgroundColor: Colors.success + '15',
                    borderWidth: 1,
                    borderColor: Colors.success + '40',
                  }}
                >
                  <Text className="text-lg">✅</Text>
                  <Text
                    className="font-bold text-sm"
                    style={{
                      color: Colors.success,
                      fontFamily: 'SpaceMono',
                      letterSpacing: 1,
                    }}
                  >
                    DAILY GOAL COMPLETE!
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Continue button */}
            <Animated.View style={{ opacity: buttonOpacity }} className="w-full mt-6">
              <Button
                label="Continue"
                onPress={handleDismiss}
                variant="primary"
                size="lg"
              />
            </Animated.View>
          </View>
        </Pressable>

        {/* Confetti overlay — on PB or bonfire+ streak */}
        <ConfettiBurst visible={shouldConfetti} />
      </Animated.View>
    </Modal>
  );
}

export default VictoryScreen;
