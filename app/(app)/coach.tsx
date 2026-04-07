import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  SlideInDown,
  FadeOut,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

import { useProfile } from '@/hooks/use-profile';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';
import { Colors } from '@/constants/theme';

// ─── Victory Peak palette — pulls from theme ────────────
const VP = {
  surface:    Colors.surface.DEFAULT,
  raised:     Colors.surface.container,
  active:     Colors.surface.containerHigh,
  highest:    Colors.surface.containerHighest,
  textPri:    Colors.text.primary,
  textSec:    Colors.text.secondary,
  textMuted:  Colors.text.muted,
  primary:    Colors.primary.DEFAULT,
  primaryDim: Colors.primary.dim,
  gold:       Colors.secondary.DEFAULT,
  cyan:       Colors.tertiary.DEFAULT,
  green:      Colors.success,
} as const;

// ─── Types ───────────────────────────────────────────────
type Role = 'user' | 'coach';

interface Message {
  id: string;
  role: Role;
  text: string;
  ts: number;
}

interface CommandSuggestion {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  description: string;
  prefix: string;
  prompt: string;
}

// ─── Slash commands ──────────────────────────────────────
const COMMANDS: CommandSuggestion[] = [
  { icon: 'calendar', label: 'Plan', description: 'Build a workout plan', prefix: '/plan', prompt: 'Build me a 30-day workout plan' },
  { icon: 'bolt', label: 'Muscle', description: 'How to build muscle', prefix: '/muscle', prompt: 'How do I build muscle effectively?' },
  { icon: 'fire', label: 'Fat Loss', description: 'Fat loss strategy', prefix: '/fatloss', prompt: 'What is the best strategy for fat loss?' },
  { icon: 'cutlery', label: 'Nutrition', description: 'Pre/post nutrition tips', prefix: '/nutrition', prompt: 'Give me pre and post workout nutrition tips' },
  { icon: 'heartbeat', label: 'Recovery', description: 'Recovery strategies', prefix: '/recovery', prompt: 'What are the best recovery strategies?' },
  { icon: 'road', label: 'Run Faster', description: 'Improve running speed', prefix: '/run', prompt: 'How do I improve my running speed?' },
  { icon: 'star', label: 'Beginner', description: 'Where to start', prefix: '/beginner', prompt: 'I am a complete beginner. Where do I start?' },
  { icon: 'cog', label: 'Squat Form', description: 'Perfect your squat', prefix: '/squat', prompt: 'How do I improve my squat form?' },
];

// ─── Suggestion chips (tap-based) ────────────────────────
const SUGGESTIONS = [
  { label: '30-day plan', icon: 'calendar', prompt: 'Build me a 30-day workout plan' },
  { label: 'Build muscle', icon: 'bolt', prompt: 'How do I build muscle effectively?' },
  { label: 'Lose fat', icon: 'fire', prompt: 'What is the best strategy for fat loss?' },
  { label: 'Run faster', icon: 'road', prompt: 'How do I improve my running speed?' },
  { label: 'Nutrition tips', icon: 'cutlery', prompt: 'Give me pre and post workout nutrition tips' },
  { label: 'Recovery', icon: 'heartbeat', prompt: 'What are the best recovery strategies?' },
  { label: 'Beginner guide', icon: 'star', prompt: 'I am a complete beginner. Where do I start?' },
  { label: 'Squat form', icon: 'cog', prompt: 'How do I improve my squat form?' },
] as const;

