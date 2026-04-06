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
    <View
      style={{
        backgroundColor: '#17172f',
        borderRadius: 12,
        padding: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(206,150,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 3,
          height: '100%',
          borderRadius: 2,
          backgroundColor: '#ce96ff',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      />
      <View className="flex-1" style={{ marginLeft: 12 }}>
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
