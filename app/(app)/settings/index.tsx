import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Animated, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';

import { Colors } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useProfile } from '@/hooks/use-profile';
import { updateProfile } from '@/services/api';
import { useAccent, useAccentStore, ACCENT_OPTIONS, type AccentKey } from '@/stores/accent-store';
import { useAuthStore } from '@/stores/auth-store';

// --- Animated Settings Row ---

function SettingsRow({
  icon,
  label,
  detail,
  onPress,
  color,
  delay = 0,
}: {
  readonly icon: React.ComponentProps<typeof FontAwesome>['name'];
  readonly label: string;
  readonly detail?: string;
  readonly onPress: () => void;
  readonly color?: string;
  readonly delay?: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateX, delay]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <Pressable
        className="bg-[#1d1d37] rounded-xl p-4 flex-row items-center active:scale-[0.98]"
        onPress={onPress}
      >
        <FontAwesome name={icon} size={16} color={color ?? '#aaa8c3'} />
        <Text className="ml-3 flex-1 text-sm" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}>{label}</Text>
        {detail && (
          <Text className="text-xs mr-2" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>{detail}</Text>
        )}
        <FontAwesome name="chevron-right" size={12} color="#74738b" />
      </Pressable>
    </Animated.View>
  );
}

// --- Section Label ---

function SectionLabel({ text }: { readonly text: string }) {
  return (
    <Text
      className="text-xs uppercase mb-2 ml-1"
      style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 2 }}
    >
      {text}
    </Text>
  );
}

// --- Accent Color Picker ---

const ACCENT_LABELS: Record<AccentKey, string> = {
  purple: 'Purple',
  blue: 'Blue',
  red: 'Red',
  green: 'Green',
  gold: 'Gold',
};

function AccentColorPicker() {
  const accent = useAccent();
  const accentKey = useAccentStore((s) => s.accentKey);
  const setAccent = useAccentStore((s) => s.setAccent);

  return (
    <View className="bg-[#1d1d37] rounded-xl p-4">
      <Text className="text-sm mb-3" style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Bold', fontWeight: '700' }}>Accent Color</Text>
      <Text className="text-xs mb-4" style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}>
        Choose your preferred accent color for the app
      </Text>
      <View className="flex-row gap-3 justify-center">
        {(Object.entries(ACCENT_OPTIONS) as [AccentKey, typeof ACCENT_OPTIONS[AccentKey]][]).map(
          ([key, palette]) => {
            const isSelected = key === accentKey;
            return (
              <Pressable
                key={key}
                className="items-center gap-1.5 active:scale-[0.98]"
                onPress={() => setAccent(key)}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: palette.DEFAULT,
                    borderWidth: isSelected ? 2.5 : 0,
                    borderColor: '#e5e3ff',
                    shadowColor: isSelected ? palette.DEFAULT : 'transparent',
                    shadowOpacity: isSelected ? 0.5 : 0,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: isSelected ? 8 : 0,
                  }}
                >
                  {isSelected && (
                    <FontAwesome name="check" size={14} color="#e5e3ff" />
                  )}
                </View>
                <Text
                  className="text-xs"
                  style={{
                    color: isSelected ? palette.DEFAULT : '#74738b',
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 8,
                    letterSpacing: 1,
                  }}
                >
                  {ACCENT_LABELS[key].toUpperCase()}
                </Text>
              </Pressable>
            );
          }
        )}
      </View>
    </View>
  );
}

