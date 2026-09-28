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

const EXPENSE_REMINDER_ID = 'expense-reminder';

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

function pickRandomReminderMessage(currentStreak: number): string {
  if (currentStreak > 0) {
    return `🔥 Don't forget your money check. Keep your ${currentStreak}-day streak going.`;
  }
  return EXPENSE_REMINDER_MESSAGES[Math.floor(Math.random() * EXPENSE_REMINDER_MESSAGES.length)];
}

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly';

function nextMonthlyDate(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function scheduleExpenseReminder(
  time: { hour: number; minute: number },
  frequency: ReminderFrequency,
  currentStreak = 0
): Promise<void> {
  if (isExpoGo) return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(EXPENSE_REMINDER_ID).catch(() => {});

  const content = {
    title: 'Expense Tracker',
    body: pickRandomReminderMessage(currentStreak),
  };

  if (frequency === 'daily') {
    await Notifications.scheduleNotificationAsync({
      identifier: EXPENSE_REMINDER_ID,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: time.hour,
        minute: time.minute,
      },
    });
  } else if (frequency === 'weekly') {
    const weekday = new Date().getDay() + 1; // expo-notifications uses 1 (Sunday) - 7 (Saturday)
    await Notifications.scheduleNotificationAsync({
      identifier: EXPENSE_REMINDER_ID,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: time.hour,
        minute: time.minute,
      },
    });
  } else {
    // No native monthly trigger; schedule the next one-shot date and let
    // syncExpenseReminder() re-derive/reschedule it on every app bootstrap.
    await Notifications.scheduleNotificationAsync({
      identifier: EXPENSE_REMINDER_ID,
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextMonthlyDate(time.hour, time.minute),
      },
    });
  }
}

export async function cancelExpenseReminder(): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(EXPENSE_REMINDER_ID).catch(() => {});
}

export async function syncExpenseReminder(
  settings: {
    notificationsEnabled: boolean;
    expenseReminderEnabled: boolean;
    expenseReminderTime: string;
    expenseReminderFrequency: ReminderFrequency;
  },
  currentStreak = 0
): Promise<void> {
  if (isExpoGo) return;
  if (settings.notificationsEnabled && settings.expenseReminderEnabled) {
    const [hour, minute] = settings.expenseReminderTime.split(':').map(Number);
    await scheduleExpenseReminder({ hour, minute }, settings.expenseReminderFrequency, currentStreak);
  } else {
    await cancelExpenseReminder();
  }
}

export async function scheduleLoanReminder(
  loanId: string,
  personName: string,
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
  const identifier = `loan-${loanId}`;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  return Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Repayment due',
      body: `${personName}'s ${amount} repayment is due ${dueDate.toDateString()}.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelLoanReminder(loanId: string): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(`loan-${loanId}`).catch(() => {});
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

// ---- Transaction automation -------------------------------------------------------------------

const DETECTED_CATEGORY_ID = 'etracko-detected';
const AUTOMATION_CHANNEL_ID = 'detected-transactions';

export const AUTOMATION_ACTIONS = {
  view: 'view',
  changeCategory: 'change-category',
  undo: 'undo',
} as const;

export interface AutomationNotificationData {
  kind: 'detected' | 'review';
  detectionId: string;
  transactionId?: string | null;
}

let automationSetupDone = false;

async function ensureAutomationNotificationSetup() {
  const Notifications = await getNotifications();
  if (!automationSetupDone) {
    await Notifications.setNotificationChannelAsync(AUTOMATION_CHANNEL_ID, {
      name: 'Detected transactions',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationCategoryAsync(DETECTED_CATEGORY_ID, [
      { identifier: AUTOMATION_ACTIONS.view, buttonTitle: 'View' },
      { identifier: AUTOMATION_ACTIONS.changeCategory, buttonTitle: 'Change Category' },
      { identifier: AUTOMATION_ACTIONS.undo, buttonTitle: 'Undo', options: { isDestructive: true } },
    ]);
    automationSetupDone = true;
  }
  return Notifications;
}

/**
 * Posts the "Expense detected" / "Needs review" notification. Runs from the headless background task,
 * so it never prompts for permission — it only posts if permission was granted earlier in the UI.
 */
export async function notifyDetectedTransaction(
  title: string,
  body: string,
  data: AutomationNotificationData
): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await ensureAutomationNotificationSetup();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    identifier: `detected-${data.detectionId}`,
    content: {
      title,
      body,
      data: data as unknown as Record<string, unknown>,
      categoryIdentifier: data.kind === 'detected' ? DETECTED_CATEGORY_ID : undefined,
    },
    trigger: { channelId: AUTOMATION_CHANNEL_ID },
  });
}

export async function dismissDetectedNotification(detectionId: string): Promise<void> {
  if (isExpoGo) return;
  const Notifications = await getNotifications();
  await Notifications.dismissNotificationAsync(`detected-${detectionId}`).catch(() => {});
}

/**
 * Subscribes to taps/actions on automation notifications, including the one that cold-started the app.
 * Returns an unsubscribe function.
 */
export function addAutomationResponseListener(
  handler: (actionId: string, data: AutomationNotificationData) => void
): () => void {
  if (isExpoGo) return () => {};
  let subscription: { remove: () => void } | null = null;
  let cancelled = false;

  getNotifications().then((Notifications) => {
    if (cancelled) return;
    const handle = (response: import('expo-notifications').NotificationResponse | null) => {
      const data = response?.notification.request.content.data as Partial<AutomationNotificationData> | undefined;
      if (!response || !data?.detectionId || (data.kind !== 'detected' && data.kind !== 'review')) return;
      Notifications.clearLastNotificationResponse();
      const actionId =
        response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
          ? AUTOMATION_ACTIONS.view
          : response.actionIdentifier;
      Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
      handler(actionId, data as AutomationNotificationData);
    };
    handle(Notifications.getLastNotificationResponse());
    subscription = Notifications.addNotificationResponseReceivedListener(handle);
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
