import { View, Text, TextInput, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import type { StrengthSet } from '@/types';

interface SetRowProps {
  readonly set: StrengthSet;
  readonly index: number;
  readonly onRemove: (index: number) => void;
}

export function SetRow({ set, index, onRemove }: SetRowProps) {
  const tonnage = set.sets * set.reps * set.weight_kg;

  return (
    <View className="bg-[#1d1d37] rounded-xl p-3 flex-row items-center">
      <View className="flex-1">
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}>{set.exercise}</Text>
        <Text className="text-sm" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          {set.sets} × {set.reps} @ {set.weight_kg}kg — {tonnage}kg total
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        className="p-2 active:scale-[0.98]"
      >
        <FontAwesome name="trash-o" size={18} color={Colors.danger} />
      </Pressable>
    </View>
  );
}
