import { View, Text, Pressable, Modal } from 'react-native';

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(12,12,31,0.85)' }}>
        <View className="bg-[#1d1d37] rounded-2xl p-6 mx-8 w-full max-w-sm">
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
      </View>
    </Modal>
  );
}
