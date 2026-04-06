import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveWar } from '@/hooks/use-clan';
import { useEntrance } from '@/hooks/use-entrance';
import { usePressScale } from '@/hooks/use-press-scale';
import { useGlowPulse } from '@/hooks/use-glow-pulse';

type ChatTab = 'clan' | 'war';

function MessageBubble({ item, isOwn }: { readonly item: any; readonly isOwn: boolean }) {
  const { animatedStyle } = useEntrance(0, 'spring-up', 200);

  return (
    <Animated.View style={animatedStyle} className={`mb-2 ${isOwn ? 'items-end' : 'items-start'}`}>
      <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 2 }}>
        {item.display_name}
      </Text>
      <View
        className="rounded-xl px-3 py-2 max-w-[80%]"
        style={{
          backgroundColor: isOwn ? '#a434ff' : '#23233f',
          borderWidth: 1,
          borderColor: isOwn ? 'rgba(206,150,255,0.3)' : 'rgba(206,150,255,0.1)',
        }}
      >
        <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
          {item.content}
        </Text>
      </View>
      <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 9, marginTop: 1 }}>
        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </Animated.View>
  );
}

export default function ClanChatScreen() {
  const router = useRouter();
  const { clanId } = useLocalSearchParams<{ clanId: string }>();
  const { session } = useAuthStore();
  const { data: war } = useActiveWar();
  const [tab, setTab] = useState<ChatTab>('clan');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const { animatedStyle: headerStyle } = useEntrance(0, 'fade-slide');
  const { animatedStyle: tabsStyle } = useEntrance(60, 'spring-up');
  const { animatedStyle: emptyStyle } = useEntrance(120, 'fade-scale');
  const { animatedStyle: sendPressStyle, onPressIn: sendIn, onPressOut: sendOut } = usePressScale(0.92);
  const { glowStyle: sendGlow } = useGlowPulse('#a434ff', 0.2, 0.6, 2000, input.trim().length > 0);

  useEffect(() => {
    if (!clanId) return;
    setLoading(true);

    async function fetchMessages() {
      setMessages([]);
      setLoading(false);
    }

    fetchMessages();
  }, [clanId, tab]);

  function handleSend() {
    if (!input.trim()) return;
    const newMsg = {
      id: `local_${Date.now()}`,
      user_id: session?.user?.id,
      display_name: 'You',
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    Alert.alert('Coming Soon', 'Clan messaging backend is not yet connected. Messages shown locally only.');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
      {/* Header */}
      <Animated.View
        style={headerStyle}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <Pressable onPress={() => router.replace('/(app)/clan' as any)} hitSlop={10}>
          <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
        </Pressable>
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>Chat</Text>
        <View className="w-6" />
      </Animated.View>

      {/* Tab Switcher */}
      <Animated.View style={tabsStyle} className="flex-row px-4 pt-3 pb-2 gap-2">
        <Pressable
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: tab === 'clan' ? '#a434ff' : '#23233f' }}
          onPress={() => setTab('clan')}
        >
          <Text style={{ color: tab === 'clan' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
            Clan Chat
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 py-2 rounded-full items-center"
          style={{ backgroundColor: tab === 'war' ? '#a434ff' : '#23233f', opacity: war ? 1 : 0.5 }}
          onPress={() => {
            if (!war) {
              Alert.alert('No Active War', 'War Chat is only available during an active clan war.');
              return;
            }
            setTab('war');
          }}
          disabled={!war}
        >
          <Text style={{ color: tab === 'war' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
            War Chat {!war && '🔒'}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Animated.View style={useEntrance(0, 'fade-scale').animatedStyle}>
            <FontAwesome name="spinner" size={24} color="#ce96ff" />
          </Animated.View>
        </View>
      ) : messages.length === 0 ? (
        <Animated.View style={emptyStyle} className="flex-1 items-center justify-center px-8">
          <FontAwesome name={tab === 'clan' ? 'comments' : 'shield'} size={32} color="#74738b" />
          <Text style={{ color: '#74738b', fontFamily: 'Epilogue-Bold', fontSize: 16, marginTop: 12 }}>
            {tab === 'clan' ? 'No messages yet' : 'War Chat'}
          </Text>
          <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            {tab === 'clan' ? 'Be the first to send a message to your clan!' : 'Coordinate strategy with your clan during wars.'}
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerClassName="py-2"
          renderItem={({ item }) => (
            <MessageBubble item={item} isOwn={item.user_id === session?.user?.id} />
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input */}
      <View className="px-4 py-3 flex-row items-center gap-2" style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(206,150,255,0.15)', backgroundColor: '#0c0c1f' }}>
        <TextInput
          className="flex-1 bg-[#23233f] rounded-xl px-4 py-3"
          style={{
            color: '#e5e3ff',
            fontFamily: 'BeVietnamPro-Regular',
            borderWidth: 1,
            borderColor: input.length > 0 ? 'rgba(164,52,255,0.35)' : 'rgba(206,150,255,0.1)',
          }}
          placeholder={tab === 'clan' ? 'Message your clan...' : 'War chat message...'}
          placeholderTextColor="#74738b"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Animated.View style={[sendPressStyle, sendGlow]}>
          <Pressable
            className="w-10 h-10 rounded-full bg-[#a434ff] items-center justify-center"
            onPress={handleSend}
            onPressIn={sendIn}
            onPressOut={sendOut}
          >
            <FontAwesome name="send" size={14} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
