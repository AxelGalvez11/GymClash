import { View, Text, TextInput } from 'react-native';
import { Colors } from '@/constants/theme';

interface NumberInputProps {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
  readonly decimal?: boolean;
}

export function NumberInput({
  label,
  value,
  onChangeText,
  placeholder = '0',
  decimal = false,
}: NumberInputProps) {
  return (
    <View className="flex-1">
      <Text
        className="text-xs uppercase mb-1"
        style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}
      >
        {label}
      </Text>
      <TextInput
        className="bg-[#000000] rounded-lg px-3 py-2 text-center text-lg"
        style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold' }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#74738b"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
    </View>
  );
}
