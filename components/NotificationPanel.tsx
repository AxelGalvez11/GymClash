import { useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  Dimensions,
  type ListRenderItemInfo,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNotificationStore, type InAppNotification } from '@/stores/notification-store';
import type { NotificationType } from '@/services/notifications';

import { Colors } from '@/constants/theme';

// ─── Victory Peak palette — pulls from theme ───────────
const VP = {
  surface:    Colors.surface.DEFAULT,
  raised:     Colors.surface.container,
  active:     Colors.surface.containerHigh,
  highest:    Colors.surface.containerHighest,
  textPri:    Colors.text.primary,
  textSec:    Colors.text.secondary,
  textMuted:  Colors.text.muted,
  primary:    Colors.primary.DEFAULT,
  primaryDim: Colors.primary.dim,
  gold:       Colors.secondary.DEFAULT,
  cyan:       Colors.tertiary.DEFAULT,
  danger:     Colors.error.DEFAULT,
  success:    Colors.success,
} as const;

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ─── Icon config per notification type ──────────────────
const NOTIFICATION_ICONS: Record<NotificationType, { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }> = {
  daily_reminder:        { name: 'bell',         color: VP.gold },
  clan_war_started:      { name: 'shield',       color: VP.danger },
  clan_war_ending:       { name: 'shield',       color: VP.danger },
  clan_war_ended:        { name: 'shield',       color: VP.danger },
  shop_new_items:        { name: 'shopping-bag',  color: VP.primary },
  level_up:              { name: 'arrow-up',     color: VP.success },
  clan_invitation:       { name: 'users',        color: VP.cyan },
  cheat_report_resolved: { name: 'flag',         color: VP.textSec },
};

// ─── Relative time helper ───────────────────────────────
function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = Math.max(0, now - then);
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

// ─── Notification Row ───────────────────────────────────
function NotificationRow({
  item,
  onPress,
}: {
  readonly item: InAppNotification;
  readonly onPress: (id: string) => void;
}) {
  const iconCfg = NOTIFICATION_ICONS[item.type] ?? { name: 'bell' as const, color: VP.textMuted };

  return (
    <Pressable
      className="flex-row items-center px-5 py-3 gap-3 active:opacity-80"
      style={{ backgroundColor: item.read ? 'transparent' : VP.active }}
      onPress={() => onPress(item.id)}
    >
      {/* Icon */}
      <View
        className="w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: iconCfg.color + '15' }}
      >
        <FontAwesome name={iconCfg.name} size={14} color={iconCfg.color} />
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text
          style={{ fontFamily: 'BeVietnamPro-Regular', fontWeight: 'bold', fontSize: 13, color: VP.textPri }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 12, color: VP.textMuted, marginTop: 1 }}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 10, color: VP.textMuted, marginTop: 2 }}>
          {relativeTime(item.timestamp)}
        </Text>
      </View>

      {/* Unread dot */}
      {!item.read && (
        <View className="w-2 h-2 rounded-full bg-[#3b82f6]" />
      )}
    </Pressable>
  );
}

// ─── Empty state ────────────────────────────────────────
function EmptyState() {
  return (
    <View className="items-center justify-center py-16 px-6">
      <FontAwesome name="bell-o" size={40} color={VP.textMuted} />
      <Text
        style={{ fontFamily: 'Epilogue-Bold', fontSize: 16, color: VP.textPri, marginTop: 16, fontWeight: 'bold' }}
      >
        No notifications yet
      </Text>
      <Text
        style={{ fontFamily: 'BeVietnamPro-Regular', fontSize: 13, color: VP.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 18 }}
      >
        You'll see workout reminders, war updates, and more here.
      </Text>
    </View>
  );
}

// ─── Main Panel ─────────────────────────────────────────
interface NotificationPanelProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  const handlePress = useCallback(
    (id: string) => {
      markAsRead(id);
      onClose();
    },
    [markAsRead, onClose],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<InAppNotification>) => (
      <NotificationRow item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback((item: InAppNotification) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        {/* Panel (stop propagation so tapping inside doesn't close) */}
        <Pressable
          className="rounded-b-2xl overflow-hidden"
          style={{
            backgroundColor: VP.surface,
            maxHeight: SCREEN_HEIGHT * 0.7,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            shadowOpacity: 0.5,
            elevation: 16,
          }}
          onPress={() => {}} // swallow inner taps
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text style={{ fontFamily: 'Epilogue-Bold', fontSize: 18, color: VP.textPri, fontWeight: 'bold' }}>
              Notifications
            </Text>

            <View className="flex-row items-center gap-4">
              {notifications.length > 0 && (
                <Pressable onPress={markAllAsRead} className="active:opacity-70">
                  <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: VP.primary }}>
                    Mark all read
                  </Text>
                </Pressable>
              )}

              <Pressable
                className="w-8 h-8 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: VP.active }}
                onPress={onClose}
              >
                <FontAwesome name="close" size={14} color={VP.textSec} />
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: VP.active }} />

          {/* List */}
          <FlatList
            data={notifications as InAppNotification[]}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
          />

          {/* Clear all button */}
          {notifications.length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: VP.active }} />
              <Pressable
                className="py-3 items-center active:opacity-70"
                onPress={() => {
                  clearAll();
                  onClose();
                }}
              >
                <Text style={{ fontFamily: 'Lexend-SemiBold', fontSize: 12, color: VP.danger }}>
                  Clear All
                </Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
