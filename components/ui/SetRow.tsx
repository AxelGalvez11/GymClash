import { View, Text, TextInput, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { StrengthSet } from '@/types';

interface SetRowProps {
  readonly set: StrengthSet;
  readonly index: number;
  readonly onRemove: (index: number) => void;
}

export function SetRow({ set, index, onRemove }: SetRowProps) {
  const tonnage = set.sets * set.reps * set.weight_kg;

  return (
    <View className="bg-surface-raised border border-surface-border rounded-xl p-3 flex-row items-center">
      <View className="flex-1">
        <Text className="text-white font-bold">{set.exercise}</Text>
        <Text className="text-text-secondary text-sm">
          {set.sets} × {set.reps} @ {set.weight_kg}kg — {tonnage}kg total
        </Text>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        className="p-2 active:opacity-50"
      >
        <FontAwesome name="trash-o" size={18} color="#FF3D71" />
      </Pressable>
    </View>
  );
}
