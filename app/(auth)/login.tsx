import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleOAuthSignIn(provider: 'apple' | 'google') {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'gymclash://auth/callback',
        },
      });
      if (error) Alert.alert('Error', error.message);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    if (isSignUp && !username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: username.trim() },
            },
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
      <View className="flex-1 px-8 justify-center">
        {/* Header */}
        <Pressable onPress={() => router.back()} className="mb-8 active:scale-[0.98]">
          <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 16 }}>{'<'} BACK</Text>
        </Pressable>

        <Text
          className="text-3xl mb-2"
          style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold' }}
        >
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text className="mb-8" style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular' }}>
          {isSignUp
            ? 'Start your fitness RPG journey'
            : 'Continue your training'}
        </Text>

        {/* Form */}
        <View className="gap-4 mb-8">
          {isSignUp && (
            <TextInput
              className="bg-[#000000] rounded-xl px-4 py-4 text-base"
              style={{
                color: '#e5e3ff',
                fontFamily: 'BeVietnamPro-Regular',
              }}
              placeholder="Username"
              placeholderTextColor="#74738b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              textContentType="username"
            />
          )}
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
            className="items-center mb-6"
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
          <Pressable
            className="flex-row items-center justify-center py-3.5 rounded-[2rem] active:scale-[0.98]"
            style={{
              backgroundColor: '#23233f',
              borderWidth: 0.5,
              borderColor: 'rgba(206,150,255,0.25)',
            }}
            onPress={() => handleOAuthSignIn('apple')}
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

          <Pressable
            className="flex-row items-center justify-center py-3.5 rounded-[2rem] active:scale-[0.98]"
            style={{
              backgroundColor: '#23233f',
              borderWidth: 0.5,
              borderColor: 'rgba(206,150,255,0.25)',
            }}
            onPress={() => handleOAuthSignIn('google')}
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
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
