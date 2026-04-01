import { View, Text, Pressable } from 'react-native';

interface SectionHeaderProps {
  readonly title: string;
  readonly action?: {
    readonly label: string;
    readonly onPress: () => void;
  };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-2">
      <Text
        style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 1.5, color: '#aaa8c3', textTransform: 'uppercase' }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text
            style={{ fontFamily: 'Lexend-SemiBold', fontSize: 10, letterSpacing: 0.5, color: '#aaa8c3' }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;
