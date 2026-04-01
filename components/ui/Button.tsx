import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAccent } from '@/stores/accent-store';
import { Colors } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: React.ComponentProps<typeof FontAwesome>['name'];
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'py-2 px-3',
  md: 'py-3 px-4',
  lg: 'py-3.5 px-5',
};

const TEXT_SIZE: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const ICON_SIZE: Record<ButtonSize, number> = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const accent = useAccent();
  const isDisabled = disabled || loading;

  const containerStyle = (() => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? accent.dark : accent.DEFAULT,
          borderWidth: 0,
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? Colors.surface.border : '#ffffff',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDisabled ? Colors.surface.border : Colors.danger,
        };
    }
  })();

  const textColor = (() => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return isDisabled ? Colors.text.muted : '#FFFFFF';
      case 'ghost':
        return isDisabled ? Colors.text.muted : Colors.text.secondary;
      case 'danger':
        return isDisabled ? Colors.text.muted : Colors.danger;
    }
  })();

  const spinnerColor = variant === 'primary' ? '#FFFFFF' : accent.DEFAULT;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-xl active:opacity-70 ${SIZE_CLASSES[size]}`}
      style={[containerStyle, isDisabled && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon && <FontAwesome name={icon} size={ICON_SIZE[size]} color={textColor} />}
          <Text
            className={`font-bold ${TEXT_SIZE[size]}`}
            style={{ color: textColor, fontFamily: 'SpaceMono', letterSpacing: 1 }}
          >
            {label.toUpperCase()}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default Button;
