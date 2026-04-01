import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';

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
        className="text-text-secondary uppercase"
        style={{ fontFamily: 'SpaceMono', fontSize: 11, letterSpacing: 1 }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text
            className="text-text-muted"
            style={{ fontFamily: 'SpaceMono', fontSize: 11, letterSpacing: 0.5 }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default SectionHeader;
