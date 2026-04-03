import { View, Text, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';

const VP = {
  surface:   '#0c0c1f',
  highest:   '#23233f',
  textPri:   '#e5e3ff',
  textSec:   '#aaa8c3',
  cyan:      '#81ecff',
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

export function WorkoutTypeModal({
  visible,
  onClose,
  onSelectStrength,
  onSelectCardio,
}: WorkoutTypeModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-[#0c0c1f]">
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

        {/* Cards */}
        <View className="flex-1 px-5 gap-4">
          {/* Strength Card */}
          <Pressable
            className="flex-1 bg-[#23233f] rounded-2xl p-6 items-center justify-center active:scale-[0.98]"
            style={cardBorder}
            onPress={onSelectStrength}
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
          </Pressable>

          {/* Cardio Card */}
          <Pressable
            className="flex-1 bg-[#23233f] rounded-2xl p-6 items-center justify-center active:scale-[0.98]"
            style={cardBorder}
            onPress={onSelectCardio}
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
          </Pressable>
        </View>

        {/* Bottom spacer */}
        <View className="h-8" />
      </SafeAreaView>
    </Modal>
  );
}
