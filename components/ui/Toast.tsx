import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastMessage {
  readonly id: number;
  readonly message: string;
  readonly type: ToastType;
}

interface ToastContextValue {
  readonly show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

const TYPE_COLORS: Record<ToastType, string> = {
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.danger,
  info: Colors.info,
};

let nextId = 0;

const EASE_IN = Easing.out(Easing.cubic);
const EASE_OUT = Easing.in(Easing.cubic);

function ToastItem({ toast, onDone }: { readonly toast: ToastMessage; readonly onDone: () => void }) {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide-in from top + fade
    translateY.value = withTiming(0, { duration: 250, easing: EASE_IN });
    opacity.value = withTiming(1, { duration: 250, easing: EASE_IN });

    const dismissTimer = setTimeout(() => {
      // Slide-out to top + fade — call onDone when out-animation completes
      opacity.value = withTiming(0, { duration: 200, easing: EASE_OUT });
      translateY.value = withTiming(-60, { duration: 200, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, 2500);

    return () => clearTimeout(dismissTimer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
    marginBottom: 8,
  }));

  const color = TYPE_COLORS[toast.type];

  const accentShadow = Platform.OS === 'ios'
    ? { shadowColor: color, shadowRadius: 10, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 2 } }
    : { elevation: 6 };

  return (
    <Animated.View style={animatedStyle}>
      <View
        className="rounded-xl px-4 py-3 flex-row items-center"
        style={[
          { backgroundColor: 'rgba(41, 41, 72, 0.9)', borderLeftWidth: 3, borderLeftColor: color },
          accentShadow,
        ]}
      >
        <Text
          className="text-sm flex-1"
          style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
        >
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { readonly children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<readonly ToastMessage[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <View
        className="absolute left-4 right-4 z-50"
        style={{ top: insets.top + 8 }}
        pointerEvents="none"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={() => remove(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export default ToastProvider;
