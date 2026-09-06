import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleBillReminder(
  billId: string,
  title: string,
  amount: string,
  dueDate: Date
): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const trigger = new Date(dueDate);
  trigger.setHours(9, 0, 0, 0);
  if (trigger.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    identifier: `bill-${billId}`,
    content: {
      title: `Upcoming bill: ${title}`,
      body: `${amount} is due ${dueDate.toDateString()}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function sendBudgetWarning(categoryName: string, percentUsed: number): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget warning',
      body: `You've used ${Math.round(percentUsed)}% of your ${categoryName} budget.`,
    },
    trigger: null,
  });
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function isNotificationsSupported(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}
