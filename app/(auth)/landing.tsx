import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo / Brand */}
        <View className="mb-4">
          <Text className="text-6xl font-bold text-brand">⚔️</Text>
        </View>
        <Text className="text-4xl font-bold text-white mb-2">GymClash</Text>
        <Text className="text-base text-text-secondary text-center mb-12">
          Train in real life. Level up in game.{'\n'}Help your clan win.
        </Text>

        {/* CTA Buttons */}
        <View className="w-full gap-4">
          <Pressable
            className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark"
            onPress={() => router.push('/(auth)/login')}
          >
            <Text className="text-white text-lg font-bold">Get Started</Text>
          </Pressable>

          <Pressable
            className="border-2 border-surface-border rounded-xl py-4 items-center active:bg-surface-raised"
            onPress={() => router.push('/(auth)/login')}
          >
            <Text className="text-white text-lg">I have an account</Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View className="items-center pb-4">
        <Text className="text-text-muted text-xs">
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </SafeAreaView>
  );
}
