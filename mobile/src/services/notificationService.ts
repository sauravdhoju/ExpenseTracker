import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * expo-notifications runs push-token auto-registration as a side effect
 * the instant it's imported, which throws in Expo Go on SDK 53+ (remote
 * push was removed there). We only need local notifications, so the
 * module is imported lazily and skipped entirely inside Expo Go.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let handlerConfigured = false;

async function getNotifications() {
  const Notifications = await import('expo-notifications');
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  return Notifications;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  const Notifications = await getNotifications();
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
  if (isExpoGo) return null;
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const trigger = new Date(dueDate);
  trigger.setHours(9, 0, 0, 0);
  if (trigger.getTime() <= Date.now()) return null;

  const Notifications = await getNotifications();
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
  if (isExpoGo) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;
  const Notifications = await getNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget warning',
      body: `You've used ${Math.round(percentUsed)}% of your ${categoryName} budget.`,
    },
    trigger: null,
  });
}

export async function cancelNotification(identifier: string): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function isNotificationsSupported(): boolean {
  return !isExpoGo;
}
