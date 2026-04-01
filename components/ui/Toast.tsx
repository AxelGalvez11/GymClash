import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
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

function ToastItem({ toast, onDone }: { readonly toast: ToastMessage; readonly onDone: () => void }) {
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const enteredRef = useRef(false);
  if (!enteredRef.current) {
    enteredRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -60, duration: 200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(onDone);
      }, 2500);
    });
  }

  const color = TYPE_COLORS[toast.type];

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginBottom: 8,
      }}
    >
      <View
        className="bg-surface-overlay rounded-xl px-4 py-3 flex-row items-center"
        style={{ borderLeftWidth: 3, borderLeftColor: color }}
      >
        <Text className="text-white text-sm flex-1">{toast.message}</Text>
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
