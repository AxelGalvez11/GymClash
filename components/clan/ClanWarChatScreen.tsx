import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { WAR_CHAT_REACTIONS } from '@/constants/theme';
import { useActiveWar, useClanRoster, useMyClan } from '@/hooks/use-clan';
import { filterChatMessage } from '@/lib/validation/chat-filter';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { WarChatReaction } from '@/types';

type ChatTab = 'clan' | 'war';

interface ClanWarChatScreenProps {
  readonly clanId?: string;
  readonly warId?: string;
  readonly initialTab?: ChatTab;
  readonly onBack: () => void;
}

interface ClanPreviewMessage {
  readonly id: string;
  readonly user_id: string | null | undefined;
  readonly display_name: string;
  readonly content: string;
  readonly created_at: string;
}

interface WarMessage {
  readonly id: string;
  readonly user_id: string;
  readonly clan_id: string;
  readonly content: string;
  readonly created_at: string;
}

const REACTION_PATTERN = /^\[REACTION:(\w+)\]$/;
const REACTION_KEYS = Object.keys(WAR_CHAT_REACTIONS) as readonly WarChatReaction[];

function parseReaction(content: string): { emoji: string; label: string } | null {
  const match = content.trim().match(REACTION_PATTERN);
  if (!match) return null;
  const key = match[1] as WarChatReaction;
  return WAR_CHAT_REACTIONS[key] ?? null;
}

