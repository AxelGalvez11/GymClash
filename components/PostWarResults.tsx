import { useEffect, useRef } from 'react';
import { View, Text, Modal, Pressable, Animated } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

export default function PostWarResults({
  visible,
  onDismiss,
  warData,
}: PostWarResultsProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!warData) return null;

  const result = getResultConfig(warData.won, warData.draw);
  const trophyPositive = warData.trophyChange >= 0;
  const top3 = warData.topContributors.slice(0, 3);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <Animated.View
          className="bg-[#17172f] rounded-2xl p-6 mx-6 w-[320px] items-center"
          style={{
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          }}
        >
          {/* Result Icon */}
          <FontAwesome name={result.icon} size={48} color={result.color} />

          {/* Result Label */}
          <Text
            style={{ color: result.color, fontFamily: 'Epilogue-Bold' }}
            className="text-3xl font-bold mt-3"
          >
            {result.label}
          </Text>

          {/* Week */}
          <Text
            style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold' }}
            className="text-sm mt-1"
          >
            Week {warData.weekNumber}
          </Text>

          {/* Score */}
          <View className="flex-row items-center mt-4">
            <Text
              style={{ color: '#ce96ff', fontFamily: 'Lexend-SemiBold' }}
              className="text-3xl font-bold"
            >
              {warData.myScore}
            </Text>
            <Text
              style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
              className="text-2xl mx-3"
            >
              -
            </Text>
            <Text
              style={{ color: '#ff6e84', fontFamily: 'Lexend-SemiBold' }}
              className="text-3xl font-bold"
            >
              {warData.opponentScore}
            </Text>
          </View>

          {/* Trophy Change */}
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

          {/* Top Contributors */}
          {top3.length > 0 && (
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
          )}

          {/* Dismiss Button */}
          <Pressable
            className="w-full py-3 items-center rounded-xl mt-5 active:scale-[0.98]"
            style={{ backgroundColor: '#a434ff' }}
            onPress={onDismiss}
          >
            <Text
              style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
              className="font-bold text-base"
            >
              Return to Clan
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
