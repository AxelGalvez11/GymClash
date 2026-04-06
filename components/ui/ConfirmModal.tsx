import { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

interface ConfirmModalProps {
  readonly visible: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmText?: string;
  readonly cancelText?: string;
  readonly confirmColor?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly destructive?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  const btnColor = confirmColor ?? (destructive ? '#ef4444' : '#a434ff');

  // Backdrop
  const backdropOpacity = useSharedValue(0);
  // Content spring-up
  const contentTranslateY = useSharedValue(40);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Backdrop fades in 200ms
      backdropOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      // Content opacity fades in alongside
      contentOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      // Content springs up from translateY: 40
      contentTranslateY.value = withSpring(0, { damping: 16, stiffness: 180, mass: 0.8 });
    } else {
      // Reset for next open
      backdropOpacity.value = 0;
      contentOpacity.value = 0;
      contentTranslateY.value = 40;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none">
      {/* Animated backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(12,12,31,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
          },
          backdropStyle,
        ]}
      >
        {/* Animated content card */}
        <Animated.View
          style={[
            {
              marginHorizontal: 32,
              width: '100%',
              maxWidth: 384,
            },
            contentStyle,
          ]}
        >
          <View className="bg-[#1d1d37] rounded-2xl p-6">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, marginBottom: 8 }}>{title}</Text>
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 14, marginBottom: 20 }}>{message}</Text>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl items-center active:scale-[0.98]"
                style={{ backgroundColor: '#23233f' }}
                onPress={onCancel}
              >
                <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>{cancelText}</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3 rounded-xl items-center active:scale-[0.98]"
                style={{ backgroundColor: btnColor }}
                onPress={onConfirm}
              >
                <Text style={{ color: '#fff', fontFamily: 'Lexend-SemiBold', fontSize: 14 }}>{confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
