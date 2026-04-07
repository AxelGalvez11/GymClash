import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface GymClashWheelTriggerProps {
  readonly label: string;
  readonly value: string;
  readonly onPress: () => void;
  readonly placeholder?: string;
  readonly hint?: string;
}

export function GymClashWheelTrigger({
  label,
  value,
  onPress,
  placeholder = 'Tap to choose',
  hint = 'tap to adjust',
}: GymClashWheelTriggerProps) {
  const hasValue = value.trim().length > 0;

  return (
    <Pressable onPress={onPress} style={styles.trigger}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !hasValue && styles.placeholder]}>
          {hasValue ? value : placeholder}
        </Text>
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>{hint}</Text>
        <FontAwesome name="chevron-down" size={12} color="#ce96ff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(206,150,255,0.2)',
    backgroundColor: '#17172f',
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#ce96ff',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: '#aaa8c3',
    fontFamily: 'Lexend-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  value: {
    color: '#e5e3ff',
    fontFamily: 'Epilogue-Bold',
    fontSize: 19,
  },
  placeholder: {
    color: '#74738b',
    fontFamily: 'Lexend-SemiBold',
  },
  hintRow: {
    alignItems: 'center',
    gap: 6,
  },
  hint: {
    color: '#74738b',
    fontFamily: 'Lexend-SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});
