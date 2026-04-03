import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type WarType = 'strength_only' | 'cardio_only' | 'mixed';

interface WarInitiationModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSendChallenge: (warType: WarType, durationDays: number) => void;
  readonly sending: boolean;
}

const WAR_TYPE_OPTIONS: ReadonlyArray<{
  readonly value: WarType;
  readonly label: string;
  readonly icon: 'heartbeat' | 'road' | 'bolt';
  readonly description: string;
}> = [
  { value: 'strength_only', label: 'Strength Only', icon: 'heartbeat', description: 'Compare lifting volume' },
  { value: 'cardio_only', label: 'Cardio Only', icon: 'road', description: 'Compare distance covered' },
  { value: 'mixed', label: 'Mixed', icon: 'bolt', description: 'Both lifting and cardio count' },
];

const DURATION_OPTIONS: ReadonlyArray<number> = [1, 2, 3, 5, 7];

export default function WarInitiationModal({
  visible,
  onClose,
  onSendChallenge,
  sending,
}: WarInitiationModalProps) {
  const [warType, setWarType] = useState<WarType>('mixed');
  const [duration, setDuration] = useState(7);

  function handleSend() {
    onSendChallenge(warType, duration);
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(12,12,31,0.9)' }}
      >
        <View className="bg-[#14142b] rounded-t-3xl px-5 pt-6 pb-10">
          {/* Title */}
          <Text
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
            className="text-xl font-bold text-center mb-6"
          >
            Initiate Clan War
          </Text>

          {/* War Type Section */}
          <Text
            style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}
            className="text-xs uppercase mb-2"
          >
            War Type
          </Text>
          <View className="gap-2 mb-6">
            {WAR_TYPE_OPTIONS.map((option) => {
              const isSelected = warType === option.value;
              return (
                <Pressable
                  key={option.value}
                  className="rounded-xl p-4 flex-row items-center active:scale-[0.98]"
                  style={[
                    { backgroundColor: '#23233f', borderWidth: 1.5 },
                    isSelected
                      ? {
                          borderColor: '#ce96ff',
                          shadowColor: '#ce96ff',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.35,
                          shadowRadius: 10,
                          elevation: 6,
                        }
                      : { borderColor: 'transparent' },
                  ]}
                  onPress={() => setWarType(option.value)}
                >
                  <View className="w-9 h-9 rounded-full bg-[#14142b] items-center justify-center mr-3">
                    <FontAwesome
                      name={option.icon}
                      size={16}
                      color={isSelected ? '#ce96ff' : '#74738b'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        color: isSelected ? '#e5e3ff' : '#aaa8c3',
                        fontFamily: 'Lexend-SemiBold',
                      }}
                      className="font-bold"
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
                      className="text-xs"
                    >
                      {option.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <FontAwesome name="check-circle" size={18} color="#ce96ff" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Duration Section */}
          <Text
            style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold' }}
            className="text-xs uppercase mb-2"
          >
            Duration (days)
          </Text>
          <View className="flex-row gap-2 mb-6">
            {DURATION_OPTIONS.map((d) => {
              const isSelected = duration === d;
              return (
                <Pressable
                  key={d}
                  className="flex-1 py-2.5 rounded-xl items-center active:scale-[0.95]"
                  style={{
                    backgroundColor: isSelected ? '#a434ff' : '#23233f',
                  }}
                  onPress={() => setDuration(d)}
                >
                  <Text
                    style={{
                      color: isSelected ? '#ffffff' : '#74738b',
                      fontFamily: 'Lexend-SemiBold',
                    }}
                    className="font-bold"
                  >
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Find Opponent Button */}
          <Pressable
            className="py-3.5 rounded-xl items-center active:scale-[0.98]"
            style={{
              backgroundColor: sending ? '#7a24cc' : '#a434ff',
              opacity: sending ? 0.7 : 1,
            }}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={{ color: '#ffffff', fontFamily: 'Epilogue-Bold' }}
                className="text-lg font-bold"
              >
                Find Opponent
              </Text>
            )}
          </Pressable>

          {/* Cancel Link */}
          <Pressable
            className="py-3 items-center active:opacity-60"
            onPress={onClose}
          >
            <Text
              style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
              className="text-sm"
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
