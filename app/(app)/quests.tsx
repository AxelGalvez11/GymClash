import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

import { useMyClan } from '@/hooks/use-clan';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { useProfile } from '@/hooks/use-profile';
import { useStaggerEntrance } from '@/hooks/use-stagger-entrance';
import { useMyWorkouts } from '@/hooks/use-workouts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

const VP = {
  bg: '#070714',
  surface: '#0c0c1f',
  raised: '#17172f',
  active: '#1d1d37',
  highest: '#23233f',
  textPri: '#e5e3ff',
  textSec: '#aaa8c3',
  textMuted: '#74738b',
  primary: '#ce96ff',
  primaryDim: '#a434ff',
  gold: '#ffd709',
  cyan: '#81ecff',
  green: '#22c55e',
  red: '#ff6e84',
} as const;

type QuestCategory = 'strength' | 'cardio' | 'hybrid' | 'streaks' | 'clan';
type QuestStatus = 'completed' | 'tracking' | 'available';
type PlannerFilter = 'all' | QuestCategory;
type Difficulty = 'Starter' | 'Build' | 'Savage';
type FAIconName = React.ComponentProps<typeof FontAwesome>['name'];

interface QuestContext {
  totalWorkouts: number;
  strengthCount: number;
  scoutCount: number;
  streak: number;
  trophies: number;
  hasClan: boolean;
  totalDistanceMiles: number;
}

interface QuestProgress {
  percent: number;
  summary: string;
  detail: string;
  currentLabel: string;
  targetLabel: string;
}

interface PlannerQuest {
  id: string;
  name: string;
  tagline: string;
  objective: string;
  category: QuestCategory;
  icon: FAIconName;
  accent: string;
  durationLabel: string;
  difficulty: Difficulty;
  formatLabel: string;
  featured?: boolean;
  rewards: {
    lp?: number;
    cp?: number;
    diamonds?: number;
  };
  previewSteps: string[];
  ctaLabel: string;
  route: string;
  evaluate: (ctx: QuestContext) => QuestProgress;
}

interface PlannerQuestEntry extends PlannerQuest {
  progress: QuestProgress;
  status: QuestStatus;
}

const CATEGORY_META: Record<
  QuestCategory,
  {
    label: string;
    eyebrow: string;
    icon: FAIconName;
    accent: string;
    description: string;
  }
> = {
  strength: {
    label: 'Strength Quests',
    eyebrow: 'Plate Stackers',
    icon: 'bolt',
    accent: VP.gold,
    description: 'Pump blocks, split ideas, and barbell-flavored chaos.',
  },
  cardio: {
    label: 'Cardio Quests',
    eyebrow: 'Lung Burners',
    icon: 'road',
    accent: VP.cyan,
    description: 'Mileage arcs, treadmill nonsense, and sweaty distance goals.',
  },
  hybrid: {
    label: 'Hybrid Quests',
    eyebrow: 'Dual Threat',
    icon: 'random',
    accent: VP.primary,
    description: 'For users who want both better lungs and a louder upper body.',
  },
  streaks: {
    label: 'Consistency Quests',
    eyebrow: 'Keep Showing Up',
    icon: 'calendar-check-o',
    accent: VP.green,
    description: 'Planner-style consistency quests that reward momentum over drama.',
  },
  clan: {
    label: 'Clan Quests',
    eyebrow: 'Social Pressure',
    icon: 'shield',
    accent: VP.red,
    description: 'GymClash quests built around accountability, flexing, and crew energy.',
  },
};

