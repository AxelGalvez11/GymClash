import { View, Text, TextInput } from 'react-native';

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
      <Text className="text-text-secondary text-xs uppercase mb-1">
        {label}
      </Text>
      <TextInput
        className="bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-white text-center text-lg font-bold"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6A6A8A"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
    </View>
  );
}
