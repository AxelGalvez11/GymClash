import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface SplashIntroProps {
  readonly onComplete: () => void;
}

export default function SplashIntro({ onComplete }: SplashIntroProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in over 600ms
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold for 600ms
      Animated.delay(600),
      // Fade out over 300ms
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, [onComplete, opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity }]}>
        <Text style={styles.title}>GYMCLASH</Text>
        <Text style={styles.decoration}>////</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Epilogue-Bold',
    color: '#e5e3ff',
    fontSize: 32,
    letterSpacing: 6,
  },
  decoration: {
    color: '#ce96ff',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 4,
  },
});