const FILTERS: Array<{ key: PlannerFilter; label: string }> = [
  { key: 'all', label: 'All Quests' },
  { key: 'strength', label: 'Strength' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'streaks', label: 'Streaks' },
  { key: 'clan', label: 'Clan' },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatMiles(value: number): string {
  return `${value.toFixed(value >= 10 ? 0 : 1)} mi`;
}

function countProgress(
  current: number,
  target: number,
  noun: string,
): QuestProgress {
  const safeCurrent = Math.max(0, current);
  return {
    percent: clamp01(safeCurrent / target),
    summary: `${Math.min(safeCurrent, target)}/${target} ${noun}`,
    detail: `${safeCurrent} ${noun} logged so far`,
    currentLabel: `${safeCurrent}`,
    targetLabel: `${target}`,
  };
}

function distanceProgress(
  miles: number,
  targetMiles: number,
): QuestProgress {
  const safeMiles = Math.max(0, miles);
  return {
    percent: clamp01(safeMiles / targetMiles),
    summary: `${formatMiles(safeMiles)} / ${formatMiles(targetMiles)}`,
    detail: `${formatMiles(Math.max(targetMiles - safeMiles, 0))} left in the tank`,
    currentLabel: formatMiles(safeMiles),
    targetLabel: formatMiles(targetMiles),
  };
}

function booleanProgress(
  done: boolean,
  pendingLabel: string,
  completeLabel: string,
): QuestProgress {
  return {
    percent: done ? 1 : 0,
    summary: done ? completeLabel : pendingLabel,
    detail: done ? 'Requirement met' : pendingLabel,
    currentLabel: done ? 'Yes' : 'No',
    targetLabel: 'Yes',
  };
}

function comboProgress(
  parts: Array<{ current: number; target: number; label: string }>,
): QuestProgress {
  const percent =
    parts.reduce((sum, part) => sum + clamp01(part.current / part.target), 0) /
    parts.length;
  const summary = parts
    .map((part) => `${Math.min(part.current, part.target)}/${part.target} ${part.label}`)
    .join(' · ');

  return {
    percent,
    summary,
    detail: 'Balanced progress across both sides of the plan',
    currentLabel: summary,
    targetLabel: 'Balanced',
  };
}

const QUESTS: PlannerQuest[] = [
  {
    id: 'gym-bro-starter-pack',
    name: 'Gym Bro Starter Pack',
    tagline: 'Bench something, curl something, inspect the pump.',
    objective: 'Log 3 strength sessions to unlock your first proper lifting arc.',
    category: 'strength',
    icon: 'bolt',
    accent: VP.gold,
    durationLabel: 'Week 1',
    difficulty: 'Starter',
    formatLabel: 'Upper Pump Primer',
    featured: true,
    rewards: { lp: 150, diamonds: 5 },
    previewSteps: [
      'Bench Press 4×8',
      'Chest-supported Row 4×10',
      'Lateral Raise 3×15',
      'Curls and triceps finisher 3 rounds',
    ],
    ctaLabel: 'Open Lift Plan',
    route: '/(app)/workout/strength',
    evaluate: (ctx) => countProgress(ctx.strengthCount, 3, 'lift sessions'),
  },
  {
    id: 'sick-juicy-pump',
    name: 'Sick Juicy Pump',
    tagline: 'A quest for swollen sleeves and emotionally significant delts.',
    objective: 'Stack 8 strength sessions and build an actual split instead of winging it.',
    category: 'strength',
    icon: 'fire',
    accent: VP.red,
    durationLabel: '2 Weeks',
    difficulty: 'Build',
    formatLabel: 'Push / Pull / Lower',
    featured: true,
    rewards: { lp: 280, diamonds: 10 },
    previewSteps: [
      'Push day focus on chest, shoulders, triceps',
      'Pull day heavy rows, pulldowns, rear delts',
      'Lower day squat pattern, hinge, calves',
      'One optional arm-pump finisher session',
    ],
    ctaLabel: 'Continue Pump',
    route: '/(app)/workout/strength',
    evaluate: (ctx) => countProgress(ctx.strengthCount, 8, 'lift sessions'),
  },
  {
    id: 'never-skip-leg-day',
    name: 'Never Skip Leg Day',
    tagline: 'A public apology tour for every skipped squat session.',
    objective: 'Complete 12 strength sessions and stop pretending calves just happen.',
    category: 'strength',
    icon: 'heartbeat',
    accent: VP.green,
    durationLabel: '3 Weeks',
    difficulty: 'Savage',
    formatLabel: 'Lower Body Volume',
    rewards: { lp: 420, diamonds: 15 },
    previewSteps: [
      'Barbell Squat 5×5',
      'Romanian Deadlift 4×8',
      'Walking Lunges 3×20 steps',
      'Leg Press drop set and calf raise finisher',
    ],
    ctaLabel: 'Leg Day Time',
    route: '/(app)/workout/strength',
    evaluate: (ctx) => countProgress(ctx.strengthCount, 12, 'lift sessions'),
  },
  {
    id: '100-mile-challenge',
    name: '100 Mile Challenge',
    tagline: 'Cardio people are built different. This proves it.',
    objective: 'Bank 100 total miles of cardio volume across runs and treadmill sessions.',
    category: 'cardio',
    icon: 'road',
    accent: VP.cyan,
    durationLabel: 'Season Goal',
    difficulty: 'Savage',
    formatLabel: 'Distance Block',
    featured: true,
    rewards: { cp: 900, diamonds: 35 },
    previewSteps: [
      'Two easy aerobic runs per week',
      'One progression or tempo effort',
      'One long session every weekend',
      'Keep the streak alive with recovery walks',
    ],
    ctaLabel: 'Open Run Plan',
    route: '/(app)/workout/scout',
    evaluate: (ctx) => distanceProgress(ctx.totalDistanceMiles, 100),
  },
  {
    id: 'treadmill-goblin',
    name: 'Treadmill Goblin',
    tagline: 'For users who thrive under fluorescent lights and bad playlists.',
    objective: 'Complete 5 cardio sessions and make the treadmill your temporary kingdom.',
    category: 'cardio',
    icon: 'dashboard',
    accent: VP.primary,
    durationLabel: 'Week 1',
    difficulty: 'Starter',
    formatLabel: 'Incline Walk Arc',
    rewards: { cp: 180, diamonds: 6 },
    previewSteps: [
      '5-minute easy warm-up',
      '20-minute incline walk or jog',
      '4 short surges to finish',
      'Cooldown and hydration lap',
    ],
    ctaLabel: 'Hit Cardio',
    route: '/(app)/workout/scout',
    evaluate: (ctx) => countProgress(ctx.scoutCount, 5, 'cardio sessions'),
  },
  {
    id: 'zone-2-zen',
    name: 'Zone 2 Zen',
    tagline: 'Calmer than chaos. Still sweaty.',
    objective: 'Accumulate 25 miles of lower-intensity cardio volume.',
    category: 'cardio',
    icon: 'leaf',
    accent: VP.green,
    durationLabel: '2 Weeks',
    difficulty: 'Build',
    formatLabel: 'Easy Pace Block',
    rewards: { cp: 320, diamonds: 12 },
    previewSteps: [
      'Stay conversational for the bulk of the work',
      'Build toward a 45 to 60 minute long effort',
      'Use one session as a steady bike or incline walk',
      'Treat recovery pace as a skill, not a punishment',
    ],
    ctaLabel: 'Stay Smooth',
    route: '/(app)/workout/scout',
    evaluate: (ctx) => distanceProgress(ctx.totalDistanceMiles, 25),
  },
  {
    id: 'touch-grass-touch-iron',
    name: 'Touch Grass, Touch Iron',
    tagline: 'Outdoor lungs, indoor delts.',
    objective: 'Log 4 strength sessions and 4 cardio sessions in the same arc.',
    category: 'hybrid',
    icon: 'random',
    accent: VP.primary,
    durationLabel: '2 Weeks',
    difficulty: 'Build',
    formatLabel: 'Balanced Split',
    featured: true,
    rewards: { lp: 220, cp: 220, diamonds: 14 },
    previewSteps: [
      'Two upper or lower lifts each week',
      'Two easy or interval cardio sessions each week',
      'One day fully off for recovery',
      'Repeat until both sides are even',
    ],
    ctaLabel: 'Open Hybrid Plan',
    route: '/(app)/home',
    evaluate: (ctx) =>
      comboProgress([
        { current: ctx.strengthCount, target: 4, label: 'strength' },
        { current: ctx.scoutCount, target: 4, label: 'cardio' },
      ]),
  },
  {
    id: 'dual-threat-deluxe',
    name: 'Dual Threat Deluxe',
    tagline: 'The planner arc for users who refuse to pick a side.',
    objective: 'Reach 8 strength sessions and 8 cardio sessions to fully round out your week.',
    category: 'hybrid',
    icon: 'trophy',
    accent: VP.gold,
    durationLabel: 'Month Arc',
    difficulty: 'Savage',
    formatLabel: 'Performance Blend',
    rewards: { lp: 380, cp: 380, diamonds: 24 },
    previewSteps: [
      'Alternate heavier lifts with aerobic builders',
      'Keep one hard cardio day and one hard strength day apart',
      'Use mobility between blocks',
      'Track output instead of guessing fatigue',
    ],
    ctaLabel: 'Build Both',
    route: '/(app)/home',
    evaluate: (ctx) =>
      comboProgress([
        { current: ctx.strengthCount, target: 8, label: 'strength' },
        { current: ctx.scoutCount, target: 8, label: 'cardio' },
      ]),
  },
  {
    id: 'no-days-off-ish',
    name: 'No Days Off-ish',
    tagline: 'Consistency, but with enough realism to survive adulthood.',
    objective: 'Hit a 5-day streak and establish an actual rhythm.',
    category: 'streaks',
    icon: 'calendar-check-o',
    accent: VP.green,
    durationLabel: '5 Days',
    difficulty: 'Starter',
    formatLabel: 'Momentum Builder',
    rewards: { lp: 100, cp: 100, diamonds: 8 },
    previewSteps: [
      'Alternate lift and cardio days',
      'Use one low-pressure recovery day',
      'Keep every session short if needed',
      'Prioritize not breaking the chain',
    ],
    ctaLabel: 'Protect Streak',
    route: '/(app)/home',
    evaluate: (ctx) => countProgress(ctx.streak, 5, 'streak days'),
  },
  {
    id: 'consistency-cult-leader',
    name: 'Consistency Cult Leader',
    tagline: 'At this point your calendar fears you.',
    objective: 'Build a 14-day streak and prove your routine has actual structure.',
    category: 'streaks',
    icon: 'star',
    accent: VP.gold,
    durationLabel: '14 Days',
    difficulty: 'Savage',
    formatLabel: 'Accountability Arc',
    rewards: { lp: 260, cp: 260, diamonds: 18 },
    previewSteps: [
      'Pre-plan seven sessions before the week starts',
      'Use lower-intensity days to preserve momentum',
      'Swap intensity, not attendance, when life gets messy',
      'Stay streak-first until two full weeks are done',
    ],
    ctaLabel: 'Keep Going',
    route: '/(app)/home',
    evaluate: (ctx) => countProgress(ctx.streak, 14, 'streak days'),
  },
  {
    id: 'spot-me-bro',
    name: 'Spot Me Bro',
    tagline: 'The first social quest: join a clan and stop solo queueing life.',
    objective: 'Join or create a clan to unlock the accountability side of GymClash.',
    category: 'clan',
    icon: 'shield',
    accent: VP.red,
    durationLabel: 'One Step',
    difficulty: 'Starter',
    formatLabel: 'Community Unlock',
    rewards: { lp: 120, cp: 120, diamonds: 10 },
    previewSteps: [
      'Join a clan or create your own crew',
      'Set your vibe before the next workout',
      'Use the clan page as your accountability feed',
    ],
    ctaLabel: 'Open Clan Hub',
    route: '/(app)/clan',
    evaluate: (ctx) =>
      booleanProgress(ctx.hasClan, 'Clan not joined yet', 'Clan unlocked'),
  },
  {
    id: 'pack-mentality',
    name: 'Pack Mentality',
    tagline: 'Now that you have a crew, act like it.',
    objective: 'Join a clan and stack 5 total workouts so your squad sees actual movement.',
    category: 'clan',
    icon: 'users',
    accent: VP.primary,
    durationLabel: 'Week 1',
    difficulty: 'Build',
    formatLabel: 'Accountability Planner',
    rewards: { lp: 180, cp: 180, diamonds: 12 },
    previewSteps: [
      'Get into a clan first',
      'Log any mix of 5 workouts',
      'Use the clan page after each session for social pressure',
      'Turn consistency into visible momentum',
    ],
    ctaLabel: 'Show The Crew',
    route: '/(app)/clan',
    evaluate: (ctx) => {
      const clanPart = ctx.hasClan ? 1 : 0;
      const workoutPart = clamp01(ctx.totalWorkouts / 5);
      const summary = `${ctx.hasClan ? 'Clan joined' : 'Clan missing'} · ${Math.min(
        ctx.totalWorkouts,
        5,
      )}/5 workouts`;
      return {
        percent: (clanPart + workoutPart) / 2,
        summary,
        detail: 'Two-part quest: community first, then proof of effort',
        currentLabel: summary,
        targetLabel: 'Clan + 5 workouts',
      };
    },
  },
];

function getQuestStatus(progress: QuestProgress): QuestStatus {
  if (progress.percent >= 1) return 'completed';
  if (progress.percent > 0) return 'tracking';
  return 'available';
}

function getStatusMeta(status: QuestStatus, accent: string) {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        color: VP.green,
        bg: 'rgba(34,197,94,0.14)',
        border: 'rgba(34,197,94,0.3)',
      };
    case 'tracking':
      return {
        label: 'Tracking',
        color: accent,
        bg: `${accent}1f`,
        border: `${accent}55`,
      };
    case 'available':
    default:
      return {
        label: 'Open',
        color: VP.textSec,
        bg: 'rgba(116,115,139,0.16)',
        border: 'rgba(116,115,139,0.32)',
      };
  }
}

