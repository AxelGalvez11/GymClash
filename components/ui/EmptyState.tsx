import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { useAccent } from '@/stores/accent-store';

interface EmptyStateProps {
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly title: string;
  readonly subtitle?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const accent = useAccent();

  return (
    <View className="items-center py-12 px-8">
      <FontAwesome name={icon} size={36} color={Colors.text.muted} />
      <Text className="text-white text-lg font-bold mt-4 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-text-muted text-sm mt-2 text-center">{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className="mt-4 px-5 py-2.5 rounded-xl active:opacity-70"
          style={{ backgroundColor: accent.DEFAULT }}
          onPress={onAction}
        >
          <Text className="text-white font-bold text-sm">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default EmptyState;
