import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface GpsDropOverlayProps {
  visible: boolean;
  onWaitForSignal: () => void;
  onEndSession: () => void;
}

export function GpsDropOverlay({ visible, onWaitForSignal, onEndSession }: GpsDropOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!visible) {
      pulseAnim.setValue(0.3);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [visible, pulseAnim]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(12,12,31,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 40 }}>
        {/* Pulsing GPS Icon */}
        <Animated.View style={{ opacity: pulseAnim, marginBottom: 20 }}>
          <FontAwesome name="map-marker" size={48} color="#ef4444" />
        </Animated.View>

        {/* Title */}
        <Text
          style={{
            fontFamily: 'Epilogue-Bold',
            color: '#ef4444',
            fontSize: 24,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          GPS Signal Lost
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontFamily: 'BeVietnamPro-Regular',
            color: '#aaa8c3',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Session paused — waiting for GPS
        </Text>

        {/* Buttons */}
        <View style={{ width: '100%', maxWidth: 280, gap: 12 }}>
          {/* Wait for Signal — primary */}
          <Pressable
            onPress={onWaitForSignal}
            style={({ pressed }) => ({
              backgroundColor: '#a434ff',
              borderRadius: 32,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'Lexend-SemiBold',
                color: '#ffffff',
                fontSize: 16,
              }}
            >
              Wait for Signal
            </Text>
          </Pressable>

          {/* End Session Here — secondary */}
          <Pressable
            onPress={onEndSession}
            style={({ pressed }) => ({
              backgroundColor: '#23233f',
              borderRadius: 32,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 0.5,
              borderColor: 'rgba(206,150,255,0.25)',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'Lexend-SemiBold',
                color: '#e5e3ff',
                fontSize: 16,
              }}
            >
              End Session Here
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
