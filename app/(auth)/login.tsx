import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import HeroAsciiOne from '@/components/ui/hero-ascii-one';
import { performAppleSignIn, isAppleSignInAvailable } from '@/lib/auth/apple-sign-in';
import { performGoogleSignIn, isGoogleSignInConfigured } from '@/lib/auth/google-sign-in';
import { signInWithProvider } from '@/lib/auth/sign-in-with-provider';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleNativeSignIn(provider: 'apple' | 'google') {
    // Friendly guard for unconfigured Google OAuth
    if (provider === 'google' && !isGoogleSignInConfigured()) {
      Alert.alert(
        'Google Sign-In not configured',
        'Google OAuth credentials have not been set up yet. Please use email or Apple Sign-In for now.'
      );
      return;
    }

    setLoading(true);
    try {
      if (provider === 'apple') {
        const { identityToken, nonce } = await performAppleSignIn();
        const { error } = await signInWithProvider('apple', identityToken, nonce);
        if (error) Alert.alert('Error', error);
      } else {
        const { idToken, nonce } = await performGoogleSignIn();
        const { error } = await signInWithProvider('google', idToken, nonce);
        if (error) Alert.alert('Error', error);
      }
      // Auth state change listener in _layout.tsx handles navigation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      // Don't show alert for user cancellation
      if (!message.includes('cancel')) {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
          })
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
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} BACK</Text>
        </Pressable>

        {isSignUp && <HeroAsciiOne />}

        <Text
          className="text-3xl mb-2"
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
        >
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text className="mb-8" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          {isSignUp
            ? 'Start your clash journey'
            : 'Continue your training'}
        </Text>

        {/* Form */}
        <View className="gap-4 mb-8">
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-4 text-base"
            style={{
              color: '#e5e3ff',
              fontFamily: 'BeVietnamPro-Regular',
            }}
            placeholder="Email"
            placeholderTextColor="#74738b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            className="bg-[#000000] rounded-xl px-4 py-4 text-base"
            style={{
              color: '#e5e3ff',
              fontFamily: 'BeVietnamPro-Regular',
            }}
            placeholder="Password"
            placeholderTextColor="#74738b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={isSignUp ? 'newPassword' : 'password'}
          />
        </View>

        {/* Submit */}
        <Pressable
          className="py-3.5 items-center rounded-[2rem] mb-4 active:scale-[0.98]"
          style={{
            backgroundColor: '#a434ff',
            shadowColor: '#a434ff',
            shadowOpacity: 0.4,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
          }}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text
            style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 14, letterSpacing: 2 }}
          >
            {loading
              ? 'LOADING...'
              : isSignUp
              ? 'SIGN UP'
              : 'LOG IN'}
          </Text>
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
            hitSlop={10}
            style={{
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
            disabled={loading || resetSent}
          >
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
              {resetSent ? 'Reset link sent' : 'Forgot password?'}
            </Text>
          </Pressable>
        )}

        {isSignUp && <View className="mb-2" />}

        {/* SSO Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(206,150,255,0.15)' }} />
          <Text
            className="mx-4"
            style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}
          >
            OR
          </Text>
          <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(206,150,255,0.15)' }} />
        </View>

        {/* SSO Buttons */}
        <View className="gap-3 mb-6">
          {/* Apple Sign In — iOS only (App Store requirement) */}
          {isAppleSignInAvailable() && (
            <Pressable
              className="flex-row items-center justify-center py-3.5 rounded-[2rem] active:scale-[0.98]"
              style={{
                backgroundColor: '#23233f',
                borderWidth: 0.5,
                borderColor: 'rgba(206,150,255,0.25)',
              }}
              onPress={() => handleNativeSignIn('apple')}
              disabled={loading}
            >
              <FontAwesome name="apple" size={18} color="#fff" style={{ marginRight: 10 }} />
              <Text
                style={{
                  color: '#e5e3ff',
                  fontFamily: 'Lexend-SemiBold',
                  fontSize: 13,
                  letterSpacing: 1,
                }}
              >
                CONTINUE WITH APPLE
              </Text>
            </Pressable>
          )}

          <Pressable
            className="flex-row items-center justify-center py-3.5 rounded-[2rem] active:scale-[0.98]"
            style={{
              backgroundColor: '#23233f',
              borderWidth: 0.5,
              borderColor: 'rgba(206,150,255,0.25)',
            }}
            onPress={() => handleNativeSignIn('google')}
            disabled={loading}
          >
            <FontAwesome name="google" size={18} color="#fff" style={{ marginRight: 10 }} />
            <Text
              style={{
                color: '#e5e3ff',
                fontFamily: 'Lexend-SemiBold',
                fontSize: 13,
                letterSpacing: 1,
              }}
            >
              CONTINUE WITH GOOGLE
            </Text>
          </Pressable>
        </View>

        {/* Toggle */}
        <Pressable
          onPress={() => setIsSignUp((prev) => !prev)}
          className="items-center"
        >
            <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
              {isSignUp
                ? 'Already have an account? '
                : "Don't have an account? "}
            <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}>
              {isSignUp ? 'Log In' : 'Sign Up'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