// ─── Coach brain — keyword-matched responses ─────────────
function coachReply(input: string): string {
  const q = input.toLowerCase();

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  if (q.includes('30') && (q.includes('day') || q.includes('plan') || q.includes('program'))) {
    return `Here's your personalised **30-Day GymClash Plan**:\n\n` +
      `**Week 1 — Foundation**\n• Day 1, 3, 5: Full-body strength (squat, press, row)\n• Day 2, 4: 20-min easy run\n• Day 6: Active recovery walk\n• Day 7: Rest\n\n` +
      `**Week 2 — Volume Up**\n• Day 1, 3, 5: Upper/Lower split, add 5% weight\n• Day 2, 4: 25-min run at moderate pace\n• Day 6: Mobility + core\n• Day 7: Rest\n\n` +
      `**Week 3 — Intensity**\n• Day 1, 3, 5: Push/Pull/Legs split\n• Day 2, 4: Interval run — 1 min fast, 2 min easy × 8\n• Day 6: Yoga or stretching\n• Day 7: Rest\n\n` +
      `**Week 4 — Peak & Deload**\n• Day 1, 2, 3: Hit personal bests on key lifts\n• Day 4, 5: Easy cardio only\n• Day 6, 7: Rest and recover\n\n` +
      `Log every session in GymClash to earn points and track your streak! 🔥`;
  }

  if (q.includes('muscle') || q.includes('bulk') || q.includes('hypertrophy') || q.includes('gain')) {
    return `**Building Muscle — the GymClash Way** 💪\n\n` +
      `1. **Progressive overload** — add small weight or reps each session. The strength screen tracks your sets automatically.\n\n` +
      `2. **Hit 10-20 sets per muscle group per week** — spread across 2-4 sessions.\n\n` +
      `3. **Protein** — aim for 0.7–1g per lb of bodyweight. Prioritise whole foods + a shake if needed.\n\n` +
      `4. **Sleep 7-9 hours** — growth hormone peaks during deep sleep.\n\n` +
      `5. **Calorie surplus** — eat ~200-300 kcal above maintenance. Use your biodata weight to track progress.\n\n` +
      `6. **Compound lifts first** — squat, deadlift, bench, row. Isolation work after.\n\nTrack every lift in GymClash and watch your Lifting Points climb! ⚡`;
  }

  if (q.includes('fat') || q.includes('lose weight') || q.includes('cut') || q.includes('slim') || q.includes('calorie')) {
    return `**Fat Loss Blueprint** 🔥\n\n` +
      `1. **Calorie deficit** — eat 300-500 kcal below maintenance. This is 80% of the equation.\n\n` +
      `2. **Keep lifting** — muscle is metabolically expensive. Don't drop weights during a cut.\n\n` +
      `3. **Cardio** — add 2-3 scout runs per week. Distance earns Cardio Points AND burns calories.\n\n` +
      `4. **High protein** — 1g per lb bodyweight prevents muscle loss while dieting.\n\n` +
      `5. **Patience** — 0.5-1 lb per week is sustainable and muscle-sparing.\n\n` +
      `6. **Consistency > perfection** — a 90% adherent plan beats a perfect plan you quit.\n\nLog everything in GymClash and let the streak system keep you accountable! 🏆`;
  }

  if (q.includes('run') && (q.includes('faster') || q.includes('speed') || q.includes('pace') || q.includes('improve'))) {
    return `**Run Faster in 4 Weeks** 🏃\n\n` +
      `1. **Interval training** — 6×400m at hard effort with 90s rest. Once a week.\n\n` +
      `2. **Easy runs** — 80% of your runs should feel conversational. This builds aerobic base.\n\n` +
      `3. **Tempo runs** — 20 min at "comfortably hard" pace. Improves lactate threshold.\n\n` +
      `4. **Strength train** — single-leg squats, hip thrusts, and calf raises directly improve running economy.\n\n` +
      `5. **Run more** — mileage is the single best predictor of running improvement.\n\n` +
      `6. **Cadence** — aim for ~170-180 steps/minute. Shorter, quicker strides reduce injury risk.\n\nYour Scout territory runs track pace automatically — watch your numbers drop! ⚡`;
  }

  if (q.includes('nutrition') || q.includes('diet') || q.includes('eat') || q.includes('food') || q.includes('protein') || q.includes('pre') || q.includes('post')) {
    return `**Workout Nutrition Guide** 🥗\n\n` +
      `**Pre-workout (1-2h before)**\n• Complex carbs + moderate protein\n• Oatmeal + eggs, rice + chicken, banana + Greek yogurt\n• Stay hydrated — even 2% dehydration hurts performance\n\n` +
      `**During workout**\n• Water for sessions under 60 min\n• Electrolyte drink for 60+ min sessions\n\n` +
      `**Post-workout (within 30-60 min)**\n• Protein + fast carbs\n• Protein shake + fruit, chicken + white rice, cottage cheese + honey\n• Aim for 20-40g protein\n\n` +
      `**Daily targets**\n• Protein: 0.7-1g per lb bodyweight\n• Carbs: 40-50% of calories (scale up on heavy training days)\n• Fats: 0.35g per lb bodyweight minimum\n\nEnter your stats in Biodata to personalise your scoring! 💊`;
  }

  if (q.includes('recover') || q.includes('rest') || q.includes('sore') || q.includes('sleep') || q.includes('doms')) {
    return `**Recovery — where gains actually happen** 😴\n\n` +
      `1. **Sleep 7-9 hours** — non-negotiable. HGH is released during deep sleep.\n\n` +
      `2. **Protein before bed** — casein (cottage cheese, Greek yogurt) feeds muscle repair overnight.\n\n` +
      `3. **Active recovery** — light walks, cycling, or yoga on rest days keeps blood moving without taxing the CNS.\n\n` +
      `4. **Cold/contrast showers** — cold water reduces acute inflammation. Contrast (hot/cold) cycles improve circulation.\n\n` +
      `5. **Foam roll + stretch** — 10 min post-session on tight areas (hip flexors, lats, calves).\n\n` +
      `6. **Deload weeks** — every 4-6 weeks, drop volume by 40%. You come back stronger.\n\n` +
      `7. **Manage stress** — cortisol competes with testosterone. Meditation, breathing work, nature walks all help.\n\n` +
      `Listen to your body. An extra rest day now > an injury that costs you 3 weeks. 🌿`;
  }

  if (q.includes('beginner') || q.includes('start') || q.includes('new') || q.includes('first')) {
    return `**Welcome, Warrior! 🎖️ Here's your starting point:**\n\n` +
      `**Phase 1 (Weeks 1-4): Learn the basics**\n• 3 full-body sessions/week\n• Focus on form over weight\n• Key lifts: goblet squat, push-up, dumbbell row, hip hinge\n\n` +
      `**Phase 2 (Weeks 5-8): Build the habit**\n• Add a 20-min easy run twice a week\n• Start tracking weight in GymClash\n• Eat more protein (eggs, chicken, legumes)\n\n` +
      `**Phase 3 (Weeks 9-12): Push harder**\n• Increase weights 5-10% when you can complete all reps cleanly\n• Add your first clan war\n• Set a personal best on squats and bench\n\n` +
      `**Rules to live by:**\n• Consistency > intensity\n• Progress, don't perfectify\n• Sleep and eat enough — training is the trigger, recovery is the growth\n\nJoin a clan and make it social. Accountability is a cheat code. 🏆`;
  }

  if (q.includes('squat') && (q.includes('form') || q.includes('tip') || q.includes('how') || q.includes('improve'))) {
    return `**Squat Form Checklist** 🏋️\n\n` +
      `**Setup**\n• Bar on upper traps (high bar) or rear delts (low bar)\n• Feet shoulder-width, toes turned out 15-30°\n• Take a big breath into your belly (360° brace)\n\n` +
      `**Descent**\n• Push knees OUT in line with toes\n• Hips travel back AND down — don't just drop\n• Keep chest tall, don't let torso fold forward\n• Go to parallel or below (crease of hip below knee)\n\n` +
      `**Ascent**\n• Drive through your whole foot\n• Push floor away, don't think "stand up"\n• Keep bracing until lockout\n\n` +
      `**Common fixes**\n• Knees caving → weak glutes/adductors → add banded squats\n• Chest falling → weak upper back → add face pulls, pause squats\n• Heel rising → tight ankles → elevate heels or do calf stretches\n\n` +
      `Film yourself from the side every few sessions and compare! 📹`;
  }

  if (q.includes('upper body') || q.includes('chest') || q.includes('shoulders') || q.includes('push day') || q.includes('push workout')) {
    return `**Upper Body Day** 💪\n\n` +
      `**Push Circuit (do in order):**\n` +
      `• Bench Press — 4 sets × 6-8 reps\n` +
      `• Overhead Press — 3 sets × 8-10 reps\n` +
      `• Incline Dumbbell Press — 3 sets × 10-12 reps\n` +
      `• Lateral Raises — 3 sets × 15 reps\n` +
      `• Tricep Dips — 3 sets × 12-15 reps\n\n` +
      `**Tips:**\n` +
      `• Rest 90-120s between heavy compound sets\n` +
      `• Go close to failure on isolation work\n` +
      `• Log every set in GymClash to earn Lifting Points! ⚡`;
  }

  if (q.includes('arm') || q.includes('bicep') || q.includes('tricep') || q.includes('curl')) {
    return `**Arm Day** 💪\n\n` +
      `**Bicep + Tricep Blaster:**\n` +
      `• Barbell Curl — 4 sets × 8-10 reps\n` +
      `• Skull Crushers — 4 sets × 8-10 reps\n` +
      `• Dumbbell Hammer Curl — 3 sets × 12 reps\n` +
      `• Rope Pushdown — 3 sets × 12-15 reps\n` +
      `• Concentration Curl — 3 sets × 15 reps\n` +
      `• Overhead Tricep Extension — 3 sets × 12 reps\n\n` +
      `**Tips:**\n` +
      `• Use a controlled tempo — 2 sec down, 1 sec up\n` +
      `• Superset curls and extensions to shorten workout\n` +
      `• Track volume: aim for 20+ sets per arm weekly\n` +
      `• Log every rep in GymClash for Lifting Points! ⚡`;
  }

  if (q.includes('leg') || q.includes('squat day') || q.includes('lower body')) {
    return `**Leg Day** 🦵\n\n` +
      `**Lower Body Powerhouse:**\n` +
      `• Barbell Squat — 4 sets × 5-6 reps\n` +
      `• Romanian Deadlift — 3 sets × 8-10 reps\n` +
      `• Leg Press — 3 sets × 12-15 reps\n` +
      `• Walking Lunges — 3 sets × 20 steps\n` +
      `• Leg Curl — 3 sets × 15 reps\n` +
      `• Calf Raises — 4 sets × 20 reps\n\n` +
      `**Tips:**\n` +
      `• Squat warm-up: empty bar, then add small jumps\n` +
      `• RDL with hip hinge — feel the hamstring stretch\n` +
      `• Rest 2-3 min on compound lifts\n` +
      `• Log your heaviest lifts in GymClash! ⚡`;
  }

  if (q.includes('core') || q.includes('abs') || q.includes('ab workout') || q.includes('plank')) {
    return `**Core & Abs** 🫀\n\n` +
      `**Core Carver Routine:**\n` +
      `• Weighted Plank Hold — 4 sets × 45-60 sec\n` +
      `• Barbell Rollout — 3 sets × 12-15 reps\n` +
      `• Cable Crunch — 3 sets × 15-20 reps\n` +
      `• Hanging Leg Raise — 3 sets × 10-15 reps\n` +
      `• Pallof Press — 3 sets × 12 per side\n` +
      `• Dead Bug — 3 sets × 15 per side\n\n` +
      `**Tips:**\n` +
      `• Core is built in the kitchen — diet 70%, exercise 30%\n` +
      `• Never hold your breath during planks\n` +
      `• 3-4 days/week of core work is ideal\n` +
      `• Log your plank times and watch them grow! ⚡`;
  }

  if (q.includes('hiit') || q.includes('interval') || q.includes('circuit')) {
    return `**HIIT & Circuit Training** 🔥\n\n` +
      `**High Intensity Interval Workout:**\n` +
      `• Warm-up: 5 min easy pace\n` +
      `• 10 × 40 sec hard / 20 sec easy\n` +
      `• Exercises: Jump squat, burpee, mountain climber, box jump\n` +
      `• Cool-down: 5 min walk\n\n` +
      `**Circuit Alternative (3 rounds):**\n` +
      `• 12x Push-ups\n` +
      `• 12x Kettlebell Swings\n` +
      `• 12x Box Jumps\n` +
      `• 12x DB Rows\n` +
      `• 30 sec rest between rounds\n\n` +
      `**Tips:**\n` +
      `• HIIT torches calories even after workout (EPOC)\n` +
      `• Limit to 2x/week to avoid overtraining\n` +
      `• Scale intensity to YOUR fitness level\n` +
      `• Log these sessions in GymClash for Cardio Points! ⚡`;
  }

  if (q.includes('back') || q.includes('pull day') || q.includes('deadlift') || q.includes('pull workout')) {
    return `**Pull Day** 🔗\n\n` +
      `**Back & Deadlift Power:**\n` +
      `• Deadlift — 4 sets × 4-5 reps\n` +
      `• Pull-ups — 3 sets × to failure\n` +
      `• Barbell Row — 3 sets × 8 reps\n` +
      `• Face Pulls — 3 sets × 15 reps\n` +
      `• Barbell Curl — 3 sets × 12 reps\n` +
      `• Back Hyperextension — 3 sets × 12 reps\n\n` +
      `**Tips:**\n` +
      `• Deadlift form: chest up, lats engaged, straight bar path\n` +
      `• Pull-ups: dead hang for lat recruitment\n` +
      `• Rows: retract scapula hard, squeeze at the top\n` +
      `• Log your PRs and progressions in GymClash! ⚡`;
  }

  if (q.includes('full body') || q.includes('total body') || q.includes('compound')) {
    return `**Full Body Workout** 🏋️\n\n` +
      `**Total Body Strength:**\n` +
      `• Compound A: Barbell Squat — 4 sets × 5 reps\n` +
      `• Compound B: Bench Press — 4 sets × 5 reps\n` +
      `• Compound C: Bent Barbell Row — 3 sets × 8 reps\n` +
      `• Accessory 1: Leg Press — 3 sets × 12 reps\n` +
      `• Accessory 2: Dumbbell Rows — 3 sets × 12 reps\n` +
      `• Accessory 3: Push-ups — 3 sets × 15 reps\n\n` +
      `**Tips:**\n` +
      `• Do heavy compounds first (when fresh)\n` +
      `• Alternate full-body sessions: A, B, C\n` +
      `• Rest 2-3 days between sessions\n` +
      `• Perfect for beginners & busy schedules\n` +
      `• Log everything in GymClash for max gains! ⚡`;
  }

  // Generic fallback with multiple variants
  const fallbacks = [
    `Great question! Here's what I'd recommend:\n\n` +
    `Based on your GymClash goals, focus on:\n\n` +
    `1. **Consistency** — show up 4-5 days/week even when motivation is low\n` +
    `2. **Progressive overload** — add a little more each session\n` +
    `3. **Log everything** — what gets tracked gets improved\n` +
    `4. **Sleep 8 hours** — recovery is half the battle\n` +
    `5. **Join your clan war** — social accountability triples adherence\n\n` +
    `Want me to dive deeper? Ask me about nutrition, strength routines, cardio plans, or recovery strategies! 💪`,

    `I like the energy! Here's my best general advice:\n\n` +
    `**The 5 Pillars of GymClash Success:**\n` +
    `1. **Effort** — every rep counts, especially the hard ones\n` +
    `2. **Frequency** — more training days = more points\n` +
    `3. **Intensity** — progressive overload is non-negotiable\n` +
    `4. **Nutrition** — you can't out-train bad food\n` +
    `5. **Recovery** — gains happen when you rest\n\n` +
    `Try asking me about specific workouts like leg day, push day, HIIT, or nutrition timing! 💪`,

    `Solid mindset! Let me give you my core principles:\n\n` +
    `**Train Like a Champion:**\n` +
    `• Show up even when you don't feel like it\n` +
    `• Log EVERY set — missing data = missing gains\n` +
    `• Eat enough protein — aim for 1g per lb bodyweight\n` +
    `• Sleep 7-9 hours — this is when you grow\n` +
    `• Stay hydrated — even 2% dehydration kills performance\n\n` +
    `Need a specific routine? Ask about upper body, leg day, back work, or full-body splits! 💪`,
  ];

  return pick(fallbacks);
}

