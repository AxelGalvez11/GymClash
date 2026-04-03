import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveWar } from '@/hooks/use-clan';

type ChatTab = 'clan' | 'war';

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

  // Fetch messages based on tab
  useEffect(() => {
    if (!clanId) return;
    setLoading(true);

    async function fetchMessages() {
      // For clan chat, fetch from clan_messages table (or war_messages filtered by clan)
      // For now, show placeholder since the table may not exist
      setMessages([]);
      setLoading(false);
    }

    fetchMessages();
  }, [clanId, tab]);

  function handleSend() {
    if (!input.trim()) return;
    // Placeholder — show the message locally
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3" style={{ borderBottomWidth: 0.5, borderBottomColor: 'rgba(206,150,255,0.15)' }}>
        <Pressable onPress={() => router.replace('/(app)/clan' as any)} hitSlop={10}>
          <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
        </Pressable>
        <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16 }}>Chat</Text>
        <View className="w-6" />
      </View>

      {/* Tab Switcher */}
      <View className="flex-row px-4 pt-3 pb-2 gap-2">
        <Pressable
          className={`flex-1 py-2 rounded-full items-center active:scale-[0.98]`}
          style={{ backgroundColor: tab === 'clan' ? '#a434ff' : '#23233f' }}
          onPress={() => setTab('clan')}
        >
          <Text style={{ color: tab === 'clan' ? '#fff' : '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 13 }}>
            Clan Chat
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2 rounded-full items-center active:scale-[0.98]`}
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
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color="#ce96ff" className="mt-8" />
      ) : messages.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <FontAwesome name={tab === 'clan' ? 'comments' : 'shield'} size={32} color="#74738b" />
          <Text style={{ color: '#74738b', fontFamily: 'Epilogue-Bold', fontSize: 16, marginTop: 12 }}>
            {tab === 'clan' ? 'No messages yet' : 'War Chat'}
          </Text>
          <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            {tab === 'clan' ? 'Be the first to send a message to your clan!' : 'Coordinate strategy with your clan during wars.'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerClassName="py-2"
          renderItem={({ item }) => (
            <View className={`mb-2 ${item.user_id === session?.user?.id ? 'items-end' : 'items-start'}`}>
              <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 2 }}>
                {item.display_name}
              </Text>
              <View
                className="rounded-xl px-3 py-2 max-w-[80%]"
                style={{ backgroundColor: item.user_id === session?.user?.id ? '#a434ff' : '#23233f' }}
              >
                <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
                  {item.content}
                </Text>
              </View>
              <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 9, marginTop: 1 }}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input */}
      <View className="px-4 py-3 flex-row items-center gap-2" style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(206,150,255,0.15)' }}>
        <TextInput
          className="flex-1 bg-[#23233f] rounded-xl px-4 py-3"
          style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular' }}
          placeholder={tab === 'clan' ? 'Message your clan...' : 'War chat message...'}
          placeholderTextColor="#74738b"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          className="w-10 h-10 rounded-full bg-[#a434ff] items-center justify-center active:scale-[0.95]"
          onPress={handleSend}
        >
          <FontAwesome name="send" size={14} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