function RewardPill({
  icon,
  color,
  label,
}: {
  icon: FAIconName;
  color: string;
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: `${color}16`,
        borderWidth: 1,
        borderColor: `${color}35`,
      }}
    >
      <FontAwesome name={icon} size={11} color={color} />
      <Text
        style={{
          color,
          fontFamily: 'Lexend-SemiBold',
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function DifficultyBadge({
  difficulty,
  accent,
}: {
  difficulty: Difficulty;
  accent: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: `${accent}14`,
        borderWidth: 1,
        borderColor: `${accent}30`,
      }}
    >
      <Text
        style={{
          color: accent,
          fontFamily: 'Lexend-SemiBold',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {difficulty}
      </Text>
    </View>
  );
}

function ProgressStrip({
  accent,
  percent,
}: {
  accent: string;
  percent: number;
}) {
  return (
    <View
      style={{
        height: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[accent, `${accent}aa`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: `${Math.max(6, percent * 100)}%`,
          height: '100%',
          borderRadius: 999,
        }}
      />
    </View>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: selected ? `${VP.primary}22` : VP.active,
        borderWidth: 1,
        borderColor: selected ? `${VP.primary}66` : 'rgba(206,150,255,0.12)',
      }}
    >
      <Text
        style={{
          color: selected ? VP.textPri : VP.textSec,
          fontFamily: 'Lexend-SemiBold',
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PlannerHeader({
  completedCount,
  trackingCount,
  totalCount,
  totalDistanceMiles,
  streak,
}: {
  completedCount: number;
  trackingCount: number;
  totalCount: number;
  totalDistanceMiles: number;
  streak: number;
}) {
  const { glowStyle } = useGlowPulse(VP.primary, 0.22, 0.55, 2600, true);
  const completionPct = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <Animated.View style={glowStyle}>
      <LinearGradient
        colors={['rgba(164,52,255,0.32)', 'rgba(12,12,31,0.96)', 'rgba(12,12,31,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          marginHorizontal: 16,
          marginTop: 10,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: 'rgba(206,150,255,0.22)',
          overflow: 'hidden',
        }}
      >
        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ScoreRing percentage={completionPct} size={86} strokeWidth={7} glowing>
              <Text
                style={{
                  color: VP.textPri,
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 20,
                }}
              >
                {completedCount}
              </Text>
              <Text
                style={{
                  color: VP.textMuted,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}
              >
                done
              </Text>
            </ScoreRing>

            <View style={{ flex: 1, gap: 6 }}>
              <Text
                style={{
                  color: VP.primary,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Quest Planner
              </Text>
              <Text
                style={{
                  color: VP.textPri,
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 26,
                  lineHeight: 28,
                }}
              >
                Workout arcs with GymClash flavor.
              </Text>
              <Text
                style={{
                  color: VP.textSec,
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                Pick a quest type, scan the plan, and jump straight into a workout route
                without digging through a generic planner UI.
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <RewardPill icon="check-circle" color={VP.green} label={`${completedCount}/${totalCount} completed`} />
            <RewardPill icon="compass" color={VP.primary} label={`${trackingCount} in motion`} />
            <RewardPill icon="road" color={VP.cyan} label={`${formatMiles(totalDistanceMiles)} logged`} />
            <RewardPill icon="calendar" color={VP.gold} label={`${streak}-day streak`} />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function FeaturedQuestCard({
  quest,
  onPress,
  index,
}: {
  quest: PlannerQuestEntry;
  onPress: () => void;
  index: number;
}) {
  const { animatedStyle } = useStaggerEntrance(index, 80, 280);
  const statusMeta = getStatusMeta(quest.status, quest.accent);

  return (
    <Animated.View style={[{ width: 286 }, animatedStyle]}>
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={[`${quest.accent}30`, 'rgba(23,23,47,0.96)', 'rgba(12,12,31,0.98)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 220,
            borderRadius: 24,
            padding: 18,
            borderWidth: 1,
            borderColor: `${quest.accent}44`,
            justifyContent: 'space-between',
          }}
        >
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${quest.accent}22`,
                }}
              >
                <FontAwesome name={quest.icon} size={20} color={quest.accent} />
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: statusMeta.bg,
                  borderWidth: 1,
                  borderColor: statusMeta.border,
                }}
              >
                <Text
                  style={{
                    color: statusMeta.color,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {statusMeta.label}
                </Text>
              </View>
            </View>

            <View>
              <Text
                style={{
                  color: quest.accent,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                }}
              >
                Featured Quest
              </Text>
              <Text
                style={{
                  color: VP.textPri,
                  fontFamily: 'Epilogue-Bold',
                  fontSize: 21,
                  lineHeight: 23,
                  marginBottom: 6,
                }}
              >
                {quest.name}
              </Text>
              <Text
                style={{
                  color: VP.textSec,
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {quest.tagline}
              </Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <ProgressStrip accent={quest.accent} percent={quest.progress.percent} />
            <Text
              style={{
                color: VP.textPri,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 12,
              }}
            >
              {quest.progress.summary}
            </Text>
            <Text
              style={{
                color: VP.textMuted,
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
              }}
            >
              {quest.formatLabel} · {quest.durationLabel}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function QuestCard({
  quest,
  onPress,
  index,
}: {
  quest: PlannerQuestEntry;
  onPress: () => void;
  index: number;
}) {
  const { animatedStyle } = useStaggerEntrance(index, 70, 260);
  const categoryMeta = CATEGORY_META[quest.category];
  const statusMeta = getStatusMeta(quest.status, quest.accent);

  return (
    <Animated.View style={animatedStyle}>
      <Card
        variant="elevated"
        style={{
          borderWidth: 1,
          borderColor: `${quest.accent}24`,
          borderTopWidth: 2,
          borderTopColor: quest.accent,
        }}
      >
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: `${categoryMeta.accent}14`,
                    borderWidth: 1,
                    borderColor: `${categoryMeta.accent}2f`,
                  }}
                >
                  <Text
                    style={{
                      color: categoryMeta.accent,
                      fontFamily: 'Lexend-SemiBold',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {categoryMeta.eyebrow}
                  </Text>
                </View>
                <DifficultyBadge difficulty={quest.difficulty} accent={quest.accent} />
              </View>

              <View>
                <Text
                  style={{
                    color: VP.textPri,
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 21,
                    lineHeight: 23,
                    marginBottom: 5,
                  }}
                >
                  {quest.name}
                </Text>
                <Text
                  style={{
                    color: VP.textSec,
                    fontFamily: 'BeVietnamPro-Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {quest.tagline}
                </Text>
              </View>
            </View>

            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${quest.accent}18`,
                borderWidth: 1,
                borderColor: `${quest.accent}32`,
              }}
            >
              <FontAwesome name={quest.icon} size={20} color={quest.accent} />
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <RewardPill icon="bookmark" color={quest.accent} label={quest.formatLabel} />
            <RewardPill icon="clock-o" color={VP.textSec} label={quest.durationLabel} />
            <RewardPill icon="compass" color={statusMeta.color} label={statusMeta.label} />
          </View>

          <Text
            style={{
              color: VP.textPri,
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            {quest.objective}
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.18)',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(206,150,255,0.08)',
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                style={{
                  color: VP.textMuted,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1.3,
                }}
              >
                Progress
              </Text>
              <Text
                style={{
                  color: quest.accent,
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 11,
                }}
              >
                {Math.round(quest.progress.percent * 100)}%
              </Text>
            </View>
            <ProgressStrip accent={quest.accent} percent={quest.progress.percent} />
            <Text
              style={{
                color: VP.textPri,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 12,
              }}
            >
              {quest.progress.summary}
            </Text>
            <Text
              style={{
                color: VP.textMuted,
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
              }}
            >
              {quest.progress.detail}
            </Text>
          </View>

          <View style={{ gap: 7 }}>
            <Text
              style={{
                color: VP.textMuted,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: 1.3,
              }}
            >
              Planner Preview
            </Text>
            {quest.previewSteps.slice(0, 3).map((step) => (
              <View key={step} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: quest.accent,
                    marginTop: 6,
                  }}
                />
                <Text
                  style={{
                    flex: 1,
                    color: VP.textSec,
                    fontFamily: 'BeVietnamPro-Regular',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {quest.rewards.lp ? (
              <RewardPill icon="bolt" color={VP.gold} label={`${quest.rewards.lp} LP`} />
            ) : null}
            {quest.rewards.cp ? (
              <RewardPill icon="road" color={VP.cyan} label={`${quest.rewards.cp} CP`} />
            ) : null}
            {quest.rewards.diamonds ? (
              <RewardPill icon="diamond" color={VP.primary} label={`${quest.rewards.diamonds} Diamonds`} />
            ) : null}
          </View>

          <Button
            variant={quest.status === 'tracking' ? 'primary' : 'secondary'}
            size="md"
            fullWidth
            glowing={quest.status === 'tracking'}
            onPress={onPress}
          >
            {quest.status === 'completed' ? 'Review Quest' : quest.ctaLabel}
          </Button>
        </View>
      </Card>
    </Animated.View>
  );
}

function SectionBlock({
  category,
  quests,
  onSelectQuest,
}: {
  category: QuestCategory;
  quests: PlannerQuestEntry[];
  onSelectQuest: (quest: PlannerQuestEntry) => void;
}) {
  const meta = CATEGORY_META[category];

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: meta.accent,
            fontFamily: 'Lexend-SemiBold',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          {meta.eyebrow}
        </Text>
        <Text
          style={{
            color: VP.textPri,
            fontFamily: 'Epilogue-Bold',
            fontSize: 24,
          }}
        >
          {meta.label}
        </Text>
        <Text
          style={{
            color: VP.textSec,
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {meta.description}
        </Text>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: `${meta.accent}30`,
          borderRadius: 999,
        }}
      />

      <View style={{ gap: 14 }}>
        {quests.map((quest, index) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            index={index}
            onPress={() => onSelectQuest(quest)}
          />
        ))}
      </View>
    </View>
  );
}

function QuestDetailModal({
  quest,
  visible,
  onClose,
  onStart,
}: {
  quest: PlannerQuestEntry | null;
  visible: boolean;
  onClose: () => void;
  onStart: (quest: PlannerQuestEntry) => void;
}) {
  if (!quest) return null;

  const categoryMeta = CATEGORY_META[quest.category];
  const statusMeta = getStatusMeta(quest.status, quest.accent);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}
      >
        <Pressable onPress={() => {}}>
          <Card
            variant="glass"
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderRadius: 0,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderTopColor: `${quest.accent}35`,
            }}
          >
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,
                alignSelf: 'center',
                backgroundColor: VP.textMuted,
                marginBottom: 20,
              }}
            />

            <View style={{ gap: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <RewardPill icon={categoryMeta.icon} color={categoryMeta.accent} label={categoryMeta.label} />
                    <RewardPill icon="compass" color={statusMeta.color} label={statusMeta.label} />
                  </View>

                  <View>
                    <Text
                      style={{
                        color: VP.textPri,
                        fontFamily: 'Epilogue-Bold',
                        fontSize: 27,
                        lineHeight: 30,
                        marginBottom: 6,
                      }}
                    >
                      {quest.name}
                    </Text>
                    <Text
                      style={{
                        color: VP.textSec,
                        fontFamily: 'BeVietnamPro-Regular',
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      {quest.tagline}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 18,
                    backgroundColor: `${quest.accent}1e`,
                    borderWidth: 1,
                    borderColor: `${quest.accent}38`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesome name={quest.icon} size={24} color={quest.accent} />
                </View>
              </View>

              <Card
                variant="recessed"
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(206,150,255,0.08)',
                }}
              >
                <Text
                  style={{
                    color: VP.textMuted,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Objective
                </Text>
                <Text
                  style={{
                    color: VP.textPri,
                    fontFamily: 'BeVietnamPro-Regular',
                    fontSize: 14,
                    lineHeight: 21,
                  }}
                >
                  {quest.objective}
                </Text>
              </Card>

              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: VP.textMuted,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Progress
                </Text>
                <ProgressStrip accent={quest.accent} percent={quest.progress.percent} />
                <Text
                  style={{
                    color: VP.textPri,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 13,
                  }}
                >
                  {quest.progress.summary}
                </Text>
                <Text
                  style={{
                    color: VP.textMuted,
                    fontFamily: 'BeVietnamPro-Regular',
                    fontSize: 12,
                  }}
                >
                  {quest.progress.detail}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: VP.textMuted,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    letterSpacing: 1.3,
                    textTransform: 'uppercase',
                  }}
                >
                  Planner Structure
                </Text>
                <Card
                  variant="elevated"
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: `${quest.accent}1f`,
                  }}
                >
                  <View style={{ gap: 12 }}>
                    {quest.previewSteps.map((step, index) => (
                      <View key={step} style={{ flexDirection: 'row', gap: 12 }}>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: `${quest.accent}20`,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              color: quest.accent,
                              fontFamily: 'Lexend-SemiBold',
                              fontSize: 11,
                            }}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            color: VP.textPri,
                            fontFamily: 'BeVietnamPro-Regular',
                            fontSize: 13,
                            lineHeight: 19,
                          }}
                        >
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <RewardPill icon="bookmark" color={quest.accent} label={quest.formatLabel} />
                <RewardPill icon="clock-o" color={VP.textSec} label={quest.durationLabel} />
                <DifficultyBadge difficulty={quest.difficulty} accent={quest.accent} />
                {quest.rewards.lp ? (
                  <RewardPill icon="bolt" color={VP.gold} label={`${quest.rewards.lp} LP`} />
                ) : null}
                {quest.rewards.cp ? (
                  <RewardPill icon="road" color={VP.cyan} label={`${quest.rewards.cp} CP`} />
                ) : null}
                {quest.rewards.diamonds ? (
                  <RewardPill icon="diamond" color={VP.primary} label={`${quest.rewards.diamonds} Diamonds`} />
                ) : null}
              </View>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                glowing={quest.status !== 'completed'}
                onPress={() => onStart(quest)}
              >
                {quest.status === 'completed' ? 'Run It Back' : quest.ctaLabel}
              </Button>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function QuestsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: workouts } = useMyWorkouts(250);
  const { data: myClan } = useMyClan();

  const [filter, setFilter] = useState<PlannerFilter>('all');
  const [selectedQuest, setSelectedQuest] = useState<PlannerQuestEntry | null>(null);

  const context = useMemo<QuestContext>(() => {
    const workoutList = workouts ?? [];
    const totalDistanceMiles = workoutList.reduce((sum, workout) => {
      const distanceKm = workout.route_data?.distance_km ?? 0;
      return sum + distanceKm * 0.621371;
    }, 0);

    return {
      totalWorkouts: workoutList.length,
      strengthCount: profile?.strength_workout_count ?? 0,
      scoutCount: profile?.scout_workout_count ?? 0,
      streak: profile?.current_streak ?? 0,
      trophies: profile?.trophy_rating ?? 0,
      hasClan: !!myClan,
      totalDistanceMiles,
    };
  }, [myClan, profile?.current_streak, profile?.scout_workout_count, profile?.strength_workout_count, profile?.trophy_rating, workouts]);

  const questEntries = useMemo<PlannerQuestEntry[]>(
    () =>
      QUESTS.map((quest) => {
        const progress = quest.evaluate(context);
        return {
          ...quest,
          progress,
          status: getQuestStatus(progress),
        };
      }),
    [context],
  );

  const completedCount = questEntries.filter((quest) => quest.status === 'completed').length;
  const trackingCount = questEntries.filter((quest) => quest.status === 'tracking').length;

  const featuredQuests = questEntries.filter((quest) =>
    filter === 'all' ? quest.featured : quest.featured && quest.category === filter,
  );

  const visibleCategories = (filter === 'all'
    ? (Object.keys(CATEGORY_META) as QuestCategory[])
    : [filter]) as QuestCategory[];

  const questsByCategory = useMemo(() => {
    return visibleCategories.map((category) => ({
      category,
      quests: questEntries.filter((quest) => quest.category === category),
    }));
  }, [questEntries, visibleCategories]);

  function launchQuest(quest: PlannerQuestEntry) {
    setSelectedQuest(null);
    router.push(quest.route as any);
  }

  return (
    <ScreenBackground glowPosition="top" glowColor={VP.primary} glowOpacity={0.12} withStarField>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-left" size={14} color={VP.textSec} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                color: VP.textPri,
                fontFamily: 'Epilogue-Bold',
                fontSize: 20,
                letterSpacing: 0.5,
              }}
            >
              QUEST PLANNER
            </Text>
          </View>

          <View
            style={{
              minWidth: 44,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: 'rgba(206,150,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(206,150,255,0.22)',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: VP.primary,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 11,
              }}
            >
              {trackingCount}
            </Text>
          </View>
        </View>

        <PlannerHeader
          completedCount={completedCount}
          trackingCount={trackingCount}
          totalCount={questEntries.length}
          totalDistanceMiles={context.totalDistanceMiles}
          streak={context.streak}
        />

        <View style={{ marginTop: 18, gap: 10 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Text
              style={{
                color: VP.textMuted,
                fontFamily: 'Lexend-SemiBold',
                fontSize: 10,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Quest Types
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
                {FILTERS.map((entry) => (
                  <FilterChip
                    key={entry.key}
                    label={entry.label}
                    selected={filter === entry.key}
                    onPress={() => setFilter(entry.key)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          {featuredQuests.length > 0 && (
            <View style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <Text
                  style={{
                    color: VP.textMuted,
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 10,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  Featured This Week
                </Text>
                <Text
                  style={{
                    color: VP.textPri,
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 22,
                  }}
                >
                  Funny names. Real training structure.
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingRight: 28 }}>
                  {featuredQuests.map((quest, index) => (
                    <FeaturedQuestCard
                      key={quest.id}
                      quest={quest}
                      index={index}
                      onPress={() => setSelectedQuest(quest)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 28 }}>
            {questsByCategory.map(({ category, quests }) => (
              <SectionBlock
                key={category}
                category={category}
                quests={quests}
                onSelectQuest={setSelectedQuest}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <QuestDetailModal
        quest={selectedQuest}
        visible={!!selectedQuest}
        onClose={() => setSelectedQuest(null)}
        onStart={launchQuest}
      />
    </ScreenBackground>
  );
}
