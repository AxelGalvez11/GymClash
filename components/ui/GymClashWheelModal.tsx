import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface GymClashWheelModalProps {
  readonly visible: boolean;
  readonly title: string;
  readonly subtitle?: string;
  readonly confirmLabel?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly cardStyle?: StyleProp<ViewStyle>;
  readonly bodyStyle?: StyleProp<ViewStyle>;
}

export function GymClashWheelModal({
  visible,
  title,
  subtitle,
  confirmLabel = 'Done',
  onClose,
  children,
  cardStyle,
  bodyStyle,
}: GymClashWheelModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.card, cardStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={[styles.body, bodyStyle]}>{children}</View>

          <Pressable onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 4, 15, 0.8)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(206,150,255,0.18)',
    backgroundColor: '#17172f',
    paddingTop: 24,
    paddingBottom: 26,
    paddingHorizontal: 20,
    shadowColor: '#ce96ff',
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#e5e3ff',
    fontFamily: 'Epilogue-Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    color: '#74738b',
    fontFamily: 'Lexend-SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  body: {
    alignSelf: 'stretch',
  },
  doneButton: {
    marginTop: 20,
    alignSelf: 'center',
    minWidth: 148,
    borderRadius: 22,
    backgroundColor: '#a434ff',
    paddingVertical: 13,
    paddingHorizontal: 36,
    shadowColor: '#a434ff',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  doneText: {
    color: '#ffffff',
    fontFamily: 'Epilogue-Bold',
    fontSize: 16,
    textAlign: 'center',
  },
});
