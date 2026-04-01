import { Platform, View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface EmptyStateProps {
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly title: string;
  readonly subtitle?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

const PRIMARY_SHADOW = Platform.OS === 'ios'
  ? { shadowColor: '#ce96ff', shadowRadius: 20, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 } }
  : { elevation: 8 };

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center py-12 px-8">
      <FontAwesome name={icon} size={36} color="#74738b" />
      <Text
        className="text-lg font-bold mt-4 text-center"
        style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          className="text-sm mt-2 text-center"
          style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}
        >
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className="mt-4 px-5 py-2.5 rounded-[2rem] active:scale-[0.98]"
          // TODO: Replace solid bg with expo-linear-gradient when available
          style={[{ backgroundColor: '#a434ff' }, PRIMARY_SHADOW]}
          onPress={onAction}
        >
          <Text
            className="font-bold text-sm"
            style={{ color: '#FFFFFF', fontFamily: 'Epilogue-Bold', letterSpacing: 1.2 }}
          >
            {actionLabel.toUpperCase()}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default EmptyState;
