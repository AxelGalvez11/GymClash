import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, Modal } from 'react-native';

interface WorkoutCountdownProps {
  readonly visible: boolean;
  readonly onComplete: () => void;
}

export function WorkoutCountdown({ visible, onComplete }: WorkoutCountdownProps) {
  const [display, setDisplay] = useState('3');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) return;

    const sequence = ['3', '2', '1', 'GO!'];
    let step = 0;

    setDisplay(sequence[0]);
    scaleAnim.setValue(1);
    opacityAnim.setValue(1);

    const timer = setInterval(() => {
      step++;
      if (step < sequence.length) {
        setDisplay(sequence[step]);
        // Quick pop animation
        scaleAnim.setValue(0.5);
        opacityAnim.setValue(1);
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }).start();
      } else {
        clearInterval(timer);
        onCompleteRef.current();
      }
    }, 800);

    return () => clearInterval(timer);
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const isGo = display === 'GO!';

  return (
    <Modal visible={visible} transparent animationType="none">
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(12,12,31,0.95)' }}>
        <Animated.Text
          style={{
            fontFamily: 'Epilogue-Bold',
            fontSize: isGo ? 72 : 100,
            color: isGo ? '#22c55e' : '#e5e3ff',
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            textShadowColor: isGo ? 'rgba(34,197,94,0.6)' : 'rgba(206,150,255,0.6)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 24,
          }}
        >
          {display}
        </Animated.Text>
      </View>
    </Modal>
  );
}
