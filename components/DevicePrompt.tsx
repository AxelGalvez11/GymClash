import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface DevicePromptProps {
  readonly workoutType: 'strength' | 'cardio';
  readonly onContinueWithDevice: () => void;
  readonly onContinueWithout: () => void;
  readonly onBack: () => void;
}

const SUBTITLE_MAP: Record<DevicePromptProps['workoutType'], string> = {
  strength:
    'Connecting a heart rate monitor earns a verified bonus multiplier on your score.',
  cardio:
    'GPS and HR device connection grants the full cardio point multiplier.',
};

export default function DevicePrompt({
  workoutType,
  onContinueWithDevice: _onContinueWithDevice,
  onContinueWithout,
  onBack,
}: DevicePromptProps) {
  function handleConnectDevice() {
    Alert.alert(
      'Coming Soon',
      'Device connections will be available in a future update.',
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top', 'bottom']}>
      {/* Back button */}
      <Pressable
        className="absolute top-14 left-4 z-10 w-10 h-10 items-center justify-center active:scale-[0.95]"
        onPress={onBack}
      >
        <FontAwesome name="chevron-left" size={18} color="#e5e3ff" />
      </Pressable>

      <View className="flex-1 justify-center px-6">
        {/* Title */}
        <Text
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
          className="text-2xl font-bold text-center mb-3"
        >
          Connect a Device
        </Text>

        {/* Subtitle */}
        <Text
          style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
          className="text-center text-sm mb-10 px-4"
        >
          {SUBTITLE_MAP[workoutType]}
        </Text>

        {/* Connected devices section */}
        <View className="bg-[#1d1d37] rounded-xl p-5 items-center mb-8">
          <FontAwesome
            name="plug"
            size={28}
            color="#74738b"
            style={{ marginBottom: 10 }}
          />
          <Text
            style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
            className="text-sm"
          >
            No devices connected
          </Text>
        </View>

        {/* Connect Device button */}
        <Pressable
          className="py-3.5 items-center rounded-xl mb-3 active:scale-[0.98]"
          style={{ backgroundColor: '#a434ff' }}
          onPress={handleConnectDevice}
        >
          <Text
            style={{ color: '#ffffff', fontFamily: 'Lexend-SemiBold' }}
            className="font-bold text-base"
          >
            Connect Device
          </Text>
        </Pressable>

        {/* Continue Without Device button */}
        <Pressable
          className="py-3.5 items-center rounded-xl active:scale-[0.98]"
          style={{ borderWidth: 1, borderColor: '#a434ff' }}
          onPress={onContinueWithout}
        >
          <Text
            style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }}
            className="font-bold text-base"
          >
            Continue Without Device
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
