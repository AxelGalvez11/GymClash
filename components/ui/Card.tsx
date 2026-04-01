import { Platform, View, type ViewProps } from 'react-native';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  readonly children: React.ReactNode;
  readonly padding?: CardPadding;
  readonly glow?: boolean;
  readonly className?: string;
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

const CHROMATIC_SHADOW = (glow: boolean) =>
  Platform.OS === 'ios'
    ? {
        shadowColor: '#ce96ff',
        shadowRadius: glow ? 16 : 12,
        shadowOpacity: glow ? 0.2 : 0.08,
        shadowOffset: { width: 0, height: 0 },
      }
    : { elevation: glow ? 6 : 3 };

export function Card({ children, padding = 'md', glow = false, className = '', ...rest }: CardProps) {
  return (
    <View
      className={`rounded-2xl ${PADDING_CLASSES[padding]} ${className}`}
      style={[{ backgroundColor: '#1d1d37' }, CHROMATIC_SHADOW(glow)]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
