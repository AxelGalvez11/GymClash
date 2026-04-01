import { View, type ViewProps } from 'react-native';

type CardPadding = 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  readonly children: React.ReactNode;
  readonly padding?: CardPadding;
  readonly className?: string;
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

export function Card({ children, padding = 'md', className = '', ...rest }: CardProps) {
  return (
    <View
      className={`bg-surface-raised border border-surface-border rounded-xl ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
