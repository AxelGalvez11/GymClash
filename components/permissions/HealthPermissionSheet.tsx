import { View, Text, Pressable, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';

interface HealthPermissionSheetProps {
  readonly onAllow: () => void;
  readonly onDeny: () => void;
}

/**
 * Explains why health data access is needed before requesting permission.
 * Shown when user first tries to connect a health device during workout.
 */
export function HealthPermissionSheet({
  onAllow,
  onDeny,
}: HealthPermissionSheetProps) {
  const healthSource = Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect';

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
            style={{ backgroundColor: 'rgba(206,150,255,0.15)' }}
          >
            <FontAwesome name="heartbeat" size={28} color={Colors.primary.DEFAULT} />
          </View>
        </View>

        {/* Title */}
        <Text
          className="text-xl text-center mb-3"
          style={{ color: Colors.text.primary, fontFamily: 'Epilogue-Bold' }}
        >
          Connect {healthSource}
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
          GymClash reads heart rate and activity data from {healthSource} to
          display live stats during your workout and verify your performance.
        </Text>

        {/* Benefits */}
        <View className="gap-3 mb-8">
          {[
            { icon: 'heartbeat' as const, text: 'Live heart rate during workouts' },
            { icon: 'fire' as const, text: 'Track calories burned' },
            { icon: 'shield' as const, text: 'Health data strengthens anti-cheat verification' },
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
            CONNECT {healthSource.toUpperCase()}
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
