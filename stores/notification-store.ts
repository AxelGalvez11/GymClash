import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationType } from '@/services/notifications';

export interface InAppNotification {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly timestamp: string;
  readonly read: boolean;
}

interface NotificationState {
  readonly notifications: readonly InAppNotification[];
  readonly unreadCount: number;
  readonly dailyReminderHour: number | null; // null = disabled
  readonly pushEnabled: boolean;
}

interface NotificationActions {
  readonly addNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => void;
  readonly markAsRead: (id: string) => void;
  readonly markAllAsRead: () => void;
  readonly clearAll: () => void;
  readonly setDailyReminderHour: (hour: number | null) => void;
  readonly setPushEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      dailyReminderHour: null,
      pushEnabled: false,

      addNotification: (notification) =>
        set((state) => {
          const newNotification: InAppNotification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          const updated = [newNotification, ...state.notifications].slice(0, 50); // Keep max 50
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),

      markAsRead: (id) =>
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      setDailyReminderHour: (hour) => set({ dailyReminderHour: hour }),

      setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
    }),
    {
      name: 'gymclash-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