function QuickReactionBar({
  disabled,
  onSelect,
}: {
  readonly disabled: boolean;
  readonly onSelect: (key: WarChatReaction) => void;
}) {
  return (
    <View
      className="flex-row justify-evenly px-4 py-2"
      style={{ borderTopWidth: 1, borderTopColor: '#23233f', opacity: disabled ? 0.5 : 1 }}
    >
      {REACTION_KEYS.map((key) => {
        const reaction = WAR_CHAT_REACTIONS[key];

        return (
          <Pressable
            key={key}
            className="w-10 h-10 rounded-full bg-[#23233f] items-center justify-center active:scale-[0.98]"
            disabled={disabled}
            onPress={() => onSelect(key)}
          >
            <Text style={{ fontSize: 20 }}>{reaction.emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ClanWarChatScreen({
  clanId,
  warId,
  initialTab = 'clan',
  onBack,
}: ClanWarChatScreenProps) {
  const { session } = useAuthStore();
  const { data: myClan } = useMyClan();
  const { data: activeWar, isLoading: activeWarLoading } = useActiveWar();
  const resolvedClanId = clanId ?? myClan?.id;
  const resolvedWarId = warId ?? activeWar?.id;
  const hasWarTab = Boolean(resolvedWarId);

  const { data: roster } = useClanRoster(resolvedClanId);
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [tab, setTab] = useState<ChatTab>(initialTab);
  const [drafts, setDrafts] = useState<Record<ChatTab, string>>({ clan: '', war: '' });
  const [sendingWarMessage, setSendingWarMessage] = useState(false);
  const [clanMessages, setClanMessages] = useState<ClanPreviewMessage[]>([]);

  const rosterMap = useMemo(() => {
    return new Map<string, string>(
      (roster ?? []).map((member: any) => [
        member.user_id as string,
        (member.display_name as string | null | undefined)?.trim() || 'Clanmate',
      ]),
    );
  }, [roster]);

  const { data: warMessages = [], isLoading: warMessagesLoading } = useQuery<WarMessage[]>({
    queryKey: ['war-chat', resolvedWarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('war_chat_messages')
        .select('id, user_id, clan_id, content, created_at')
        .eq('war_id', resolvedWarId!)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as WarMessage[];
    },
    enabled: !!resolvedWarId,
    refetchInterval: tab === 'war' ? 5000 : false,
  });

  useEffect(() => {
    if (!resolvedWarId) return;

    const channel = supabase
      .channel(`war-chat-${resolvedWarId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'war_chat_messages', filter: `war_id=eq.${resolvedWarId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['war-chat', resolvedWarId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, resolvedWarId]);

  useEffect(() => {
    if (tab !== 'war') return;
    if (warId) return;
    if (activeWarLoading) return;
    if (!resolvedWarId) {
      setTab('clan');
    }
  }, [activeWarLoading, resolvedWarId, tab, warId]);

  const currentDraft = drafts[tab];
  const visibleMessages = tab === 'clan' ? clanMessages : warMessages;
  const isLoading = tab === 'war' ? warMessagesLoading : false;
  const canSendWarMessage = Boolean(resolvedWarId && myClan?.id && session?.user?.id);

  const updateDraft = useCallback((value: string) => {
    setDrafts((current) => ({ ...current, [tab]: value }));
  }, [tab]);

  const getAuthorName = useCallback((userId: string, isOwn: boolean) => {
    if (isOwn) return 'You';
    return rosterMap.get(userId) ?? userId.slice(0, 8);
  }, [rosterMap]);

  const resetActiveDraft = useCallback(() => {
    setDrafts((current) => ({ ...current, [tab]: '' }));
  }, [tab]);

  const handleClanSend = useCallback(() => {
    const filterResult = filterChatMessage(currentDraft);
    if (!filterResult.allowed) {
      const message = filterResult.reason === 'blocked_content'
        ? 'That message is blocked by chat safety filters.'
        : 'Enter a valid message before sending.';
      Alert.alert('Message blocked', message);
      return;
    }

    const newMessage: ClanPreviewMessage = {
      id: `clan-preview-${Date.now()}`,
      user_id: session?.user?.id,
      display_name: 'You',
      content: currentDraft.trim(),
      created_at: new Date().toISOString(),
    };

    setClanMessages((current) => [...current, newMessage]);
    resetActiveDraft();
  }, [currentDraft, resetActiveDraft, session?.user?.id]);

  const sendWarContent = useCallback(async (content: string) => {
    const filterResult = filterChatMessage(content);
    if (!filterResult.allowed) {
      const message = filterResult.reason === 'blocked_content'
        ? 'That message is blocked by chat safety filters.'
        : 'Enter a valid message before sending.';
      Alert.alert('Message blocked', message);
      return;
    }

    if (!resolvedWarId || !myClan?.id || !session?.user?.id) {
      Alert.alert('War chat unavailable', 'Start or join an active clan war to use this channel.');
      return;
    }

    setSendingWarMessage(true);
    try {
      const { error } = await supabase.from('war_chat_messages').insert({
        war_id: resolvedWarId,
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
        return;
      }

      setDrafts((current) => ({ ...current, war: '' }));
      queryClient.invalidateQueries({ queryKey: ['war-chat', resolvedWarId] });
    } finally {
      setSendingWarMessage(false);
    }
  }, [myClan?.id, queryClient, resolvedWarId, session?.user?.id]);

  const handleSend = useCallback(() => {
    if (tab === 'clan') {
      handleClanSend();
      return;
    }

    void sendWarContent(currentDraft);
  }, [currentDraft, handleClanSend, sendWarContent, tab]);

  const handleReaction = useCallback((key: WarChatReaction) => {
    if (!canSendWarMessage) {
      Alert.alert('War chat unavailable', 'Start or join an active clan war to use this channel.');
      return;
    }

    void sendWarContent(`[REACTION:${key}]`);
  }, [canSendWarMessage, sendWarContent]);

  const renderItem = useCallback(({ item }: { readonly item: ClanPreviewMessage | WarMessage }) => {
    const isOwn = item.user_id === session?.user?.id;

    if (tab === 'war') {
      const warMessage = item as WarMessage;
      const reaction = parseReaction(warMessage.content);
      const isMyClanMessage = warMessage.clan_id === myClan?.id;
      const authorName = getAuthorName(warMessage.user_id, isOwn);

      if (reaction) {
        return (
          <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
            <View className="items-center px-2 py-1">
              <Text style={{ fontSize: 36 }}>{reaction.emoji}</Text>
              <Text
                className="text-xs mt-0.5"
                style={{
                  color: isMyClanMessage ? '#ce96ff' : '#ff6e84',
                  fontFamily: 'Lexend-SemiBold',
                }}
              >
                {authorName}
              </Text>
            </View>
            <Text
              className="text-xs mt-0.5"
              style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular' }}
            >
              {new Date(warMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        );
      }

      return (
        <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
          <Text
            style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 2 }}
          >
            {authorName}
          </Text>
          <View
            className="rounded-xl px-3 py-2 max-w-[80%]"
            style={{
              backgroundColor: isMyClanMessage ? '#17172f' : '#1d1d37',
              borderWidth: 1,
              borderColor: isMyClanMessage ? 'rgba(206,150,255,0.16)' : 'rgba(255,110,132,0.18)',
            }}
          >
            <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
              {warMessage.content}
            </Text>
          </View>
          <Text
            style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 9, marginTop: 1 }}
          >
            {new Date(warMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }

    const clanMessage = item as ClanPreviewMessage;

    return (
      <View className={`mb-3 ${isOwn ? 'items-end' : 'items-start'}`}>
        <Text
          style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 10, marginBottom: 2 }}
        >
          {isOwn ? 'You' : clanMessage.display_name}
        </Text>
        <View
          className="rounded-xl px-3 py-2 max-w-[80%]"
          style={{
            backgroundColor: isOwn ? '#a434ff' : '#23233f',
            borderWidth: 1,
            borderColor: isOwn ? 'rgba(206,150,255,0.32)' : 'rgba(206,150,255,0.12)',
          }}
        >
          <Text style={{ color: '#e5e3ff', fontFamily: 'BeVietnamPro-Regular', fontSize: 14 }}>
            {clanMessage.content}
          </Text>
        </View>
        <Text
          style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 9, marginTop: 1 }}
        >
          {new Date(clanMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [getAuthorName, myClan?.id, session?.user?.id, tab]);

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c1f]" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View
          className="px-4 py-3 flex-row items-center"
          style={{ borderBottomWidth: 1, borderBottomColor: '#23233f' }}
        >
          <Pressable onPress={onBack} hitSlop={10}>
            <FontAwesome name="arrow-left" size={16} color="#aaa8c3" />
          </Pressable>
          <View className="ml-4 flex-1">
            <Text style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 18 }}>
              Chat
            </Text>
            <Text style={{ color: '#74738b', fontFamily: 'BeVietnamPro-Regular', fontSize: 11 }}>
              {tab === 'clan'
                ? 'Clan channel'
                : hasWarTab
                  ? 'War channel'
                  : 'No active war'}
            </Text>
          </View>
          <Text style={{ color: '#74738b', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
            {tab === 'clan'
              ? `${clanMessages.length} local`
              : `${warMessages.length} messages`}
          </Text>
        </View>

        <View className="flex-row px-4 pt-3 pb-2 gap-2">
          <Pressable
            className="flex-1 py-2 rounded-full items-center"
            style={{ backgroundColor: tab === 'clan' ? '#81ecff' : '#23233f' }}
            onPress={() => setTab('clan')}
          >
            <Text
              style={{
                color: tab === 'clan' ? '#09111f' : '#74738b',
                fontFamily: 'Lexend-SemiBold',
                fontSize: 13,
              }}
            >
              Clan
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 py-2 rounded-full items-center"
            style={{ backgroundColor: tab === 'war' ? '#a434ff' : '#23233f', opacity: hasWarTab ? 1 : 0.5 }}
            disabled={!hasWarTab}
            onPress={() => {
              if (!hasWarTab) {
                Alert.alert('No Active War', 'War chat unlocks when your clan is in an active war.');
                return;
              }
              setTab('war');
            }}
          >
            <Text
              style={{
                color: tab === 'war' ? '#fff' : '#74738b',
                fontFamily: 'Lexend-SemiBold',
                fontSize: 13,
              }}
            >
              War {!hasWarTab && '🔒'}
            </Text>
          </Pressable>
        </View>

        <View className="px-4 pb-2">
          <View
            className="rounded-2xl px-3 py-2"
            style={{
              backgroundColor: tab === 'clan' ? 'rgba(129,236,255,0.08)' : 'rgba(164,52,255,0.08)',
              borderWidth: 1,
              borderColor: tab === 'clan' ? 'rgba(129,236,255,0.16)' : 'rgba(206,150,255,0.16)',
            }}
          >
            <Text style={{ color: '#e5e3ff', fontFamily: 'Lexend-SemiBold', fontSize: 11 }}>
              {tab === 'clan'
                ? 'Clan channel is currently a local preview until shared clan messaging is wired up.'
                : 'War chat is live and synced for active clan wars.'}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <FontAwesome name="spinner" size={24} color="#ce96ff" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 16, flexGrow: visibleMessages.length === 0 ? 1 : 0 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={renderItem}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <FontAwesome name={tab === 'clan' ? 'comments' : 'shield'} size={32} color="#74738b" />
                <Text
                  style={{ color: '#e5e3ff', fontFamily: 'Epilogue-Bold', fontSize: 16, marginTop: 12 }}
                >
                  {tab === 'clan' ? 'Start the clan banter' : 'No war messages yet'}
                </Text>
                <Text
                  style={{
                    color: '#74738b',
                    fontFamily: 'BeVietnamPro-Regular',
                    fontSize: 12,
                    textAlign: 'center',
                    marginTop: 4,
                  }}
                >
                  {tab === 'clan'
                    ? 'Drop a message here to preview the combined clan chat flow.'
                    : 'Coordinate lifts, cardio pressure, and strategy once war begins.'}
                </Text>
              </View>
            }
          />
        )}

        {tab === 'war' ? (
          <QuickReactionBar disabled={!canSendWarMessage || sendingWarMessage} onSelect={handleReaction} />
        ) : null}

        <View
          className="px-4 py-3 flex-row items-center gap-2"
          style={{ borderTopWidth: 1, borderTopColor: '#23233f', backgroundColor: '#0c0c1f' }}
        >
          <TextInput
            className="flex-1 rounded-xl px-4 py-3"
            style={{
              backgroundColor: '#23233f',
              color: '#e5e3ff',
              fontFamily: 'BeVietnamPro-Regular',
              borderWidth: 1,
              borderColor: currentDraft.length > 0 ? 'rgba(164,52,255,0.35)' : 'rgba(206,150,255,0.1)',
            }}
            placeholder={tab === 'clan' ? 'Message your clan...' : 'Message the war room...'}
            placeholderTextColor="#74738b"
            value={currentDraft}
            onChangeText={updateDraft}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={500}
          />
          <Pressable
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: tab === 'clan' ? '#81ecff' : '#a434ff',
              opacity: currentDraft.trim().length === 0 || (tab === 'war' && sendingWarMessage) ? 0.5 : 1,
            }}
            onPress={handleSend}
            disabled={currentDraft.trim().length === 0 || (tab === 'war' && sendingWarMessage)}
          >
            <FontAwesome name="send" size={14} color={tab === 'clan' ? '#09111f' : '#fff'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
