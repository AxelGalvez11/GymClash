import { useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';

const VP = {
  surface: Colors.surface.DEFAULT,
  highest: Colors.surface.containerHighest,
  textPri: Colors.text.primary,
  textSec: Colors.text.secondary,
  cyan:    Colors.tertiary.DEFAULT,
} as const;

const cardBorder = {
  borderWidth: 1,
  borderColor: 'rgba(206,150,255,0.15)',
} as const;

type WorkoutTypeModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectStrength: () => void;
  onSelectCardio: () => void;
};

function AnimatedCard({
  delay,
  onPress,
  onPressIn,
  onPressOut,
  animatedStyle,
  children,
}: {
  readonly delay: number;
  readonly onPress: () => void;
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
  readonly animatedStyle: object;
  readonly children: React.ReactNode;
}) {
  const entrance = useEntrance(delay, 'spring-up');
  return (
    <Reanimated.View style={[{ flex: 1 }, entrance.animatedStyle, animatedStyle]}>
      <Pressable
        className="flex-1 bg-[#23233f] rounded-2xl p-6 items-center justify-center"
        style={cardBorder}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        {children}
      </Pressable>
    </Reanimated.View>
  );
}

export function WorkoutTypeModal({
  visible,
  onClose,
  onSelectStrength,
  onSelectCardio,
}: WorkoutTypeModalProps) {
  // Backdrop fade — fully reanimated, no RN Animated API
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = 0;
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      backdropOpacity.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: backdropOpacity.value,
    backgroundColor: VP.surface,
  }));

  // Press-scale hooks for each card
  const strengthPress = usePressScale(0.97);
  const cardioPress = usePressScale(0.97);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Reanimated.View style={backdropStyle}>
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row justify-end px-5 pt-2 pb-4">
            <Pressable
              className="w-10 h-10 rounded-full bg-[#23233f] items-center justify-center active:scale-[0.98]"
              onPress={onClose}
            >
              <FontAwesome name="close" size={18} color={VP.textSec} />
            </Pressable>
          </View>

          {/* Title */}
          <View className="items-center px-5 mb-6">
            <Text
              className="text-2xl text-center mb-2"
              style={{ fontFamily: 'Epilogue-Bold', color: VP.textPri, fontWeight: 'bold' }}
            >
              Choose Your Workout
            </Text>
            <Text
              className="text-sm text-center"
              style={{ fontFamily: 'BeVietnamPro-Regular', color: VP.textSec }}
            >
              Select a workout type to begin
            </Text>
          </View>

          {/* Cards — spring up with stagger */}
          <View className="flex-1 px-5 gap-4">
            {/* Strength Card */}
            <AnimatedCard
              delay={120}
              onPress={onSelectStrength}
              onPressIn={strengthPress.onPressIn}
              onPressOut={strengthPress.onPressOut}
              animatedStyle={strengthPress.animatedStyle}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: Colors.danger + '15' }}
              >
                <FontAwesome name="heartbeat" size={40} color={Colors.danger} />
              </View>
              <Text
                className="text-xl mb-1"
                style={{ fontFamily: 'Epilogue-Bold', color: VP.textPri, fontWeight: 'bold' }}
              >
                Strength
              </Text>
              <Text
                className="text-sm"
                style={{ fontFamily: 'BeVietnamPro-Regular', color: VP.textSec }}
              >
                Log sets, reps, and weight
              </Text>
            </AnimatedCard>

            {/* Cardio Card */}
            <AnimatedCard
              delay={220}
              onPress={onSelectCardio}
              onPressIn={cardioPress.onPressIn}
              onPressOut={cardioPress.onPressOut}
              animatedStyle={cardioPress.animatedStyle}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: VP.cyan + '15' }}
              >
                <FontAwesome name="road" size={40} color={VP.cyan} />
              </View>
              <Text
                className="text-xl mb-1"
                style={{ fontFamily: 'Epilogue-Bold', color: VP.textPri, fontWeight: 'bold' }}
              >
                Cardio
              </Text>
              <Text
                className="text-sm"
                style={{ fontFamily: 'BeVietnamPro-Regular', color: VP.textSec }}
              >
                Log distance, pace, and heart rate
              </Text>
            </AnimatedCard>
          </View>

          {/* Bottom spacer */}
          <View className="h-8" />
        </SafeAreaView>
      </Reanimated.View>
    </Modal>
  );
}