// ─── Renders markdown-ish bold text ──────────────────────
function RichText({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ color, fontFamily: 'BeVietnamPro-Regular', fontSize: 14, lineHeight: 21 }}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontFamily: 'Epilogue-Bold', color }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// ─── Message bubble — spring-up entrance on mount ────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const { animatedStyle } = useEntrance(0, 'spring-up');

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
          paddingHorizontal: 4,
        },
        animatedStyle,
      ]}
    >
      {!isUser && (
        <LinearGradient
          colors={['#a434ff', '#ce96ff']}
          style={{
            width: 32, height: 32, borderRadius: 16,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 8, marginTop: 2, flexShrink: 0,
          }}
        >
          <FontAwesome name="bolt" size={14} color="#fff" />
        </LinearGradient>
      )}
      <View
        style={{
          maxWidth: '78%',
          backgroundColor: isUser ? '#a434ff' : VP.active,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: isUser ? 'rgba(206,150,255,0.4)' : 'rgba(206,150,255,0.12)',
        }}
      >
        <RichText
          text={msg.text}
          color={isUser ? '#fff' : VP.textPri}
        />
      </View>
    </Animated.View>
  );
}

// ─── Animated typing dots (bouncing) ─────────────────────
function TypingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 300 }),
          withTiming(0.85, { duration: 300 }),
        ),
        -1,
        true,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 300 }),
          withTiming(0.3, { duration: 300 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: VP.primary,
          marginHorizontal: 2,
        },
        animStyle,
      ]}
    />
  );
}

