import { Platform, Pressable, Text, ActivityIndicator, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

const PRIMARY_SHADOW = Platform.OS === 'ios'
  ? { shadowColor: '#ce96ff', shadowRadius: 20, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 } }
  : { elevation: 8 };

export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = (() => {
    switch (variant) {
      case 'primary':
        return {
          // TODO: Replace solid bg with expo-linear-gradient when available
          backgroundColor: isDisabled ? '#7a28bf' : '#a434ff',
          borderWidth: 0,
          borderColor: 'transparent',
          ...(isDisabled ? {} : PRIMARY_SHADOW),
        };
      case 'secondary':
        return {
          backgroundColor: '#23233f',
          borderWidth: 1,
          borderColor: isDisabled ? 'transparent' : 'rgba(70, 70, 92, 0.2)',
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
          borderColor: isDisabled ? 'transparent' : 'rgba(255, 110, 132, 0.2)',
        };
    }
  })();

  const textColor = (() => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return isDisabled ? '#aaa8c3' : '#e5e3ff';
      case 'ghost':
        return isDisabled ? '#aaa8c3' : '#aaa8c3';
      case 'danger':
        return isDisabled ? '#aaa8c3' : '#ff6e84';
    }
  })();

  const fontFamily = variant === 'ghost' ? 'BeVietnamPro-Medium' : 'Epilogue-Bold';
  const spinnerColor = '#ce96ff';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-[2rem] active:scale-[0.98] ${SIZE_CLASSES[size]}`}
      style={[containerStyle, isDisabled && { opacity: 0.6 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon && <FontAwesome name={icon} size={ICON_SIZE[size]} color={textColor} />}
          <Text
            className={`font-bold ${TEXT_SIZE[size]}`}
            style={{ color: textColor, fontFamily, letterSpacing: 1.2 }}
          >
            {label.toUpperCase()}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default Button;
