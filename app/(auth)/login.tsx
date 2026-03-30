import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        Alert.alert('Error', error.message);
      }
      // Auth state change listener in _layout.tsx handles navigation
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-8 justify-center">
        {/* Header */}
        <Pressable onPress={() => router.back()} className="mb-8">
          <Text className="text-brand text-base">← Back</Text>
        </Pressable>

        <Text className="text-3xl font-bold text-white mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text className="text-text-secondary mb-8">
          {isSignUp
            ? 'Start your fitness RPG journey'
            : 'Continue your training'}
        </Text>

        {/* Form */}
        <View className="gap-4 mb-8">
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-base"
            placeholder="Email"
            placeholderTextColor="#6A6A8A"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-base"
            placeholder="Password"
            placeholderTextColor="#6A6A8A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
          />
        </View>

        {/* Submit */}
        <Pressable
          className="bg-brand rounded-xl py-4 items-center active:bg-brand-dark mb-6"
          onPress={handleAuth}
          disabled={loading}
        >
          <Text className="text-white text-lg font-bold">
            {loading
              ? 'Loading...'
              : isSignUp
              ? 'Sign Up'
              : 'Log In'}
          </Text>
        </Pressable>

        {/* Toggle */}
        <Pressable
          onPress={() => setIsSignUp((prev) => !prev)}
          className="items-center"
        >
          <Text className="text-text-secondary">
            {isSignUp
              ? 'Already have an account? '
              : "Don't have an account? "}
            <Text className="text-brand font-bold">
              {isSignUp ? 'Log In' : 'Sign Up'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