function TypingIndicator() {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 12 }}>
      <LinearGradient
        colors={['#a434ff', '#ce96ff']}
        style={{
          width: 32, height: 32, borderRadius: 16,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 8, marginTop: 2,
        }}
      >
        <FontAwesome name="bolt" size={14} color="#fff" />
      </LinearGradient>
      <View
        style={{
          backgroundColor: VP.active,
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: 'rgba(206,150,255,0.12)',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TypingDot delay={0} />
        <TypingDot delay={150} />
        <TypingDot delay={300} />
      </View>
    </View>
  );
}

// ─── Command palette row ─────────────────────────────────
function CommandRow({
  cmd,
  active,
  onPress,
}: {
  cmd: CommandSuggestion;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: active ? 'rgba(206,150,255,0.12)' : 'transparent',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: active ? 'rgba(164,52,255,0.2)' : VP.highest,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name={cmd.icon} size={12} color={active ? VP.primary : VP.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: active ? VP.textPri : VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
          {cmd.label}
        </Text>
        <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
          {cmd.description}
        </Text>
      </View>
      <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>
        {cmd.prefix}
      </Text>
    </Pressable>
  );
}

// ─── Animated suggestion chip — grid variant ─────────────
function SuggestionChipGrid({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.95);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => ({
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? '#23233f' : VP.raised,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: 'rgba(206,150,255,0.2)',
          minWidth: 80,
        })}
      >
        <FontAwesome name={icon as any} size={18} color={VP.primary} style={{ marginBottom: 6 }} />
        <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 11, textAlign: 'center' }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Animated suggestion chip — horizontal strip variant ──
