import { View, Text, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';

interface LocationPermissionSheetProps {
  readonly onAllow: () => void;
  readonly onDeny: () => void;
}

/**
 * Explains why location is needed before requesting permission.
 * Shown before first scout workout.
 */
export function LocationPermissionSheet({
  onAllow,
  onDeny,
}: LocationPermissionSheetProps) {
  return (
    <View
      className="flex-1 justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <View
        className="rounded-t-3xl px-6 pt-8 pb-10"
        style={{ backgroundColor: Colors.surface.container }}
      >
        {/* Icon */}
        <View className="items-center mb-6">
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(129,236,255,0.15)' }}
          >
            <FontAwesome name="map-marker" size={28} color={Colors.tertiary.DEFAULT} />
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-xl text-center mb-3"
          style={{ color: Colors.text.primary, fontFamily: 'Epilogue-Bold' }}
        >
          Location Access Needed
        </Text>

        {/* Explanation */}
        <Text
          className="text-center mb-6 leading-6"
          style={{
            color: Colors.text.secondary,
            fontFamily: 'BeVietnamPro-Regular',
            fontSize: 14,
          }}
        >
          GymClash uses your location during scout workouts to track distance,
          pace, and route. Your location data is only collected while you're
          actively tracking a workout.
        </Text>

        {/* Benefits */}
        <View className="gap-3 mb-8">
          {[
            { icon: 'road' as const, text: 'Track real distance & pace' },
            { icon: 'trophy' as const, text: 'Earn accurate scout scores' },
            { icon: 'shield' as const, text: 'GPS data verifies workouts' },
          ].map((item) => (
            <View key={item.text} className="flex-row items-center gap-3">
              <FontAwesome
                name={item.icon}
                size={14}
                color={Colors.primary.dim}
              />
              <Text
                style={{
                  color: Colors.text.secondary,
                  fontFamily: 'BeVietnamPro-Regular',
                  fontSize: 13,
                }}
              >
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Allow button */}
        <Pressable
          className="py-3.5 items-center rounded-[2rem] mb-3 active:scale-[0.98]"
          style={{
            backgroundColor: Colors.primary.dim,
            shadowColor: Colors.primary.dim,
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          }}
          onPress={onAllow}
        >
          <Text
            style={{
              color: Colors.text.primary,
              fontFamily: 'Epilogue-Bold',
              fontSize: 14,
              letterSpacing: 2,
            }}
          >
            ALLOW LOCATION
          </Text>
        </Pressable>

        {/* Deny button */}
        <Pressable
          className="py-3 items-center rounded-[2rem] active:scale-[0.98]"
          onPress={onDeny}
        >
          <Text
            style={{
              color: Colors.text.muted,
              fontFamily: 'BeVietnamPro-Regular',
              fontSize: 13,
            }}
          >
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
