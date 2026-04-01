import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface ScreenHeaderProps {
  readonly title: string;
  readonly onBack?: () => void;
  readonly rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightElement }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      {onBack ? (
        <Pressable
          onPress={onBack}
          className="w-11 h-11 items-center justify-center rounded-full active:scale-[0.98]"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
        </Pressable>
      ) : (
        <View className="w-11" />
      )}
      <Text
        className="text-lg font-bold flex-1 text-center"
        style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', letterSpacing: -0.3 }}
      >
        {title}
      </Text>
      {rightElement ? (
        <View className="w-11 items-center justify-center">{rightElement}</View>
      ) : (
        <View className="w-11" />
      )}
    </View>
  );
}

export default ScreenHeader;
