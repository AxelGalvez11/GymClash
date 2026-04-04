import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Modal } from 'react-native';

interface WorkoutCountdownProps {
  readonly visible: boolean;
  readonly onComplete: () => void;
}

export function WorkoutCountdown({ visible, onComplete }: WorkoutCountdownProps) {
  const [count, setCount] = useState(3);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setCount(3);
      return;
    }

    let current = 3;
    setCount(3);

    function animateNumber() {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(opacityAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }).start();
      });
    }

    animateNumber();

    const interval = setInterval(() => {
      current--;
      if (current > 0) {
        setCount(current);
        animateNumber();
      } else if (current === 0) {
        setCount(0); // "GO!"
        animateNumber();
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, onComplete, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(12,12,31,0.95)' }}>
        <Animated.Text
          style={{
            fontFamily: 'Epilogue-Bold',
            fontSize: count === 0 ? 64 : 96,
            color: count === 0 ? '#22c55e' : '#e5e3ff',
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            textShadowColor: count === 0 ? 'rgba(34,197,94,0.5)' : 'rgba(206,150,255,0.5)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 20,
          }}
        >
          {count === 0 ? 'GO!' : count}
        </Animated.Text>
      </View>
    </Modal>
  );
}
