import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
    <SafeAreaView className="flex-1 bg-black">
      <View className="flex-1 px-8 justify-center">
        {/* Header */}
        <Pressable onPress={() => router.back()} className="mb-8 active:opacity-60">
          <Text className="text-white/60 text-base" style={{ fontFamily: 'SpaceMono' }}>← BACK</Text>
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
            placeholderTextColor={Colors.text.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            className="bg-surface-raised border border-surface-border rounded-xl px-4 py-4 text-white text-base"
            placeholder="Password"
            placeholderTextColor={Colors.text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
          />
        </View>

        {/* Submit */}
        <Pressable
          className="py-3.5 items-center active:bg-white mb-4"
          style={{ borderWidth: 1, borderColor: '#ffffff' }}
          onPress={handleAuth}
          disabled={loading}
        >
          {({ pressed }) => (
            <Text
              className={`text-sm font-bold ${pressed ? 'text-black' : 'text-white'}`}
              style={{ fontFamily: 'SpaceMono', letterSpacing: 2 }}
            >
              {loading
                ? 'LOADING...'
                : isSignUp
                ? 'SIGN UP'
                : 'LOG IN'}
            </Text>
          )}
        </Pressable>

        {/* Forgot Password */}
        {!isSignUp && (
          <Pressable
            onPress={async () => {
              if (!email) {
                Alert.alert('Error', 'Enter your email first, then tap Forgot Password.');
                return;
              }
              setLoading(true);
              try {
                const { error } = await supabase.auth.resetPasswordForEmail(email);
                if (error) {
                  Alert.alert('Error', error.message);
                } else {
                  setResetSent(true);
                  Alert.alert('Check your email', 'A password reset link has been sent.');
                }
              } catch {
                Alert.alert('Error', 'Something went wrong. Please try again.');
              } finally {
                setLoading(false);
              }
            }}
            className="items-center mb-6"
            disabled={loading || resetSent}
          >
            <Text className="text-text-secondary text-sm">
              {resetSent ? 'Reset link sent ✓' : 'Forgot password?'}
            </Text>
          </Pressable>
        )}

        {isSignUp && <View className="mb-2" />}

        {/* Toggle */}
        <Pressable
          onPress={() => setIsSignUp((prev) => !prev)}
          className="items-center"
        >
          <Text className="text-text-secondary">
            {isSignUp
              ? 'Already have an account? '
              : "Don't have an account? "}
            <Text className="text-white font-bold">
              {isSignUp ? 'Log In' : 'Sign Up'}
            </Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
