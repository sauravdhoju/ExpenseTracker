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

const DAILY_EXPENSE_REMINDER_ID_PREFIX = 'daily-expense-reminder-';

const EXPENSE_REMINDER_MESSAGES = [
  "Don't forget to log today's expenses!",
  'Quick reminder: add any spending from today before you forget.',
  'Got a coffee, a snack, a ride? Log it now while it\'s fresh.',
  'A few seconds now saves a headache at month-end. Add your expenses!',
  'Your budget only works if you track it — add today\'s spending.',
  'Did you spend anything today? Pop it into your tracker.',
  'Small expenses add up. Don\'t let today\'s slip through the cracks.',
  'Take a moment to record today\'s transactions.',
  'Future you will thank present you for logging expenses now.',
  'Keep your streak going — add today\'s expenses before bed!',
];

// Morning, afternoon, and evening nudges.
const DAILY_REMINDER_TIMES = [
  { hour: 10, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 20, minute: 0 },
];

function pickRandomReminderMessage(): string {
  return EXPENSE_REMINDER_MESSAGES[Math.floor(Math.random() * EXPENSE_REMINDER_MESSAGES.length)];
}

export async function scheduleDailyExpenseReminders(): Promise<void> {
  if (isExpoGo) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const Notifications = await getNotifications();
  await Promise.all(
    DAILY_REMINDER_TIMES.map(({ hour, minute }, index) => {
      const identifier = `${DAILY_EXPENSE_REMINDER_ID_PREFIX}${index}`;
      return Notifications.cancelScheduledNotificationAsync(identifier)
        .catch(() => {})
        .then(() =>
          Notifications.scheduleNotificationAsync({
            identifier,
            content: {
              title: 'Expense Tracker',
              body: pickRandomReminderMessage(),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            },
          })
        );
    })
  );
}

export async function cancelDailyExpenseReminders(): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Promise.all(
    DAILY_REMINDER_TIMES.map((_, index) =>
      Notifications.cancelScheduledNotificationAsync(`${DAILY_EXPENSE_REMINDER_ID_PREFIX}${index}`).catch(() => {})
    )
  );
}

export async function syncDailyExpenseReminder(enabled: boolean): Promise<void> {
  if (isExpoGo) return;
  if (enabled) {
    await scheduleDailyExpenseReminders();
  } else {
    await cancelDailyExpenseReminders();
  }
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
