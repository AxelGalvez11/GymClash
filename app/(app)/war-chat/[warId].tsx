import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Colors, WAR_CHAT_REACTIONS } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useMyClan } from '@/hooks/use-clan';
import type { WarChatReaction } from '@/types';

// ─── Reaction Helpers ───────────────────────────────────

const REACTION_PATTERN = /^\[REACTION:(\w+)\]$/;
const REACTION_KEYS = Object.keys(WAR_CHAT_REACTIONS) as readonly WarChatReaction[];

function parseReaction(content: string): { emoji: string; label: string } | null {
  const match = content.trim().match(REACTION_PATTERN);
  if (!match) return null;
  const key = match[1] as WarChatReaction;
  return WAR_CHAT_REACTIONS[key] ?? null;
}

// ─── Quick Reaction Bar ─────────────────────────────────

function QuickReactionBar({ onSelect }: { readonly onSelect: (key: WarChatReaction) => void }) {
  return (
    <View className="flex-row justify-evenly px-4 py-2 border-t border-surface-border">
      {REACTION_KEYS.map((key) => {
        const reaction = WAR_CHAT_REACTIONS[key];
        return (
          <Pressable
            key={key}
            className="w-10 h-10 rounded-full bg-surface-raised items-center justify-center active:opacity-70"
            onPress={() => onSelect(key)}
          >
            <Text style={{ fontSize: 20 }}>{reaction.emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────

export default function WarChatScreen() {
  const { warId } = useLocalSearchParams<{ warId: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const { data: myClan } = useMyClan();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data: messages, refetch } = useQuery({
    queryKey: ['war-chat', warId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('war_chat_messages')
        .select('id, user_id, clan_id, content, created_at')
        .eq('war_id', warId!)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!warId,
    refetchInterval: 5000,
  });

  // Supabase Realtime subscription for live updates
  useEffect(() => {
    if (!warId) return;

    const channel = supabase
      .channel(`war-chat-${warId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'war_chat_messages', filter: `war_id=eq.${warId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['war-chat', warId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [warId, queryClient]);

  const sendContent = useCallback(async (content: string) => {
    if (!content.trim() || !session?.user || !myClan || !warId) return;

    setSending(true);
    try {
      const { error } = await supabase.from('war_chat_messages').insert({
        war_id: warId,
        user_id: session.user.id,
        clan_id: myClan.id,
        content: content.trim(),
      });
      if (error) {
        if (error.message.includes('rate limit')) {
          Alert.alert('Slow down', 'You can send up to 30 messages per hour.');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        setMessage('');
        refetch();
      }
    } finally {
      setSending(false);
    }
  }, [session, myClan, warId, refetch]);

  const handleSend = useCallback(() => {
    sendContent(message);
  }, [message, sendContent]);

  const handleReaction = useCallback((key: WarChatReaction) => {
    sendContent(`[REACTION:${key}]`);
  }, [sendContent]);

  const myClanId = myClan?.id;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 border-b border-surface-border flex-row items-center">
        <Pressable onPress={() => router.back()}>
          <Text className="text-white/60 text-base">← Back</Text>
        </Pressable>
        <Text className="text-white text-lg font-bold ml-4 flex-1">War Chat</Text>
        <Text className="text-text-muted text-xs">{(messages ?? []).length} messages</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages ?? []}
          keyExtractor={(item: any) => item.id}
          contentContainerClassName="px-4 py-2"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.user_id === session?.user?.id;
            const isMyClan = item.clan_id === myClanId;
            const reaction = parseReaction(item.content);

            // Reaction messages render as large centered emoji
            if (reaction) {
              return (
                <View className={`mb-2 ${isMe ? 'items-end' : 'items-start'}`}>
                  <View className="items-center px-2 py-1">
                    <Text style={{ fontSize: 36 }}>{reaction.emoji}</Text>
                    <Text className={isMyClan ? 'text-white text-xs mt-0.5' : 'text-danger text-xs mt-0.5'}>
                      {isMe ? 'You' : item.user_id.slice(0, 8)}
                    </Text>
                  </View>
                  <Text className="text-text-muted text-xs mt-0.5">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }

            return (
              <View className={`mb-2 ${isMe ? 'items-end' : 'items-start'}`}>
                <View
                  className={`rounded-xl px-3 py-2 max-w-[80%] ${
                    isMyClan
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-surface-raised border border-surface-border'
                  }`}
                >
                  <Text className={isMyClan ? 'text-white text-xs font-bold mb-0.5' : 'text-danger text-xs font-bold mb-0.5'}>
                    {isMe ? 'You' : item.user_id.slice(0, 8)}
                  </Text>
                  <Text className="text-white text-sm">{item.content}</Text>
                </View>
                <Text className="text-text-muted text-xs mt-0.5">
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-12">
              <FontAwesome name="comments-o" size={32} color={Colors.text.muted} />
              <Text className="text-text-muted text-lg mt-3">No messages yet</Text>
              <Text className="text-text-muted text-sm mt-1">Start the war talk!</Text>
            </View>
          }
        />

        {/* Quick Reactions */}
        <QuickReactionBar onSelect={handleReaction} />

        {/* Input */}
        <View className="px-4 py-2 border-t border-surface-border flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-surface-raised border border-surface-border rounded-xl px-4 py-2 text-white text-base"
            placeholder="Send a message..."
            placeholderTextColor={Colors.text.muted}
            value={message}
            onChangeText={setMessage}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            className="bg-white rounded-full w-10 h-10 items-center justify-center active:opacity-70"
            onPress={handleSend}
            disabled={sending || !message.trim()}
          >
            <FontAwesome name="send" size={16} color="#000" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
