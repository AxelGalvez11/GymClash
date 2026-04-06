import { useEffect, useRef, useState } from 'react';
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

    // Initial entrance: scale from big → settle
    scaleAnim.setValue(1.4);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setInterval(() => {
      step++;
      if (step < sequence.length) {
        const isGo = sequence[step] === 'GO!';

        // Shrink + fade out current
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: isGo ? 0.5 : 0.7,
            duration: 120,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setDisplay(sequence[step]);

          if (isGo) {
            // GO! bursts in: 0.5 → 1.2 → 1 spring
            scaleAnim.setValue(0.5);
            opacityAnim.setValue(1);
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              tension: 120,
              useNativeDriver: true,
            }).start();
          } else {
            // Numbers pulse large then settle
            scaleAnim.setValue(1.4);
            opacityAnim.setValue(0);
            Animated.parallel([
              Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 80,
                useNativeDriver: true,
              }),
            ]).start();
          }
        });
      } else {
        clearInterval(timer);
        // Small delay so GO! is visible before dismissing
        setTimeout(() => {
          onCompleteRef.current();
        }, 600);
      }
    }, 800);

    return () => clearInterval(timer);
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  const isGo = display === 'GO!';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#0c0c1f' }}>
        <Animated.Text
          style={{
            fontFamily: 'Epilogue-Bold',
            fontSize: isGo ? 72 : 100,
            color: isGo ? '#22c55e' : '#e5e3ff',
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            textShadowColor: isGo ? 'rgba(34,197,94,0.6)' : 'rgba(206,150,255,0.6)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: isGo ? 32 : 24,
          }}
        >
          {display}
        </Animated.Text>
      </View>
    </Modal>
  );
}
