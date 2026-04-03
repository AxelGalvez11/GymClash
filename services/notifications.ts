/**
 * Notification service for GymClash.
 *
 * Handles push notification registration, permission requests,
 * and local notification scheduling.
 *
 * NOTE: expo-notifications must be installed before this service works.
 * Run: npx expo install expo-notifications
 *
 * Until then, all functions are safe no-ops that log warnings.
 */

// Type-safe notification categories matching PRD requirements
export type NotificationType =
  | 'daily_reminder'        // Daily workout reminder
  | 'clan_war_started'      // Clan war began
  | 'clan_war_ending'       // 12 hours remaining
  | 'clan_war_ended'        // War finished with result
  | 'shop_new_items'        // New items in shop
  | 'level_up'              // Level-up milestone
  | 'clan_invitation'       // Clan invite received
  | 'cheat_report_resolved' // Report outcome notification

export interface NotificationPayload {
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, string>;
}

// Predefined notification templates for each type
export const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; body: string }> = {
  daily_reminder: { title: 'Time to Train!', body: 'Your clan needs you in the arena. Start a workout now.' },
  clan_war_started: { title: 'War Has Begun!', body: 'Your clan is now at war. Every workout counts!' },
  clan_war_ending: { title: 'War Ending Soon', body: 'Less than 12 hours remain. Push for the win!' },
  clan_war_ended: { title: 'War Results', body: 'The war has ended. Check your clan page for results.' },
  shop_new_items: { title: 'New in Shop', body: 'Fresh cosmetics just dropped. Check the shop!' },
  level_up: { title: 'Level Up!', body: 'You reached a new level. Keep climbing!' },
  clan_invitation: { title: 'Clan Invite', body: 'You have been invited to join a clan.' },
  cheat_report_resolved: { title: 'Report Update', body: 'A report you submitted has been reviewed.' },
};

/**
 * Request notification permissions.
 * Returns true if granted, false otherwise.
 * Safe to call even if expo-notifications is not installed.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    // @ts-ignore — expo-notifications is an optional dependency, installed later
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) {
      console.warn('[Notifications] expo-notifications not installed. Run: npx expo install expo-notifications');
      return false;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[Notifications] Permission request failed:', err);
    return false;
  }
}

/**
 * Get the Expo push token for this device.
 * Returns null if unavailable.
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    // @ts-ignore — expo-notifications is an optional dependency, installed later
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return null;
    const Constants = await import('expo-constants').catch(() => null);
    const projectId = Constants?.default?.expoConfig?.extra?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn('[Notifications] Failed to get push token:', err);
    return null;
  }
}

/**
 * Schedule a local notification (e.g., daily reminder).
 */
export async function scheduleLocalNotification(
  payload: NotificationPayload,
  triggerSeconds: number
): Promise<string | null> {
  try {
    // @ts-ignore — expo-notifications is an optional dependency, installed later
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: { type: payload.type, ...payload.data },
      },
      trigger: { type: 'timeInterval' as any, seconds: triggerSeconds, repeats: false },
    });
    return id;
  } catch (err) {
    console.warn('[Notifications] Schedule failed:', err);
    return null;
  }
}

/**
 * Schedule the daily workout reminder.
 * Schedules for the next occurrence of the given hour (24h format).
 */
export async function scheduleDailyReminder(hour: number): Promise<string | null> {
  try {
    // @ts-ignore — expo-notifications is an optional dependency, installed later
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return null;

    // Cancel existing daily reminders first
    await cancelDailyReminder();

    const template = NOTIFICATION_TEMPLATES.daily_reminder;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: template.title,
        body: template.body,
        data: { type: 'daily_reminder' },
      },
      trigger: { type: 'daily' as any, hour, minute: 0, repeats: true },
    });
    return id;
  } catch (err) {
    console.warn('[Notifications] Daily reminder schedule failed:', err);
    return null;
  }
}

/**
 * Cancel the daily workout reminder.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    // @ts-ignore — expo-notifications is an optional dependency, installed later
    const Notifications = await import('expo-notifications').catch(() => null);
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('[Notifications] Cancel failed:', err);
  }
}