function SuggestionChipStrip({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale(0.95);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: pressed ? '#23233f' : VP.raised,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: 'rgba(206,150,255,0.18)',
        })}
      >
        <FontAwesome name={icon as any} size={10} color={VP.primary} />
        <Text style={{ color: VP.textSec, fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────
export default function CoachScreen() {
  const { data: profile } = useProfile();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'coach',
      text: `Hey Warrior! I'm your GymClash Coach. Ask me anything about training, nutrition, or recovery — or tap a suggestion below to get started. 💪`,
      ts: Date.now(),
    },
  ]);

  // Update welcome message with real display name once profile loads
  useEffect(() => {
    if (!profile?.display_name) return;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome'
          ? { ...m, text: `Hey ${profile.display_name}! I'm your GymClash Coach. Ask me anything about training, nutrition, or recovery — or tap a suggestion below to get started. 💪` }
          : m
      )
    );
  }, [profile?.display_name]);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Entrance animations ───────────────────────────────
  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: proBadgeStyle } = useEntrance(120, 'fade-scale');

  // ── Send button animations ────────────────────────────
  const hasInput = input.trim().length > 0;
  const { animatedStyle: sendScaleStyle, onPressIn: sendPressIn, onPressOut: sendPressOut } = usePressScale(0.92);
  const { glowStyle: sendGlowStyle } = useGlowPulse('#a434ff', 0.3, 0.75, 2000, hasInput && !thinking);

  // ── Online dot glow ───────────────────────────────────
  const { glowStyle: dotGlowStyle } = useGlowPulse('#22c55e', 0.25, 0.7, 2800, true);

  // ── Command palette logic ─────────────────────────────
  const filteredCommands = input.startsWith('/') && !input.includes(' ')
    ? COMMANDS.filter((cmd) => cmd.prefix.startsWith(input))
    : [];

  useEffect(() => {
    if (input.startsWith('/') && !input.includes(' ') && filteredCommands.length > 0) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, [input, filteredCommands.length]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const selectCommand = useCallback((cmd: CommandSuggestion) => {
    setShowCommands(false);
    setInput('');
    send(cmd.prompt);
  }, []);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const t1 = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    timersRef.current.push(t1);

    // Simulated coach "thinking" delay
    const t2 = setTimeout(() => {
      if (!mountedRef.current) return;
      const reply = coachReply(trimmed);
      const coachMsg: Message = { id: `c-${Date.now()}`, role: 'coach', text: reply, ts: Date.now() };
      setMessages((prev) => [...prev, coachMsg]);
      setThinking(false);
      const t3 = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
      timersRef.current.push(t3);
    }, 900 + Math.random() * 600);
    timersRef.current.push(t2);
  }, [thinking]);

  const isEmpty = messages.length <= 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: VP.surface }} edges={['top']}>

      {/* Header — fade-slide entrance */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(206,150,255,0.12)',
          },
          headerStyle,
        ]}
      >
        <LinearGradient
          colors={['#a434ff', '#ce96ff']}
          style={{
            width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <FontAwesome name="bolt" size={18} color="#fff" />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={{ color: VP.textPri, fontFamily: 'Epilogue-Bold', fontSize: 18 }}>GymClash Coach</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {/* Online dot — green glow pulse */}
            <Animated.View
              style={[
                { width: 6, height: 6, borderRadius: 3, backgroundColor: VP.green },
                dotGlowStyle,
              ]}
            />
            <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>ONLINE · AI-POWERED</Text>
          </View>
        </View>

        {/* PRO badge — fade-scale entrance */}
        <Animated.View
          style={[
            {
              backgroundColor: 'rgba(255,215,9,0.12)',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderWidth: 1,
              borderColor: 'rgba(255,215,9,0.3)',
            },
            proBadgeStyle,
          ]}
        >
          <Text style={{ color: VP.gold, fontFamily: 'Lexend-SemiBold', fontSize: 10 }}>PRO</Text>
        </Animated.View>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))}
          {thinking && <TypingIndicator />}

          {/* Suggestion chips — shown below welcome message when chat is empty */}
          {isEmpty && !thinking && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
                Suggested Topics
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {SUGGESTIONS.slice(0, 4).map((s) => (
                  <SuggestionChipGrid
                    key={s.label}
                    label={s.label}
                    icon={s.icon}
                    onPress={() => send(s.prompt)}
                  />
                ))}
              </View>

              {/* Ideas hint */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, opacity: 0.5 }}>
                <FontAwesome name="question-circle-o" size={13} color={VP.textMuted} />
                <Text style={{ color: VP.textMuted, fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
                  Tap ? for more ideas
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick chips strip — always visible at top of input area */}
        {!isEmpty && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            style={{ flexGrow: 0, borderTopWidth: 0.5, borderTopColor: 'rgba(206,150,255,0.08)' }}
          >
            {SUGGESTIONS.map((s) => (
              <SuggestionChipStrip
                key={s.label}
                label={s.label}
                icon={s.icon}
                onPress={() => send(s.prompt)}
              />
            ))}
          </ScrollView>
        )}

        {/* Command palette — slides up above input when typing "/" */}
        {showCommands && (
          <Animated.View
            entering={SlideInDown.duration(150)}
            exiting={FadeOut.duration(100)}
            style={{
              backgroundColor: 'rgba(12,12,31,0.98)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(206,150,255,0.15)',
              maxHeight: 240,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
              <FontAwesome name="terminal" size={10} color={VP.textMuted} />
              <Text style={{ color: VP.textMuted, fontFamily: 'Lexend-SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                Commands
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 200 }}>
              {filteredCommands.map((cmd, i) => (
                <CommandRow
                  key={cmd.prefix}
                  cmd={cmd}
                  active={i === 0}
                  onPress={() => selectCommand(cmd)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 16,
            paddingVertical: 8,
            paddingBottom: 4,
            gap: 10,
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(206,150,255,0.12)',
            backgroundColor: VP.raised,
          }}
        >
          {/* Slash command button */}
          <Pressable
            onPress={() => {
              if (showCommands) {
                setShowCommands(false);
                setInput('');
              } else {
                setInput('/');
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: showCommands ? 'rgba(164,52,255,0.2)' : VP.active,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: showCommands ? 'rgba(164,52,255,0.4)' : 'rgba(206,150,255,0.12)',
            }}
          >
            <FontAwesome name="question" size={14} color={showCommands ? VP.primary : VP.textMuted} />
          </Pressable>

          <TextInput
            style={{
              flex: 1,
              backgroundColor: VP.active,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: VP.textPri,
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 14,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: hasInput ? 'rgba(206,150,255,0.35)' : 'rgba(206,150,255,0.12)',
            }}
            placeholder="Ask your coach..."
            placeholderTextColor={VP.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
          />

          {/* Send button — press scale + breathing glow when input is non-empty */}
          <Animated.View
            style={[
              {
                width: 44,
                height: 44,
                borderRadius: 22,
                opacity: !hasInput || thinking ? 0.4 : 1,
              },
              sendScaleStyle,
              sendGlowStyle,
            ]}
          >
            <Pressable
              onPress={() => send(input)}
              onPressIn={sendPressIn}
              onPressOut={sendPressOut}
              disabled={!hasInput || thinking}
              style={{ width: 44, height: 44, borderRadius: 22 }}
            >
              <LinearGradient
                colors={['#a434ff', '#ce96ff']}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FontAwesome name="send" size={16} color="#fff" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
