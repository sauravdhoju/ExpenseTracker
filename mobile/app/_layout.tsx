import { useEffect } from 'react';
import { Redirect, Slot, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SafeScreen from '../src/components/ui/SafeScreen';
import PageLoader from '../src/components/ui/PageLoader';
import { useAppStore } from '../src/store/useAppStore';
import { syncExpenseReminder } from '../src/services/notificationService';

function RootLayoutContent() {
  const isReady = useAppStore((s) => s.isReady);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled);
  const expenseReminderEnabled = useAppStore((s) => s.settings.expenseReminderEnabled);
  const expenseReminderTime = useAppStore((s) => s.settings.expenseReminderTime);
  const expenseReminderFrequency = useAppStore((s) => s.settings.expenseReminderFrequency);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const pathname = usePathname();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isReady) return;
    syncExpenseReminder({
      notificationsEnabled,
      expenseReminderEnabled,
      expenseReminderTime,
      expenseReminderFrequency,
    });
  }, [isReady, notificationsEnabled, expenseReminderEnabled, expenseReminderTime, expenseReminderFrequency]);

  if (!isReady) {
    return (
      <SafeScreen>
        <PageLoader />
      </SafeScreen>
    );
  }

  if (!onboardingComplete && pathname !== '/onboarding') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <SafeScreen>
      <Slot />
    </SafeScreen>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}