// --- Main Settings Screen ---

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { session } = useAuthStore();
  const accent = useAccent();
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const biodataStatus = profile?.body_weight_kg ? 'Complete' : 'Incomplete';

  function openNameEditor() {
    setNameDraft(profile?.display_name ?? '');
    setShowNameEditor(true);
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length === 0) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    if (trimmed.length > 20) {
      Alert.alert('Error', 'Name must be 20 characters or less.');
      return;
    }
    if (trimmed === profile?.display_name) {
      setShowNameEditor(false);
      return;
    }

    setSavingName(true);
    try {
      await updateProfile({ display_name: trimmed });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setShowNameEditor(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update name.');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) Alert.alert('Error', error.message);
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]">
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* Header */}
        <View className="flex-row items-center px-5 pt-3 pb-5">
          <Pressable onPress={() => router.replace('/(app)/home' as any)} className="mr-4 active:scale-[0.98]">
            <FontAwesome name="arrow-left" size={18} color="#aaa8c3" />
          </Pressable>
          <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18, letterSpacing: 1 }}>
            Settings
          </Text>
        </View>

        <View className="px-5">
          {/* Profile Summary Card */}
          {profile && (
            <View
              style={{
                backgroundColor: '#17172f',
                borderRadius: 20,
                padding: 16,
                marginHorizontal: -20,
                marginBottom: 16,
                marginTop: 0,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                shadowColor: '#ce96ff',
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 16,
                shadowOpacity: 0.18,
                elevation: 8,
                borderWidth: 1,
                borderColor: 'rgba(206,150,255,0.12)',
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#23233f', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ce96ff' }}>
                <FontAwesome name="user" size={22} color="#ce96ff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>{profile.display_name ?? 'Warrior'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <FontAwesome name="star" size={10} color="#ce96ff" />
                  <Text style={{ color: '#aaa8c3', fontFamily: 'Lexend-SemiBold', fontSize: 12 }}>Level {profile.level ?? 1}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#ffd709', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>{profile.trophy_rating ?? 0}</Text>
                <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1 }}>TROPHIES</Text>
              </View>
            </View>
          )}

          {/* Account Section */}
          <SectionLabel text="Account" />
          <View className="gap-2 mb-6" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <SettingsRow
              icon="user"
              label={profile?.display_name || 'Warrior'}
              detail={session?.user?.email?.split('@')[0] ?? ''}
              onPress={() => setShowAccountInfo(true)}
              delay={0}
            />
          </View>

          {/* Appearance Section */}
          <SectionLabel text="Appearance" />
          <View className="gap-2 mb-6" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <AccentColorPicker />
          </View>

          {/* Body Data Section */}
          <SectionLabel text="Body Data" />
          <View className="gap-2 mb-6" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <SettingsRow
              icon="sliders"
              label="Body Data"
              detail={biodataStatus}
              onPress={() => router.push('/(app)/settings/biodata')}
              color={biodataStatus === 'Incomplete' ? accent.DEFAULT : '#aaa8c3'}
              delay={100}
            />
          </View>

          {/* Notifications Section */}
          <SectionLabel text="Notifications" />
          <View className="gap-2 mb-6" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <SettingsRow
              icon="bell"
              label="Notifications"
              detail="Manage"
              onPress={() => Alert.alert('Coming Soon', 'Notification preferences will be available in a future update.')}
              delay={150}
            />
          </View>

          {/* About Section */}
          <SectionLabel text="About" />
          <View className="gap-2 mb-8" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 8, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <SettingsRow
              icon="info-circle"
              label="Version"
              detail="1.0.0"
              onPress={() => {}}
              delay={150}
            />
          </View>

          {/* Sign Out */}
          <Pressable
            className="rounded-xl py-3 items-center active:scale-[0.98]"
            style={{ borderWidth: 0.5, borderColor: Colors.danger + '40', shadowColor: '#ef4444', shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 }}
            onPress={handleSignOut}
          >
            <Text className="text-danger text-sm" style={{ fontFamily: 'Lexend-SemiBold', fontWeight: '700', letterSpacing: 1 }}>
              SIGN OUT
            </Text>
          </Pressable>

          {/* Privacy Section */}
          <View className="gap-3 mt-6 mb-6" style={{ backgroundColor: '#17172f', borderRadius: 16, marginHorizontal: -20, paddingHorizontal: 20, paddingVertical: 12, overflow: 'hidden', shadowColor: '#ce96ff', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 }}>
            <Text className="text-xs uppercase px-1" style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', letterSpacing: 1 }}>
              Privacy
            </Text>
            <SettingsRow
              icon="shield"
              label="Privacy Policy"
              onPress={() => Alert.alert('Privacy Policy', 'Our full privacy policy is available at gymclash.app/privacy')}
              delay={350}
            />
            <SettingsRow
              icon="ban"
              label="Do Not Sell My Data"
              detail="CCPA"
              onPress={() => Alert.alert('Data Not Sold', 'GymClash does not sell your personal data to third parties. This complies with CCPA requirements.')}
              color="#eab308"
              delay={400}
            />
            <SettingsRow
              icon="trash"
              label="Delete My Data"
              onPress={() => Alert.alert(
                'Delete All Data?',
                'This will permanently delete your account, workout history, clan membership, and all associated data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete Everything', style: 'destructive', onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in a future update. Contact support@gymclash.app for immediate data deletion requests.') },
                ]
              )}
              color="#ef4444"
              delay={450}
            />
          </View>

          {/* Version Footer */}
          <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, textAlign: 'center', marginTop: 8, marginBottom: 24, letterSpacing: 1 }}>
            GYMCLASH v1.0 · VICTORY PEAK
          </Text>
        </View>
      </ScrollView>

      {/* Styled Account Info Modal */}
      <Modal visible={showAccountInfo} animationType="fade" transparent>
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(12,12,31,0.85)' }}
          onPress={() => setShowAccountInfo(false)}
        >
          <View
            className="bg-[#1d1d37] rounded-2xl p-6 mx-8 w-[85%]"
            style={{
              shadowColor: '#ce96ff',
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 16,
              shadowOpacity: 0.15,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 18 }}>Account</Text>
              <Pressable onPress={() => setShowAccountInfo(false)}>
                <FontAwesome name="times" size={18} color="#74738b" />
              </Pressable>
            </View>
            <View className="gap-4">
              <View className="flex-row items-center gap-3">
                <FontAwesome name="user" size={14} color="#aaa8c3" />
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: '#74738b', textTransform: 'uppercase' }}>Name</Text>
                  <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: '#e5e3ff' }}>{profile?.display_name || 'Not set'}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowAccountInfo(false);
                    openNameEditor();
                  }}
                  hitSlop={10}
                  style={{
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 22,
                  }}
                >
                  <FontAwesome name="pencil" size={14} color="#ce96ff" />
                </Pressable>
              </View>
              <View className="flex-row items-center gap-3">
                <FontAwesome name="envelope" size={14} color="#aaa8c3" />
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: '#74738b', textTransform: 'uppercase' }}>Email</Text>
                  <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: '#e5e3ff' }}>{session?.user?.email ?? 'Not available'}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <FontAwesome name="star" size={14} color="#aaa8c3" />
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: '#74738b', textTransform: 'uppercase' }}>Level</Text>
                  <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: '#e5e3ff' }}>{profile?.level ?? 1}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <FontAwesome name="shield" size={14} color="#aaa8c3" />
                <View className="flex-1">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 9, letterSpacing: 1, color: '#74738b', textTransform: 'uppercase' }}>Rank</Text>
                  <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 14, color: '#e5e3ff' }}>{(profile?.rank ?? 'rookie').replace(/_/g, ' ')}</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Edit Display Name Modal ─────────────────────────────── */}
      <Modal visible={showNameEditor} animationType="fade" transparent>
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(12,12,31,0.85)' }}
          onPress={() => !savingName && setShowNameEditor(false)}
        >
          <Pressable
            className="bg-[#1d1d37] rounded-2xl p-6 mx-8 w-[85%]"
            onPress={(e) => e.stopPropagation()}
            style={{
              shadowColor: '#ce96ff',
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 16,
              shadowOpacity: 0.18,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center justify-between mb-5">
              <Text style={{ fontFamily: 'Epilogue-Bold', color: '#e5e3ff', fontSize: 18 }}>
                Change Name
              </Text>
              <Pressable
                onPress={() => !savingName && setShowNameEditor(false)}
                hitSlop={10}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <FontAwesome name="times" size={18} color="#74738b" />
              </Pressable>
            </View>

            <Text
              style={{
                fontFamily: 'Lexend-SemiBold',
                fontSize: 9,
                letterSpacing: 1.5,
                color: '#74738b',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Warrior Name
            </Text>

            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your warrior name"
              placeholderTextColor="#74738b"
              maxLength={20}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              editable={!savingName}
              style={{
                backgroundColor: '#000000',
                color: '#e5e3ff',
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 16,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                minHeight: 48,
                borderWidth: 1,
                borderColor: 'rgba(206,150,255,0.25)',
              }}
            />

            <Text
              style={{
                fontFamily: 'BeVietnamPro-Regular',
                fontSize: 11,
                color: '#74738b',
                marginTop: 6,
                textAlign: 'right',
              }}
            >
              {nameDraft.length}/20
            </Text>

            <View className="flex-row gap-3 mt-6">
              <Pressable
                onPress={() => !savingName && setShowNameEditor(false)}
                disabled={savingName}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 24,
                  backgroundColor: '#23233f',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: 'rgba(70,70,92,0.3)',
                  opacity: savingName ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: '#aaa8c3',
                    fontFamily: 'Lexend-SemiBold',
                    fontSize: 13,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSaveName}
                disabled={savingName || nameDraft.trim().length === 0}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 24,
                  backgroundColor: '#a434ff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  shadowColor: '#a434ff',
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 8,
                  opacity: savingName || nameDraft.trim().length === 0 ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    color: '#ffffff',
                    fontFamily: 'Epilogue-Bold',
                    fontSize: 13,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {savingName ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
